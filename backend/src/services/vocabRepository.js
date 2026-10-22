/**
 * Vocab Repository
 *
 * Datenzugriff auf vocab_items, vocab_senses und user_vocab. Sprachneutral:
 * keine hartkodierten Sprachcodes – die Sprache kommt aus dem Language Pack.
 *
 * Folgt dem synchronen db.prepare-Muster (better-sqlite3); PG-Pfad über Adapter.
 */

import db from '../models/database.js';
import { createCard } from './fsrs.js';

/**
 * Findet ein Vokabel-Item nach Lemma (exakt, case-insensitive) für eine Sprache.
 */
export function findVocabByLemma(lang, lemma) {
  return db
    .prepare(
      'SELECT * FROM vocab_items WHERE lang = ? AND LOWER(lemma) = LOWER(?)'
    )
    .get(lang, lemma);
}

export function getVocabById(vocabId) {
  return db.prepare('SELECT * FROM vocab_items WHERE id = ?').get(vocabId);
}

/**
 * Legt ein Vokabel-Item an (idempotent über Lemma+Lang). Gibt die Item-Zeile zurück.
 */
export function upsertVocabItem({
  lang,
  lemma,
  pos = null,
  gender = null,
  ipa = null,
  frequencyRank = null,
  level = null,
  audioUrl = null,
  metadata = null
}) {
  const existing = findVocabByLemma(lang, lemma);
  if (existing) {
    return existing;
  }
  const result = db
    .prepare(
      `INSERT INTO vocab_items (lang, lemma, pos, gender, ipa, frequency_rank, level, audio_url, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      lang,
      lemma,
      pos,
      gender,
      ipa,
      frequencyRank,
      level,
      audioUrl,
      metadata ? JSON.stringify(metadata) : null
    );
  return getVocabById(result.lastInsertRowid);
}

/**
 * Fügt eine Bedeutung (Übersetzung in Muttersprache) hinzu. Idempotent über
 * vocab_id + native_lang + translation.
 */
export function addSense({ vocabId, nativeLang, translation, example = null, notes = null }) {
  const existing = db
    .prepare(
      'SELECT * FROM vocab_senses WHERE vocab_id = ? AND native_lang = ? AND translation = ?'
    )
    .get(vocabId, nativeLang, translation);
  if (existing) return existing;
  const result = db
    .prepare(
      'INSERT INTO vocab_senses (vocab_id, native_lang, translation, example, notes) VALUES (?, ?, ?, ?, ?)'
    )
    .run(vocabId, nativeLang, translation, example, notes);
  return db.prepare('SELECT * FROM vocab_senses WHERE id = ?').get(result.lastInsertRowid);
}

export function getSenses(vocabId, nativeLang = null) {
  if (nativeLang) {
    return db
      .prepare('SELECT * FROM vocab_senses WHERE vocab_id = ? AND native_lang = ?')
      .all(vocabId, nativeLang);
  }
  return db.prepare('SELECT * FROM vocab_senses WHERE vocab_id = ?').all(vocabId);
}

/**
 * Lädt ein Vokabel-Item inkl. Bedeutungen.
 */
export function getVocabWithSenses(vocabId, nativeLang = null) {
  const item = getVocabById(vocabId);
  if (!item) return null;
  return { ...item, senses: getSenses(vocabId, nativeLang) };
}

/**
 * Fügt eine Karte zum Kartenstapel eines Nutzers hinzu (falls nicht vorhanden).
 * @returns {{ userVocabId, created: boolean }}
 */
export function addCard(userLanguageId, vocabId, source = 'manual') {
  const existing = db
    .prepare('SELECT id FROM user_vocab WHERE user_language_id = ? AND vocab_id = ?')
    .get(userLanguageId, vocabId);
  if (existing) {
    return { userVocabId: existing.id, created: false };
  }
  const result = db
    .prepare(
      'INSERT INTO user_vocab (user_language_id, vocab_id, state, source) VALUES (?, ?, ?, ?)'
    )
    .run(userLanguageId, vocabId, 'new', source);
  return { userVocabId: result.lastInsertRowid, created: true };
}

/**
 * Liest den Karten-Zustand (FSRS-Feldern) einer user_vocab-Zeile.
 */
export function getUserVocab(userVocabId) {
  return db.prepare('SELECT * FROM user_vocab WHERE id = ?').get(userVocabId);
}

/**
 * Persistiert einen FSRS-Karten-Zustand und schreibt ein Review-Log.
 */
export function applyReview(userVocabId, card, meta = {}) {
  db.prepare(
    `UPDATE user_vocab
       SET state = ?, stability = ?, difficulty = ?, due_at = ?, last_review = ?, reps = ?, lapses = ?
     WHERE id = ?`
  ).run(
    card.state,
    card.stability,
    card.difficulty,
    toSqlite(card.due_at),
    toSqlite(card.last_review),
    card.reps,
    card.lapses,
    userVocabId
  );

  db.prepare(
    `INSERT INTO review_logs
       (user_vocab_id, rating, elapsed_ms, prev_stability, next_stability, prev_difficulty, next_difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userVocabId,
    meta.rating ?? null,
    meta.elapsedMs ?? null,
    meta.prevStability ?? null,
    meta.nextStability ?? null,
    meta.prevDifficulty ?? null,
    meta.nextDifficulty ?? null
  );
}

/**
 * Fällig-Queue: Karten, die gelernt werden können (neu oder überfällig).
 * Begrenzt auf `limit`, neue Karten vor überfälligen Review-Karten.
 */
export function getDueCards(userLanguageId, limit = 20) {
  return db
    .prepare(
      `SELECT uv.*, vi.lemma, vi.pos, vi.gender, vi.ipa, vi.level, vi.audio_url, vi.metadata
         FROM user_vocab uv
         JOIN vocab_items vi ON vi.id = uv.vocab_id
        WHERE uv.user_language_id = ?
          AND uv.suspended = 0
          AND (uv.state = 'new' OR (uv.due_at IS NOT NULL AND uv.due_at <= datetime('now')))
        ORDER BY
          CASE WHEN uv.state = 'new' THEN 0 ELSE 1 END,
          uv.due_at ASC
        LIMIT ?`
    )
    .all(userLanguageId, limit);
}

/**
 * Zählt fällige Karten (neu + überfällig).
 */
export function countDue(userLanguageId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM user_vocab
        WHERE user_language_id = ? AND suspended = 0
          AND (state = 'new' OR (due_at IS NOT NULL AND due_at <= datetime('now')))`
    )
    .get(userLanguageId);
  return row ? row.c : 0;
}

/**
 * Aggregierte Statistik für ein Karten-Set.
 */
export function getVocabStats(userLanguageId) {
  const rows = db
    .prepare(
      'SELECT state, COUNT(*) AS c FROM user_vocab WHERE user_language_id = ? GROUP BY state'
    )
    .all(userLanguageId);
  const stats = { new: 0, learning: 0, review: 0, relearning: 0, total: 0 };
  for (const r of rows) {
    stats[r.state] = r.c;
    stats.total += r.c;
  }
  stats.due = countDue(userLanguageId);
  return stats;
}

function toSqlite(ms) {
  if (ms == null) return null;
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
}

export { createCard };
