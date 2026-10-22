/**
 * Dialog Service
 *
 * Sprachneutrales Dialogmodul: lädt Szenarien aus dem Pack, lässt den
 * LLM-Partner in der Zielsprache antworten und gibt Feedback zum Beitrag des
 * Lernenden (in der Muttersprache). Fehler landen im Fehlerprofil, der
 * Speaking-Skill wird aktualisiert. Ohne LLM-Key greift ein Fallback, damit
 * das Modul offline testbar bleibt.
 */

import { getUserLanguage } from './userLanguageService.js';
import { runLLMTask } from '../llm/taskRunner.js';
import {
  listScenarios,
  getScenario,
  listShadowing,
  getDialogHistory,
  recordDialogTurn,
  getDialogAverage
} from './dialogRepository.js';
import { bumpErrorProfile, getErrorProfile, upsertSkill } from './grammarRepository.js';
import { scorePronunciation } from './pronunciationService.js';

/**
 * Szenario-Liste für die Auswahl.
 */
export function listDialogScenarios(userLanguageId, userId, { level } = {}) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  return {
    ok: true,
    targetLang: ul.targetLang,
    scenarios: listScenarios(ul.targetLang, level || null)
  };
}

/**
 * Ein Szenario inkl. Eröffnungszeile des Partners und bisherigem Verlauf.
 */
export function getDialogScenario(userLanguageId, userId, scenarioId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };

  const scenario = getScenario(ul.targetLang, scenarioId);
  if (!scenario) return { error: 'Szenario nicht gefunden' };

  const history = getDialogHistory(userLanguageId, scenarioId);
  return { ok: true, targetLang: ul.targetLang, nativeLang: ul.nativeLang, scenario, history };
}

/**
 * Verarbeitet einen Lernenden-Beitrag: Partnerantwort + Feedback.
 *
 * @returns {{ ok, reply, replyDone, feedback, history, skill, source }}
 */
export async function submitDialogTurn(userLanguageId, userId, { scenarioId, text }) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  if (!scenarioId) return { error: 'Szenario fehlt' };
  if (!text || !String(text).trim()) return { error: 'Beitrag fehlt' };

  const scenario = getScenario(ul.targetLang, scenarioId);
  if (!scenario) return { error: 'Szenario nicht gefunden' };

  const level = ul.startCefr || ul.targetCefr || 'A2';
  const history = getDialogHistory(userLanguageId, scenarioId);
  const learnerRole = scenario.roles?.learner || 'Studente';
  const partnerRole = scenario.roles?.partner || 'Partner';

  const result = await runLLMTask(
    'dialog_reply',
    'v1',
    {
      targetLang: ul.targetLang,
      nativeLang: ul.nativeLang,
      level,
      scenario: `${scenario.title}. ${scenario.situation}`,
      learnerRole,
      partnerRole,
      history,
      lastLearnerTurn: text
    },
    {
      // Offline-Fallback: generische Rückfrage + neutrales Feedback
      fallback: {
        reply: 'Interessante! Può ripetere, per favore?',
        reply_done: false,
        feedback: { score: 7, errors: [], hint: 'Continua a parlare con frasi complete.' }
      }
    }
  );

  if (!result.ok) {
    return { error: result.error || 'Dialog konnte nicht fortgesetzt werden' };
  }

  const data = result.data;
  const errorTags = data.feedback.errors.map((e) => e.type);

  recordDialogTurn({
    userLanguageId,
    scenarioId,
    learner: text,
    partner: data.reply,
    score: data.feedback.score / 10,
    errorTags
  });

  for (const e of data.feedback.errors) {
    bumpErrorProfile(userLanguageId, e.type, e.span || null);
  }

  const { average, total } = getDialogAverage(userLanguageId);
  if (average !== null) {
    upsertSkill(userLanguageId, 'speaking', average * 100, null);
  }

  return {
    ok: true,
    reply: data.reply,
    replyDone: data.reply_done === true,
    feedback: {
      score: data.feedback.score,
      errors: data.feedback.errors,
      hint: data.feedback.hint
    },
    skill: { average, total },
    source: result.source
  };
}

/**
 * Shadowing-Sätze für die Sprache (optional nach Level).
 */
export function listShadowingPhrases(userLanguageId, userId, { level } = {}) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  return {
    ok: true,
    targetLang: ul.targetLang,
    phrases: listShadowing(ul.targetLang, level || null)
  };
}

/**
 * Bewertet einen Shadowing-/Sprechversuch (Stufe 1, deterministisch).
 * Speichert den Versuch und aktualisiert den Speaking-Skill.
 */
export function scoreShadowing(userLanguageId, userId, { reference, transcript, durationMs, scenarioId }) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  if (!reference) return { error: 'Referenzsatz fehlt' };

  const result = scorePronunciation({ reference, transcript, durationMs });

  recordDialogTurn({
    userLanguageId,
    scenarioId: scenarioId || 'shadowing',
    learner: transcript || '',
    partner: null,
    score: result.ok ? result.score / 100 : 0,
    errorTags: []
  });

  // Speaking-Skill aus rollierendem Ø aller Sprechversuche ableiten
  const { average, total } = getDialogAverage(userLanguageId);
  if (average !== null) {
    upsertSkill(userLanguageId, 'speaking', average * 100, null);
  }

  return { ok: true, ...result, skill: { average, total } };
}

/**
 * Speaking-Statistiken: Fehlerprofil + Skill.
 */
export function getSpeakingStats(userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const { average, total } = getDialogAverage(userLanguageId);
  return {
    targetLang: ul.targetLang,
    average,
    total,
    errorProfile: getErrorProfile(userLanguageId)
  };
}
