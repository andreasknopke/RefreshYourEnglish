/**
 * Grammar Service
 *
 * Stellt Grammatikpunkte bereit und wertet Übungsantworten deterministisch aus
 * (kein LLM nötig). Falsche Antworten werden mit ihrem Fehler-Tag im
 * Fehlerprofil des Nutzers gesammelt und der Grammar-Skill aktualisiert.
 */

import { getUserLanguage } from './userLanguageService.js';
import {
  listPoints,
  getPoint,
  getPointWithAnswers,
  recordAttempt,
  bumpErrorProfile,
  getErrorProfile,
  upsertSkill,
  getGrammarAccuracy
} from './grammarRepository.js';

/**
 * Normalisiert eine Lückentext-Antwort: lowercase, Artikel/Leerzeichen/
 * Akzente-tolerante Vergleichsbasis.
 */
function normalizeAnswer(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'’()…«»]/g, '')
    .replace(/^\s*(il|lo|la|l'|i|gli|le|un|uno|una|un')\s+/i, '')
    .trim();
}

/**
 * Prüft eine Antwort gegen eine Lückentext-Übung. Akzeptiert jede der
 * hinterlegten Lösungen (nach Normalisierung).
 */
function checkFill(exercise, answer) {
  const given = normalizeAnswer(answer);
  if (!given) return false;
  return (exercise.ans || []).some((acc) => normalizeAnswer(acc) === given);
}

/**
 * Prüft eine Antwort gegen eine Multiple-Choice-Übung.
 */
function checkMc(exercise, answer) {
  const idx = Number(answer);
  return Number.isInteger(idx) && idx === exercise.a;
}

/**
 * Listet alle Grammatikpunkte einer Sprache (ohne Lösungen).
 */
export function listGrammarPoints(userLanguageId, userId, level = null) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden', points: [] };
  return {
    targetLang: ul.targetLang,
    nativeLang: ul.nativeLang,
    points: listPoints(ul.targetLang, level)
  };
}

/**
 * Liefert einen Punkt inkl. Erklärung, Beispielen und Übungen (ohne Lösungen).
 */
export function getGrammarPoint(userLanguageId, userId, pointId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const point = getPoint(ul.targetLang, pointId);
  if (!point) return { error: 'Grammatikpunkt nicht gefunden' };
  return { targetLang: ul.targetLang, nativeLang: ul.nativeLang, point };
}

/**
 * Wertet eine einzelne Übungsantwort deterministisch aus, protokolliert den
 * Versuch und aktualisiert Fehlerprofil + Grammar-Skill.
 *
 * @returns {{ ok, correct, expected, explanation, errorTag, skill }}
 */
export function answerExercise(userLanguageId, userId, { pointId, exerciseIndex, answer, durationMs }) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };

  const point = getPointWithAnswers(ul.targetLang, pointId);
  if (!point) return { error: 'Grammatikpunkt nicht gefunden' };

  const exercise = (point.exercises || [])[Number(exerciseIndex)];
  if (!exercise) return { error: 'Übung nicht gefunden' };

  const correct = exercise.type === 'mc' ? checkMc(exercise, answer) : checkFill(exercise, answer);

  // Erwartete Lösung für das Feedback
  const expected =
    exercise.type === 'mc' ? (exercise.o || [])[exercise.a] : (exercise.ans || [])[0];

  const errorTags = correct ? [] : [exercise.tag || point.errorTag || 'lexis'];

  recordAttempt({
    userLanguageId,
    exerciseId: `${pointId}#${exerciseIndex}`,
    response: { kind: 'grammar', pointId, exerciseIndex, answer, correct },
    score: correct ? 1 : 0,
    errorTags,
    durationMs: durationMs ?? null
  });

  if (!correct && errorTags[0]) {
    bumpErrorProfile(userLanguageId, errorTags[0], exercise.s);
  }

  // Skill aus rollierender Genauigkeit ableiten
  const { accuracy, total } = getGrammarAccuracy(userLanguageId);
  if (accuracy !== null) {
    upsertSkill(userLanguageId, 'grammar', accuracy * 100);
  }

  return {
    ok: true,
    correct,
    expected,
    explanation: exercise.why || point.explanation,
    errorTag: correct ? null : errorTags[0],
    skill: { accuracy, total }
  };
}

/**
 * Aggregiertes Fehlerprofil + Grammar-Skill für die Profil-Ansicht.
 */
export function getGrammarStats(userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const { accuracy, total } = getGrammarAccuracy(userLanguageId);
  return {
    targetLang: ul.targetLang,
    accuracy,
    total,
    errorProfile: getErrorProfile(userLanguageId)
  };
}
