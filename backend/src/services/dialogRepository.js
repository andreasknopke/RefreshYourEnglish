/**
 * Dialog Repository
 *
 * Lädt die Dialog-Szenarien eines Language Packs (Manifest-Feld `curriculum`)
 * und liefert sie sprachneutral. Szenarien enthalten Rollen, Situation,
 * Eröffnungszeile, Redemittel und Shadowing-Sätze.
 *
 * Die Dialog-Historie pro Szenario wird in `attempts` abgelegt (response.kind
 * === 'dialog'), damit der Verlauf ohne eigenes Table-Setup erhalten bleibt.
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

const curriculumCache = new Map();

/**
 * Lädt das Curriculum (Szenarien) einer Sprache aus dem Pack.
 */
export function loadCurriculum(lang, forceReload = false) {
  if (curriculumCache.has(lang) && !forceReload) {
    return curriculumCache.get(lang);
  }

  const pack = getPack(lang);
  const rel = pack?.curriculum || `curriculum/${lang}_a1_b1.json`;
  const file = path.join(PACKS_DIR, lang, rel);

  let scenarios = [];
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
    } else {
      console.warn(`⚠️ Kein Curriculum gefunden: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Curriculum "${file}" konnte nicht gelesen werden:`, err.message);
    scenarios = [];
  }

  curriculumCache.set(lang, scenarios);
  return scenarios;
}

/**
 * Kompakte Szenario-Übersicht für die Auswahl-Ansicht.
 */
export function listScenarios(lang, level = null) {
  return loadCurriculum(lang)
    .filter((s) => !level || s.level === level)
    .map((s) => ({
      id: s.id,
      level: s.level,
      title: s.title,
      goal: s.goal,
      roles: s.roles,
      turnCount: s.turnCount || 4
    }));
}

/**
 * Ein vollständiges Szenario (ohne interne Felder).
 */
export function getScenario(lang, scenarioId) {
  const s = loadCurriculum(lang).find((x) => x.id === scenarioId);
  if (!s) return null;
  return {
    id: s.id,
    level: s.level,
    title: s.title,
    goal: s.goal,
    roles: s.roles,
    situation: s.situation,
    opening: s.opening,
    redemittel: s.redemittel || [],
    targetVocab: s.targetVocab || [],
    shadowing: s.shadowing || [],
    turnCount: s.turnCount || 4
  };
}

/**
 * Alle Shadowing-Sätze einer Sprache (optional nach Level gefiltert).
 */
export function listShadowing(lang, level = null) {
  const out = [];
  for (const s of loadCurriculum(lang)) {
    if (level && s.level !== level) continue;
    for (const sentence of s.shadowing || []) {
      out.push({ scenarioId: s.id, scenarioTitle: s.title, level: s.level, reference: sentence });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Dialog-Historie (in attempts abgelegt)
// ---------------------------------------------------------------------------

/**
 * Lädt den gespeicherten Dialogverlauf eines Szenarios.
 */
export function getDialogHistory(userLanguageId, scenarioId) {
  const rows = db
    .prepare(
      `SELECT response FROM attempts
       WHERE user_language_id = ? AND response LIKE ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(userLanguageId, '%"kind":"dialog"%');

  const turns = [];
  for (const r of rows) {
    try {
      const obj = JSON.parse(r.response);
      if (obj && obj.scenarioId === scenarioId) {
        if (obj.learner) turns.push({ role: 'learner', text: obj.learner });
        if (obj.partner) turns.push({ role: 'partner', text: obj.partner });
      }
    } catch {
      /* ignore malformed */
    }
  }
  return turns;
}

/**
 * Speichert einen Dialogzug (Lernender + Partnerantwort) als Attempt.
 */
export function recordDialogTurn({
  userLanguageId,
  scenarioId,
  learner,
  partner,
  score,
  errorTags
}) {
  return db
    .prepare(
      `INSERT INTO attempts (user_language_id, exercise_id, response, score, error_tags, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userLanguageId,
      scenarioId,
      JSON.stringify({ kind: 'dialog', scenarioId, learner, partner }),
      score ?? null,
      JSON.stringify(errorTags ?? []),
      null
    ).lastInsertRowid;
}

/**
 * Ø-Score (0–1) aller Dialog-Züge einer Sprache.
 */
export function getDialogAverage(userLanguageId) {
  const rows = db
    .prepare('SELECT score FROM attempts WHERE user_language_id = ? AND response LIKE ?')
    .all(userLanguageId, '%"kind":"dialog"%');
  const scored = rows.filter((r) => Number.isFinite(r.score));
  if (scored.length === 0) return { average: null, total: 0 };
  const sum = scored.reduce((a, r) => a + r.score, 0);
  return { average: sum / scored.length, total: scored.length };
}
