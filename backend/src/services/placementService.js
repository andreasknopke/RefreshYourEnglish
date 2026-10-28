/**
 * Placement Service
 *
 * Verwaltet adaptive Einstufungssessions. Der adaptive Zustand (theta je Skill,
 * gesehene Items) wird serverseitig in placement_sessions.theta als JSON
 * gespeichert, damit der Client keine Modell-Intelligenz besitzt.
 *
 * Bewertung im MVP ohne LLM (schnell, offline, deterministisch):
 *   - mc / listen : exakter Vergleich mit item.answer
 *   - produce     : Keyword-Treffer + Mindestwortanzahl (Heuristik)
 * LLM-basierte Bewertung für produce kann später ergänzt werden.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../models/database.js';
import {
  createPlacementState,
  selectNextItem,
  updateAfterAnswer,
  shouldStop,
  summarize,
  thetaToCefr
} from './placementEngine.js';
import { saveSkillState, setStartCefr } from './userLanguageService.js';
import { gradeAnswer } from './placementGrading.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKS_DIR = process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

const itemCache = new Map();

/**
 * Lädt die Item-Bank einer Sprache aus content/packs/<lang>/placement/items.json.
 */
export function loadItems(lang) {
  if (itemCache.has(lang)) {
    return itemCache.get(lang);
  }
  const file = path.join(PACKS_DIR, lang, 'placement', 'items.json');
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const items = Array.isArray(data.items) ? data.items : [];
    itemCache.set(lang, items);
    return items;
  } catch (err) {
    console.error(`❌ Placement-Items für "${lang}" konnten nicht gelesen werden:`, err.message);
    return [];
  }
}

/**
 * Bewertet eine Antwort auf ein Item (siehe placementGrading.js).
 */

/**
 * Startet eine Placement-Session.
 * @returns {{ sessionId, item, progress }}
 */
export function startPlacement(userLanguageId, lang, skills) {
  const items = loadItems(lang);
  if (items.length === 0) {
    throw new Error(`Keine Placement-Items für Sprache "${lang}" verfügbar`);
  }

  const state = createPlacementState(skills);
  const first = pickNextAcrossSkills(state, items, skills);

  const result = db
    .prepare(
      'INSERT INTO placement_sessions (user_language_id, theta) VALUES (?, ?)'
    )
    .run(userLanguageId, JSON.stringify(state));

  return {
    sessionId: result.lastInsertRowid,
    item: publicItem(first),
    progress: { answered: 0, skills }
  };
}

/**
 * Verarbeitet eine Antwort und liefert das nächste Item oder das Ergebnis.
 */
export function answerPlacement(sessionId, userLanguageId, itemId, response) {
  const session = db
    .prepare('SELECT * FROM placement_sessions WHERE id = ? AND user_language_id = ?')
    .get(sessionId, userLanguageId);
  if (!session) {
    throw new Error('Placement-Session nicht gefunden');
  }
  if (session.finished_at) {
    return { sessionId, done: true, result: safeParse(session.result) };
  }

  const state = safeParse(session.theta) || createPlacementState();
  const lang = getLangForSession(userLanguageId);
  const items = loadItems(lang);
  const item = items.find((it) => it.id === itemId);
  if (!item) {
    throw new Error(`Item "${itemId}" nicht gefunden`);
  }

  const correct = gradeAnswer(item, response);
  const nextState = updateAfterAnswer(state, item, correct);

  if (shouldStop(nextState)) {
    return finishPlacement(sessionId, userLanguageId, nextState);
  }

  const skills = Object.keys(nextState.answers);
  const next = pickNextAcrossSkills(nextState, items, skills);

  if (!next) {
    return finishPlacement(sessionId, userLanguageId, nextState);
  }

  db.prepare('UPDATE placement_sessions SET theta = ? WHERE id = ?').run(
    JSON.stringify(nextState),
    sessionId
  );

  return {
    sessionId,
    done: false,
    correct,
    item: publicItem(next),
    progress: { answered: nextState.answered, skills }
  };
}

/**
 * Beendet die Session, speichert Ergebnis und schreibt Skill-State + Startniveau.
 */
function finishPlacement(sessionId, userLanguageId, state) {
  const summary = summarize(state);

  // Skill-Scores (0-100) aus theta ableiten
  const skillScores = {};
  for (const [skill, s] of Object.entries(summary.skills)) {
    skillScores[skill] = {
      score: thetaToScore(s.theta),
      cefr_band: s.cefr_band
    };
  }
  saveSkillState(userLanguageId, skillScores);
  setStartCefr(userLanguageId, summary.overall);

  db.prepare(
    'UPDATE placement_sessions SET finished_at = CURRENT_TIMESTAMP, result = ? WHERE id = ?'
  ).run(JSON.stringify(summary), sessionId);

  return { sessionId, done: true, correct: true, result: summary };
}

/**
 * Wählt das nächste Item über alle noch offenen Skills: priorisiert den Skill
 * mit dem wenigsten gesehenen Items (Fairness), dann maximale Information.
 */
function pickNextAcrossSkills(state, items, skills) {
  let best = null;
  let bestSeen = Infinity;
  for (const skill of skills) {
    const candidate = selectNextItem(state, items, skill);
    if (!candidate) continue;
    const seenCount = state.answers[skill].seen.length;
    if (seenCount < bestSeen) {
      bestSeen = seenCount;
      best = candidate;
    }
  }
  return best;
}

function getLangForSession(userLanguageId) {
  const row = db
    .prepare('SELECT target_lang FROM user_languages WHERE id = ?')
    .get(userLanguageId);
  return row ? row.target_lang : 'it';
}

function thetaToScore(theta) {
  // theta [-3..4.5] -> score [0..100]
  const t = Math.min(4.5, Math.max(-3, theta));
  return Math.round(((t + 3) / 7.5) * 100);
}

/**
 * Entfernt die Lösung aus einem Item, bevor es an den Client geht.
 */
function publicItem(item) {
  if (!item) return null;
  const { answer, keywords, ...rest } = item;
  return rest;
}

function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export { thetaToCefr };

/**
 * Placement-Status einer Sprache: wurde der Test je vollständig abgeschlossen?
 * Liefert zusätzlich die letzte (ggf. abgebrochene) Session, damit der Client
 * zum Wiederholen einladen kann.
 * @returns {{done: boolean, lastSession: object|null}}
 */
export function getPlacementStatus(userLanguageId) {
  const ul = db
    .prepare('SELECT placement_dismissed FROM user_languages WHERE id = ?')
    .get(userLanguageId);

  const finished = db
    .prepare(
      'SELECT id, finished_at, result FROM placement_sessions WHERE user_language_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1'
    )
    .get(userLanguageId);
  if (finished) {
    return {
      done: true,
      dismissed: false,
      lastSession: {
        id: finished.id,
        finishedAt: finished.finished_at,
        result: safeParse(finished.result)
      }
    };
  }
  const last = db
    .prepare(
      'SELECT id, started_at FROM placement_sessions WHERE user_language_id = ? ORDER BY started_at DESC LIMIT 1'
    )
    .get(userLanguageId);
  return {
    done: false,
    dismissed: !!ul?.placement_dismissed,
    lastSession: last ? { id: last.id, startedAt: last.started_at, result: null } : null
  };
}
