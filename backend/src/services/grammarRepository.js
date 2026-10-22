/**
 * Grammar Repository
 *
 * Lädt den Grammatik-Syllabus eines Language Packs (Manifest-Feld
 * `grammarSyllabus`) und persistiert Übungs-Versuche (attempts), das
 * Fehlerprofil (error_profile) und den Grammar-Skill (user_skill_state).
 *
 * Sprachneutral: Es wird nur über den Pack-Code und das Manifest geladen –
 * keine hartkodierten Sprachnamen.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../models/database.js';
import { getPack } from '../languages/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_DIR =
  process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

// Cache: lang -> Punkte-Array (Syllabus-Dateien sind statisch)
const syllabusCache = new Map();

/**
 * Lädt den Syllabus einer Sprache aus dem Pack. Gibt das Punkte-Array zurück
 * oder ein leeres Array, wenn kein Syllabus vorhanden ist.
 */
export function loadSyllabus(lang, forceReload = false) {
  if (syllabusCache.has(lang) && !forceReload) {
    return syllabusCache.get(lang);
  }

  const pack = getPack(lang);
  const rel = pack?.grammarSyllabus || `grammar/${lang}_cefr.json`;
  const file = path.join(PACKS_DIR, lang, rel);

  let points = [];
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      points = Array.isArray(data.points) ? data.points : [];
    } else {
      console.warn(`⚠️ Kein Grammatik-Syllabus gefunden: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Grammatik-Syllabus "${file}" konnte nicht gelesen werden:`, err.message);
    points = [];
  }

  syllabusCache.set(lang, points);
  return points;
}

/**
 * Kompakte Punkt-Übersicht (ohne Übungs-Lösungen) für die Auswahl-Ansicht.
 */
export function listPoints(lang, level = null) {
  const points = loadSyllabus(lang);
  return points
    .filter((p) => !level || p.level === level)
    .map((p) => ({
      id: p.id,
      level: p.level,
      title: p.title,
      concept: p.concept,
      errorTag: p.errorTag,
      exerciseCount: Array.isArray(p.exercises) ? p.exercises.length : 0
    }));
}

/**
 * Ein einzelner Punkt inkl. Erklärung/Beispiele. Übungen werden ohne
 * Lösungsfeld (`a`/`ans`) zurückgegeben, damit die Antwort nicht an den
 * Client leakt. Die vollständigen Übungen holt sich der Service intern.
 */
export function getPoint(lang, pointId) {
  const point = loadSyllabus(lang).find((p) => p.id === pointId);
  if (!point) return null;
  return {
    id: point.id,
    level: point.level,
    title: point.title,
    concept: point.concept,
    errorTag: point.errorTag,
    explanation: point.explanation,
    examples: point.examples || [],
    exercises: (point.exercises || []).map(stripAnswers)
  };
}

/**
 * Vollständiger Punkt inkl. Lösungen – nur für die serverseitige Auswertung.
 */
export function getPointWithAnswers(lang, pointId) {
  return loadSyllabus(lang).find((p) => p.id === pointId) || null;
}

function stripAnswers(ex) {
  const { a, ans, why, ...rest } = ex;
  return rest;
}

// ---------------------------------------------------------------------------
// Attempts / Fehlerprofil / Skill
// ---------------------------------------------------------------------------

/**
 * Speichert einen Übungsversuch.
 */
