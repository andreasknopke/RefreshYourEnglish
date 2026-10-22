/**
 * Review Service
 *
 * Orchestriert die SRS-Review-Queue: holt fällige Karten, reicht die Antwort
 * durch den FSRS-Scheduler und persistiert Ergebnis + Review-Log. Sprachneutral.
 */

import { review, RATING, createCard } from './fsrs.js';
import {
  getDueCards,
  countDue,
  getUserVocab,
  applyReview,
  addCard,
  getVocabWithSenses,
  getVocabStats,
  upsertVocabItem,
  addSense
} from './vocabRepository.js';
import { getUserLanguage } from './userLanguageService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Liefert die nächste zu lernende Queue für eine Sprache.
 * Karten werden mit ihren Bedeutungen (in der Muttersprache) angereichert.
 */
export function getReviewQueue(userLanguageId, userId, limit = 20) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) {
    return { error: 'Sprache nicht gefunden', cards: [], due: 0 };
  }
  const cards = getDueCards(userLanguageId, limit).map((c) => hydrateCard(c, ul.nativeLang));
  return {
    cards,
    due: countDue(userLanguageId),
    nativeLang: ul.nativeLang,
    targetLang: ul.targetLang
  };
}

/**
 * Verarbeitet eine Review-Antwort.
 * @param {number} userVocabId
 * @param {number} rating 1..4
 * @param {number} elapsedMs Zeit für die Antwort (optional)
 */
export function submitReview(userVocabId, userId, rating, elapsedMs = null) {
  const uv = getUserVocab(userVocabId);
  if (!uv) {
    return { error: 'Karte nicht gefunden' };
  }
  const ul = getUserLanguage(uv.user_language_id, userId);
  if (!ul) {
    return { error: 'Keine Berechtigung' };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 4) {
    return { error: `Ungültiges Rating: ${rating}` };
  }

  const card = {
    state: uv.state,
    stability: uv.stability,
    difficulty: uv.difficulty,
    reps: uv.reps,
    lapses: uv.lapses,
    due_at: uv.due_at ? Date.parse(uv.due_at + 'Z') : null,
    last_review: uv.last_review ? Date.parse(uv.last_review + 'Z') : null
  };

  const result = review(card, rating, Date.now());
  applyReview(userVocabId, result.card, {
    rating,
    elapsedMs,
    prevStability: result.prevStability,
    nextStability: result.nextStability,
    prevDifficulty: result.prevDifficulty,
    nextDifficulty: result.nextDifficulty
  });

  return {
    ok: true,
    rating,
    intervalDays: result.intervalDays,
    state: result.card.state,
    due: countDue(uv.user_language_id)
  };
}

/**
 * Fügt eine neue Karte hinzu (Mining / manuell) und liefert sie zurück.
 * Legt Item + Bedeutung bei Bedarf an.
 */
export function addVocabCard(userLanguageId, userId, payload) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) {
    return { error: 'Sprache nicht gefunden' };
  }
  const lemma = (payload.lemma || '').trim();
  if (!lemma) {
    return { error: 'Lemma fehlt' };
  }

  const item = upsertVocabItem({
    lang: ul.targetLang,
    lemma,
    pos: payload.pos || null,
    gender: payload.gender || null,
    ipa: payload.ipa || null,
    level: payload.level || null,
    frequencyRank: payload.frequencyRank || null,
    metadata: payload.metadata || null
  });

  if (payload.translation) {
    addSense({
      vocabId: item.id,
      nativeLang: ul.nativeLang,
      translation: payload.translation,
      example: payload.example || null
    });
  }

  const { userVocabId, created } = addCard(userLanguageId, item.id, payload.source || 'manual');
  const card = getVocabWithSenses(item.id, ul.nativeLang);
  return { ok: true, userVocabId, created, card };
}

export function getStats(userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  return getVocabStats(userLanguageId);
}

/**
 * Reichert eine Rohe-Karte um Bedeutungen und FSRS-Feldnamen fürs UI auf.
 */
function hydrateCard(row, nativeLang) {
  const senses = getVocabWithSenses(row.vocab_id, nativeLang);
  return {
    userVocabId: row.id,
    vocabId: row.vocab_id,
    state: row.state,
    lemma: row.lemma,
    pos: row.pos,
    gender: row.gender,
    ipa: row.ipa,
    level: row.level,
    audioUrl: row.audio_url,
    senses: senses ? senses.senses : [],
    reps: row.reps,
    lapses: row.lapses
  };
}

export { RATING, createCard };
