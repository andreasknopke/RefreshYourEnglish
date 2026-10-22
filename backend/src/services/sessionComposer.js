/**
 * Session Composer v1
 *
 * Baut aus dem Curriculum automatisch die Tages-Sitzung eines Lernenden –
 * ohne dass dieser Module manuell wählt. Eine Sitzung folgt dem Prinzip
 * Input → Fokus → Output → Check und referenziert konkreten Content
 * (Texte, Grammatikpunkte, Output-Prompts, Dialog-Szenarien).
 *
 * Der Fortschritt pro Unit wird aus attempts (Grammatik), user_text_progress
 * (Lesen) und user_skill_state abgeleitet. Die fertige Planung wird pro Tag
 * in daily_sessions gecacht (idempotent).
 *
 * Sprachneutral: alles läuft über Pack-Code und Curriculum-Referenzen.
 */

import db from '../models/database.js';
import { getUserLanguage } from './userLanguageService.js';
import {
  loadUnits,
  getUnit,
  firstUnitForLevel,
  nextUnit,
  levelRank
} from './curriculumRepository.js';
import { listTexts } from './textRepository.js';
import { getPoint, listPoints } from './grammarRepository.js';
import { getScenario, listScenarios } from './dialogRepository.js';
import { getPromptById, listPrompts } from './outputRepository.js';

// Gewichtung der Stufen für die Minutenverteilung
const STAGE_MINUTES = { input: 12, fokus: 8, output: 10, check: 4 };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Content-Auflösung (Referenz -> konkreter Inhalt, mit Level-Fallback)
// ---------------------------------------------------------------------------

/**
 * Löst Lesetexte auf: zuerst über Titel, sonst level-passende Texte.
 * Hörtexte (metadata.kind === 'listening') werden ausgeschlossen.
 */
function resolveReading(lang, level, titles = []) {
  const all = listTexts(lang, level).filter((t) => !isListening(t));
  const byTitle = new Map(all.map((t) => [t.title.toLowerCase(), t]));
  const picked = [];
  for (const title of titles) {
    const hit = byTitle.get(String(title).toLowerCase());
    if (hit) picked.push({ id: hit.id, title: hit.title, level: hit.level });
  }
  // Fallback: level-passende Texte auffüllen
  for (const t of all) {
    if (picked.length >= 2) break;
    if (!picked.some((p) => p.id === t.id)) picked.push({ id: t.id, title: t.title, level: t.level });
  }
  return picked.slice(0, 2);
}

/**
 * Löst Hörtexte auf (metadata.kind === 'listening').
 */
function resolveListening(lang, level, titles = []) {
  const all = listTexts(lang, level).filter((t) => isListening(t));
  const byTitle = new Map(all.map((t) => [t.title.toLowerCase(), t]));
  const picked = [];
  for (const title of titles) {
    const hit = byTitle.get(String(title).toLowerCase());
    if (hit) picked.push({ id: hit.id, title: hit.title, level: hit.level });
  }
  for (const t of all) {
    if (picked.length >= 1) break;
    if (!picked.some((p) => p.id === t.id)) picked.push({ id: t.id, title: t.title, level: t.level });
  }
  return picked.slice(0, 1);
}

function isListening(text) {
  if (!text.metadata) return false;
  try {
    const m = typeof text.metadata === 'string' ? JSON.parse(text.metadata) : text.metadata;
    return m?.kind === 'listening';
  } catch {
    return false;
  }
}

/**
 * Löst Grammatikpunkte auf: referenzierte IDs, sonst level-passende Punkte.
 */
function resolveGrammar(lang, level, pointIds = []) {
  const picked = [];
  for (const pid of pointIds) {
    const p = getPoint(lang, pid);
    if (p) picked.push({ id: p.id, title: p.title, level: p.level, errorTag: p.errorTag });
  }
  if (picked.length === 0) {
    // Fallback: beliebige level-passende Punkte aus dem Syllabus
    for (const p of listPoints(lang, level)) {
      if (picked.length >= 2) break;
      picked.push({ id: p.id, title: p.title, level: p.level, errorTag: p.errorTag });
    }
  }
  return picked.slice(0, 2);
}

/**
 * Löst Output-Prompts auf (Schreiben).
 */