export function recordAttempt({ userLanguageId, exerciseId, response, score, errorTags, durationMs }) {
  const info = db
    .prepare(
      `INSERT INTO attempts (user_language_id, exercise_id, response, score, error_tags, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userLanguageId,
      exerciseId ?? null,
      JSON.stringify(response ?? null),
      score ?? null,
      JSON.stringify(errorTags ?? []),
      durationMs ?? null
    );
  return info.lastInsertRowid;
}

/**
 * Zählt einen Fehler-Typ im Fehlerprofil hoch und merkt sich ein Beispiel.
 */
export function bumpErrorProfile(userLanguageId, category, example = null) {
  if (!category) return;
  const existing = db
    .prepare('SELECT * FROM error_profile WHERE user_language_id = ? AND category = ?')
    .get(userLanguageId, category);

  if (existing) {
    let examples = [];
    try {
      examples = JSON.parse(existing.examples || '[]');
    } catch {
      examples = [];
    }
    if (example && !examples.includes(example)) {
      examples.push(example);
      examples = examples.slice(-5); // nur die letzten 5 Beispiele behalten
    }
    db.prepare(
      `UPDATE error_profile
       SET count = count + 1, last_seen = CURRENT_TIMESTAMP, examples = ?
       WHERE user_language_id = ? AND category = ?`
    ).run(JSON.stringify(examples), userLanguageId, category);
  } else {
    db.prepare(
      `INSERT INTO error_profile (user_language_id, category, count, last_seen, examples)
       VALUES (?, ?, 1, CURRENT_TIMESTAMP, ?)`
    ).run(userLanguageId, category, JSON.stringify(example ? [example] : []));
  }
}

/**
 * Aggregiertes Fehlerprofil: Kategorien absteigend nach Häufigkeit.
 */
export function getErrorProfile(userLanguageId) {
  const rows = db
    .prepare(
      'SELECT category, count, last_seen, examples FROM error_profile WHERE user_language_id = ? ORDER BY count DESC, last_seen DESC'
    )
    .all(userLanguageId);
  return rows.map((r) => {
    let examples = [];
    try {
      examples = JSON.parse(r.examples || '[]');
    } catch {
      examples = [];
    }
    return { category: r.category, count: r.count, lastSeen: r.last_seen, examples };
  });
}

/**
 * Setzt/aktualisiert den Skill-Score einer Fähigkeit (0–100) und das CEFR-Band.
 */
export function upsertSkill(userLanguageId, skill, score, cefrBand = null) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const existing = db
    .prepare('SELECT * FROM user_skill_state WHERE user_language_id = ? AND skill = ?')
    .get(userLanguageId, skill);
  if (existing) {
    db.prepare(
      `UPDATE user_skill_state SET score = ?, cefr_band = COALESCE(?, cefr_band), updated_at = CURRENT_TIMESTAMP
       WHERE user_language_id = ? AND skill = ?`
    ).run(clamped, cefrBand, userLanguageId, skill);
  } else {
    db.prepare(
      `INSERT INTO user_skill_state (user_language_id, skill, score, cefr_band) VALUES (?, ?, ?, ?)`
    ).run(userLanguageId, skill, clamped, cefrBand);
  }
}

/**
 * Genauigkeit (0–1) aller Grammatik-Versuche einer Sprache. Nutzt das Feld
 * response.kind === 'grammar' zur Abgrenzung von Schreib-Versuchen.
 */
export function getGrammarAccuracy(userLanguageId) {
  const rows = db
    .prepare('SELECT score FROM attempts WHERE user_language_id = ? AND response LIKE ?')
    .all(userLanguageId, '%"kind":"grammar"%');
  if (rows.length === 0) return { accuracy: null, total: 0 };
  const correct = rows.filter((r) => r.score === 1).length;
  return { accuracy: correct / rows.length, total: rows.length };
}

/**
 * Durchschnittlicher Score (0–1) aller Schreib-Versuche (response.kind ===
 * 'writing'). Score ist hier die normalisierte LLM-Bewertung (score/10).
 */
export function getWritingAverage(userLanguageId) {
  const rows = db
    .prepare('SELECT score FROM attempts WHERE user_language_id = ? AND response LIKE ?')
    .all(userLanguageId, '%"kind":"writing"%');
  if (rows.length === 0) return { average: null, total: 0 };
  const sum = rows.reduce((n, r) => n + (r.score || 0), 0);
  return { average: sum / rows.length, total: rows.length };
}

/**
 * Liest alle Skills einer Sprache als Map skill -> {score, cefrBand}.
 */
export function getSkills(userLanguageId) {
  const rows = db
    .prepare('SELECT skill, score, cefr_band FROM user_skill_state WHERE user_language_id = ?')
    .all(userLanguageId);
  const out = {};
  for (const r of rows) out[r.skill] = { score: r.score, cefrBand: r.cefr_band };
  return out;
}
