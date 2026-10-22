/**
 * Writing Service
 *
 * Sprachneutrales Schreib-/Übersetzungsmodul. Erzeugt Übersetzungsaufgaben
 * (generate_sentence) und bewertet Produktionen (evaluate_writing) über die
 * LLM-Task-Registry. Fehler landen im Fehlerprofil, der Writing-Skill wird
 * aktualisiert. Ohne LLM-API-Key greifen Fallbacks, damit das Modul offline
 * testbar bleibt.
 */

import { getUserLanguage } from './userLanguageService.js';
import { runLLMTask } from '../llm/taskRunner.js';
import { getDueCards, getSenses } from './vocabRepository.js';
import {
  recordAttempt,
  bumpErrorProfile,
  getErrorProfile,
  upsertSkill,
  getWritingAverage
} from './grammarRepository.js';

const TOPICS = ['alltag', 'reisen', 'essen', 'familie', 'arbeit', 'hobby', 'wetter', 'stadt'];

/**
 * Wählt ein Zielwort aus den Karten des Nutzers (für personalisierte Aufgaben).
 * Liefert { native, target } – Muttersprache-Wort + Zielsprache-Lemma.
 */
function pickTargetVocab(userLanguageId, nativeLang) {
  const due = getDueCards(userLanguageId, 20);
  if (due.length === 0) return null;
  const card = due[Math.floor(Math.random() * due.length)];
  const senses = getSenses(card.vocab_id, nativeLang);
  const native = senses[0]?.translation || card.lemma;
  return { native, target: card.lemma };
}

/**
 * Erzeugt eine Übersetzungsaufgabe (Muttersprache → Zielsprache).
 *
 * @returns {{ ok, prompt, reference, topic, source }}
 */
export async function getWritingTask(userLanguageId, userId, { topic } = {}) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };

  const chosenTopic = topic || TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const level = ul.startCefr || ul.targetCefr || 'A2';
  const targetVocab = pickTargetVocab(userLanguageId, ul.nativeLang);

  const result = await runLLMTask(
    'generate_sentence',
    'v1',
    {
      targetLang: ul.targetLang,
      nativeLang: ul.nativeLang,
      level,
      topic: chosenTopic,
      targetVocab
    },
    {
      // Offline-Fallback: generische Aufgabe ohne Referenz
      fallback: { native: `Descrivi la tua giornata (${chosenTopic}).`, target: null }
    }
  );

  if (!result.ok) {
    return { error: result.error || 'Aufgabe konnte nicht erstellt werden' };
  }

  return {
    ok: true,
    prompt: result.data.native,
    reference: result.data.target || null,
    topic: chosenTopic,
    level,
    source: result.source
  };
}

/**
 * Bewertet eine Schreib-/Übersetzungsproduktion.
 *
 * @returns {{ ok, score, cefrEstimate, corrected, errors, strengths, nextFocus, source }}
 */
export async function evaluateWriting(userLanguageId, userId, { prompt, answer, topic }) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  if (!answer || !String(answer).trim()) {
    return { error: 'Antwort fehlt' };
  }

  const level = ul.startCefr || ul.targetCefr || 'A2';

  const result = await runLLMTask(
    'evaluate_writing',
    'v1',
    {
      targetLang: ul.targetLang,
      nativeLang: ul.nativeLang,
      level,
      prompt: prompt || `Schreibe über: ${topic || 'Alltag'}`,
      answer
    },
    {
      // Offline-Fallback: neutrales Feedback ohne Fehler
      fallback: {
        score: 7,
        cefr_estimate: null,
        corrected: null,
        errors: [],
        strengths: [],
        next_focus: null
      }
    }
  );

  if (!result.ok) {
    return { error: result.error || 'Bewertung fehlgeschlagen' };
  }

  const data = result.data;

  // Versuch protokollieren (Score normalisiert auf 0–1)
  recordAttempt({
    userLanguageId,
    exerciseId: null,
    response: { kind: 'writing', prompt, answer, cefr: data.cefr_estimate, source: result.source },
    score: (data.score || 7) / 10,
    errorTags: data.errors.map((e) => e.type),
    durationMs: null
  });

  // Fehlerprofil pro Fehlertyp hochzählen
  for (const e of data.errors) {
    bumpErrorProfile(userLanguageId, e.type, e.span || null);
  }

  // Writing-Skill aus rollierendem Durchschnitt ableiten
  const { average, total } = getWritingAverage(userLanguageId);
  if (average !== null) {
    upsertSkill(userLanguageId, 'writing', average * 100, data.cefr_estimate || null);
  }

  return {
    ok: true,
    score: data.score,
    cefrEstimate: data.cefr_estimate,
    corrected: data.corrected,
    errors: data.errors,
    strengths: data.strengths,
    nextFocus: data.next_focus,
    skill: { average, total },
    source: result.source
  };
}

/**
 * Fehlerprofil + Writing-Skill für die Profil-Ansicht.
 */
export function getWritingStats(userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const { average, total } = getWritingAverage(userLanguageId);
  return {
    targetLang: ul.targetLang,
    average,
    total,
    errorProfile: getErrorProfile(userLanguageId)
  };
}