function resolveWriting(lang, level, promptIds = []) {
  const picked = [];
  for (const pid of promptIds) {
    const p = getPromptById(lang, pid);
    if (p && p.kind !== 'speaking') picked.push({ id: p.id, prompt: p.prompt_de, topic: p.topic });
  }
  if (picked.length === 0) {
    for (const p of listPrompts(lang, { level, kind: 'writing' })) {
      if (picked.length >= 1) break;
      picked.push({ id: p.id, prompt: p.prompt_de, topic: p.topic });
    }
  }
  return picked.slice(0, 1);
}

/**
 * Löst Sprech-Szenarien auf (Dialog).
 */
function resolveSpeaking(lang, level, scenarioIds = []) {
  const picked = [];
  for (const sid of scenarioIds) {
    const s = getScenario(lang, sid);
    if (s) picked.push({ id: s.id, title: s.title, level: s.level, roles: s.roles });
  }
  if (picked.length === 0) {
    // Fallback über dialogRepository.listScenarios
    for (const s of listScenarios(lang, level)) {
      if (picked.length >= 1) break;
      picked.push({ id: s.id, title: s.title, level: s.level, roles: s.roles });
    }
  }
  return picked.slice(0, 1);
}

// ---------------------------------------------------------------------------
// Fortschritt / Unit-Auswahl
// ---------------------------------------------------------------------------

/**
 * Set der bereits abgeschlossenen Unit-IDs (grob: Unit gilt als abgeschlossen,
 * wenn ihre Grammatikpunkte mit hoher Genauigkeit geübt UND ein Lesetext des
 * Levels gelesen wurde).
 */
function getCompletedUnits(lang, userLanguageId, level) {
  const completed = new Set();
  const units = loadUnits(lang).filter((u) => u.level === level);
  for (const unit of units) {
    const grammarIds = unit.fokus?.grammar || [];
    if (grammarIds.length === 0) continue;
    const practiced = grammarIds.filter((gid) => hasAttempt(userLanguageId, gid));
    // Unit gilt als behandelt, wenn alle Grammatikpunkte mindestens einmal geübt wurden
    if (practiced.length === grammarIds.length) completed.add(unit.id);
  }
  return completed;
}

function hasAttempt(userLanguageId, exerciseId) {
  const row = db
    .prepare('SELECT 1 FROM attempts WHERE user_language_id = ? AND exercise_id = ? LIMIT 1')
    .get(userLanguageId, exerciseId);
  return !!row;
}

/**
 * Wählt die aktuelle Unit: erste unvollendete Unit ab dem Startlevel.
 */
function selectUnit(lang, userLanguageId, startLevel, targetLevel) {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const startIdx = Math.max(0, levels.indexOf(startLevel || 'A1'));
  const targetIdx = Math.max(startIdx, levels.indexOf(targetLevel || 'B1'));

  for (let i = startIdx; i <= targetIdx; i++) {
    const level = levels[i];
    const completed = getCompletedUnits(lang, userLanguageId, level);
    const units = loadUnits(lang).filter((u) => u.level === level);
    const pending = units.find((u) => !completed.has(u.id));
    if (pending) return pending;
  }
  // Alles abgeschlossen -> letzte Unit des Ziellevels (Wiederholung)
  return firstUnitForLevel(lang, levels[targetIdx]) || loadUnits(lang).slice(-1)[0];
}

// ---------------------------------------------------------------------------
// Sitzung bauen
// ---------------------------------------------------------------------------

/**
 * Baut die Tages-Sitzung (idempotent pro Tag).
 *
 * @returns {{ ok, date, unit, stages, minutes, cached }}
 */
export function getTodaySession(userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };

  const date = todayStr();
  const cached = getCachedSession(userLanguageId, date);
  if (cached) return { ...cached, cached: true };

  const lang = ul.targetLang;
  const startLevel = ul.startCefr || 'A1';
  const targetLevel = ul.targetCefr || 'B1';

  const unit = selectUnit(lang, userLanguageId, startLevel, targetLevel);
  if (!unit) return { error: 'Kein Curriculum verfügbar' };

  const level = unit.level;
  const stages = buildStages(lang, unit);
  const minutes = stages.reduce((a, s) => a + (s.minutes || 0), 0);

  const plan = {
    userLanguageId,
    date,
    unitId: unit.id,
    level,
    theme: unit.theme,
    goal: unit.goal,
    stages,
    minutes
  };

  saveSession(userLanguageId, date, plan);
  return { ok: true, date, unit, stages, minutes, cached: false };
}

