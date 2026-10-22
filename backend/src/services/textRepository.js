/**
 * Text Repository
 *
 * Datenzugriff auf texts, text_segments und user_text_progress. Sprachneutral.
 */

import db from '../models/database.js';

export function getTextById(textId) {
  return db.prepare('SELECT * FROM texts WHERE id = ?').get(textId);
}

export function getSegments(textId) {
  return db
    .prepare('SELECT * FROM text_segments WHERE text_id = ? ORDER BY seq ASC')
    .all(textId);
}

/**
 * Listet Texte einer Sprache, optional nach Level gefiltert.
 */
export function listTexts(lang, level = null) {
  if (level) {
    return db
      .prepare('SELECT * FROM texts WHERE lang = ? AND level = ? ORDER BY est_minutes ASC, id ASC')
      .all(lang, level);
  }
  return db
    .prepare('SELECT * FROM texts WHERE lang = ? ORDER BY level ASC, est_minutes ASC, id ASC')
    .all(lang);
}

/**
 * Legt einen Text mit Segmenten an (idempotent über lang+title).
 */
export function upsertText({ lang, title, level, body, source, topic, estMinutes, metadata, segments }) {
  const existing = db
    .prepare('SELECT * FROM texts WHERE lang = ? AND title = ?')
    .get(lang, title);
  if (existing) {
    return existing;
  }
  const result = db
    .prepare(
      `INSERT INTO texts (lang, title, level, body, source, topic, est_minutes, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      lang,
      title,
      level || null,
      body,
      source || 'curated',
      topic || null,
      estMinutes || null,
      metadata ? JSON.stringify(metadata) : null
    );
  const textId = result.lastInsertRowid;

  const segs = Array.isArray(segments) && segments.length > 0
    ? segments
    : splitIntoSegments(body);

  const stmt = db.prepare(
    'INSERT INTO text_segments (text_id, seq, body, audio_url) VALUES (?, ?, ?, ?)'
  );
  segs.forEach((s, i) => {
    const segBody = typeof s === 'string' ? s : s.body;
    const audioUrl = typeof s === 'string' ? null : s.audio_url || null;
    stmt.run(textId, i + 1, segBody, audioUrl);
  });

  return getTextById(textId);
}

/**
 * Liest den Lesefortschritt eines Nutzers für einen Text.
 */
export function getTextProgress(userLanguageId, textId) {
  return db
    .prepare('SELECT * FROM user_text_progress WHERE user_language_id = ? AND text_id = ?')
    .get(userLanguageId, textId);
}

/**
 * Setzt/aktualisiert Coverage und Abschluss eines Textes.
 */
export function upsertTextProgress(userLanguageId, textId, { coverage = null, completed = false } = {}) {
  const existing = getTextProgress(userLanguageId, textId);
  if (existing) {
    db.prepare(
      `UPDATE user_text_progress
         SET coverage = COALESCE(?, coverage),
             completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
             last_read_at = CURRENT_TIMESTAMP
       WHERE user_language_id = ? AND text_id = ?`
    ).run(coverage, completed ? 1 : 0, userLanguageId, textId);
    return getTextProgress(userLanguageId, textId);
  }
  db.prepare(
    `INSERT INTO user_text_progress (user_language_id, text_id, coverage, completed_at)
     VALUES (?, ?, ?, ?)`
  ).run(
    userLanguageId,
    textId,
    coverage,
    completed ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null
  );
  return getTextProgress(userLanguageId, textId);
}

/**
 * Listet die bekannten Lemmata eines Nutzers für eine Sprache (Karten, die
 * mindestens einmal gelernt wurden). Für den Coverage-Check.
 */
export function getKnownLemmas(userLanguageId) {
  const rows = db
    .prepare(
      `SELECT LOWER(vi.lemma) AS lemma
         FROM user_vocab uv
         JOIN vocab_items vi ON vi.id = uv.vocab_id
        WHERE uv.user_language_id = ?`
    )
    .all(userLanguageId);
  return new Set(rows.map((r) => r.lemma));
}

/**
 * Zerlegt einen Fließtext in Sätze (grobe satzweise Segmentierung).
 */
export function splitIntoSegments(body) {
  return body
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