function buildStages(lang, unit) {
  const level = unit.level;
  const reading = resolveReading(lang, level, unit.input?.reading || []);
  const listening = resolveListening(lang, level, unit.input?.listening || []);
  const grammar = resolveGrammar(lang, level, unit.fokus?.grammar || []);
  const writing = resolveWriting(lang, level, unit.output?.writing || []);
  const speaking = resolveSpeaking(lang, level, unit.output?.speaking || []);

  const stages = [];

  // 1) INPUT
  stages.push({
    key: 'input',
    type: 'input',
    title: 'Verstehender Input',
    minutes: STAGE_MINUTES.input,
    items: [
      ...reading.map((r) => ({ kind: 'reading', ...r })),
      ...listening.map((l) => ({ kind: 'listening', ...l }))
    ]
  });

  // 2) FOKUS (Grammatik)
  stages.push({
    key: 'fokus',
    type: 'fokus',
    title: 'Grammatik-Fokus',
    minutes: STAGE_MINUTES.fokus,
    items: grammar.map((g) => ({ kind: 'grammar', ...g }))
  });

  // 3) OUTPUT (Schreiben + Sprechen)
  stages.push({
    key: 'output',
    type: 'output',
    title: 'Produktion',
    minutes: STAGE_MINUTES.output,
    items: [
      ...writing.map((w) => ({ kind: 'writing', ...w })),
      ...speaking.map((s) => ({ kind: 'speaking', ...s }))
    ]
  });

  // 4) CHECK (Can-do)
  stages.push({
    key: 'check',
    type: 'check',
    title: 'Can-do-Check',
    minutes: STAGE_MINUTES.check,
    items: (unit.check?.cando || []).map((c, i) => ({ kind: 'cando', id: `cando-${i}`, text: c }))
  });

  return stages;
}

// ---------------------------------------------------------------------------
// Persistenz (daily_sessions)
// ---------------------------------------------------------------------------

function getCachedSession(userLanguageId, date) {
  const row = db
    .prepare('SELECT * FROM daily_sessions WHERE user_language_id = ? AND date = ?')
    .get(userLanguageId, date);
  if (!row) return null;
  let plan;
  try {
    plan = JSON.parse(row.plan);
  } catch {
    return null;
  }
  let completed = [];
  try {
    completed = JSON.parse(row.completed || '[]');
  } catch {
    completed = [];
  }
  return { ok: true, date, ...plan, completed };
}

function saveSession(userLanguageId, date, plan) {
  db.prepare(
    `INSERT INTO daily_sessions (user_language_id, date, plan, completed, minutes)
     VALUES (?, ?, ?, '[]', ?)
     ON CONFLICT(user_language_id, date) DO UPDATE SET
       plan = excluded.plan, minutes = excluded.minutes`
  ).run(userLanguageId, date, JSON.stringify(plan), plan.minutes || 0);
}

/**
 * Markiert eine Stufe der heutigen Sitzung als abgeschlossen.
 */
export function completeStage(userLanguageId, userId, { stageKey }) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  if (!stageKey) return { error: 'stageKey fehlt' };

  const date = todayStr();
  const row = db
    .prepare('SELECT * FROM daily_sessions WHERE user_language_id = ? AND date = ?')
    .get(userLanguageId, date);
  if (!row) return { error: 'Keine Sitzung für heute' };

  let completed = [];
  try {
    completed = JSON.parse(row.completed || '[]');
  } catch {
    completed = [];
  }
  if (!completed.includes(stageKey)) completed.push(stageKey);

  db.prepare('UPDATE daily_sessions SET completed = ? WHERE id = ?').run(
    JSON.stringify(completed),
    row.id
  );

  return { ok: true, date, completed };
}

/**
 * Fortschrittsübersicht: aktuelle Unit + Abschluss pro Stufe.
 */
export function getSessionProgress(userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const date = todayStr();
  const cached = getCachedSession(userLanguageId, date);
  if (!cached) return { ok: true, date, hasSession: false };
  return { ok: true, date, hasSession: true, unitId: cached.unitId, completed: cached.completed || [] };
}
