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
import { listTexts, getUserQuizResult } from './textRepository.js';
import { getPoint, listPoints, getErrorProfile, getSkills } from './grammarRepository.js';
import { getScenario, listScenarios } from './dialogRepository.js';
import { getPromptById, listPrompts } from './outputRepository.js';

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
function resolveReading(lang, level, titles = [], maxCount = 2) {
  const all = listTexts(lang, level).filter((t) => !isListening(t));
  const byTitle = new Map(all.map((t) => [t.title.toLowerCase(), t]));
  const picked = [];
  for (const title of titles) {
    const hit = byTitle.get(String(title).toLowerCase());
    if (hit) picked.push({ id: hit.id, title: hit.title, level: hit.level });
  }
  // Fallback: level-passende Texte auffüllen
  for (const t of all) {
    if (picked.length >= maxCount) break;
    if (!picked.some((p) => p.id === t.id)) picked.push({ id: t.id, title: t.title, level: t.level });
  }
  return picked.slice(0, maxCount);
}

/**
 * Löst Hörtexte auf (metadata.kind === 'listening').
 */
function resolveListening(lang, level, titles = [], maxCount = 1) {
  const all = listTexts(lang, level).filter((t) => isListening(t));
  const byTitle = new Map(all.map((t) => [t.title.toLowerCase(), t]));
  const picked = [];
  for (const title of titles) {
    const hit = byTitle.get(String(title).toLowerCase());
    if (hit) picked.push({ id: hit.id, title: hit.title, level: hit.level });
  }
  for (const t of all) {
    if (picked.length >= maxCount) break;
    if (!picked.some((p) => p.id === t.id)) picked.push({ id: t.id, title: t.title, level: t.level });
  }
  return picked.slice(0, maxCount);
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
// Adaptivität (Skill- und Fehlerprofil-gesteuert)
// ---------------------------------------------------------------------------

// Basis-Gewichtung der Stufen für die Minutenverteilung
const STAGE_MINUTES = { input: 12, fokus: 8, output: 10, check: 4 };

// Welche Skills eine Stufe trainiert (für die Schwächengewichtung).
const STAGE_SKILLS = {
  input: ['reading', 'listening'],
  fokus: ['grammar', 'vocabulary'],
  output: ['writing', 'speaking'],
  check: []
};

// Wenn keine Skill-Daten vorliegen: neutraler Schwäche-Wert.
const NEUTRAL_WEAKNESS = 0.5;

/**
 * Berechnet aus Skill-Scores und Fehlerprofil eine adaptive Gewichtung.
 *
 * - Schwache Skills (niedriger Score) erhalten mehr Minuten ihrer Stufe.
 * - Dominierende Fehlerkategorien (errorTag) verschieben den Grammatik-Fokus
 *   auf Punkte mit passendem errorTag.
 *
 * @returns {{ weights: Record<string, number>, focusTags: string[] }}
 *   weights: Minuten-Gewicht je Stufen-Key (relativ, wird normalisiert).
 *   focusTags: Fehlerkategorien mit erhöhter Priorität (absteigend).
 */
export function computeAdaptivity(userLanguageId) {
  const skills = getSkills(userLanguageId) || {};
  const errorProfile = getErrorProfile(userLanguageId) || [];

  // Schwäche je Skill: 1 = sehr schwach, 0 = stark. Fehlend => neutral.
  const weaknessOf = (skill) => {
    const s = skills[skill];
    if (!s || typeof s.score !== 'number') return NEUTRAL_WEAKNESS;
    return Math.max(0, Math.min(1, (100 - s.score) / 100));
  };

  // Stufen-Gewicht: Basis-Minuten * (0,7 … 1,4) je mittlerer Schwäche.
  const weights = {};
  for (const [stage, skillsForStage] of Object.entries(STAGE_SKILLS)) {
    const base = STAGE_MINUTES[stage];
    if (skillsForStage.length === 0) {
      weights[stage] = base;
      continue;
    }
    const avgWeak =
      skillsForStage.reduce((a, s) => a + weaknessOf(s), 0) / skillsForStage.length;
    // Faktor 0.7 (stark) … 1.4 (sehr schwach)
    const factor = 0.7 + avgWeak * 0.7;
    weights[stage] = base * factor;
  }

  // Dominierende Fehlerkategorien: nur relevante, wiederkehrende Tags.
  const focusTags = errorProfile
    .filter((e) => e.count >= 2)
    .slice(0, 3)
    .map((e) => e.category);

  return { weights, focusTags };
}

/**
 * Normalisiert Stufen-Gewichte so, dass die Gesamtminuten nahe am Basiswert
 * bleiben (≈ Summe der STAGE_MINUTES) und jede Stufe >= 2 Minuten erhält.
 */
function normalizeMinutes(weights, targetTotal) {
  const keys = Object.keys(weights);
  const sum = keys.reduce((a, k) => a + weights[k], 0) || 1;
  const scaled = {};
  for (const k of keys) scaled[k] = (weights[k] / sum) * targetTotal;
  // Mindestabstand von 2 Minuten, Überschuss von der größten Stufe abziehen.
  for (const k of keys) {
    if (scaled[k] < 2) {
      const deficit = 2 - scaled[k];
      scaled[k] = 2;
      const donor = keys
        .filter((d) => d !== k)
        .sort((a, b) => scaled[b] - scaled[a])[0];
      if (donor) scaled[donor] = Math.max(2, scaled[donor] - deficit);
    }
  }
  for (const k of keys) scaled[k] = Math.round(scaled[k]);
  return scaled;
}

/**
 * Wählt Grammatikpunkte mit Fokus auf dominante Fehlerkategorien: erst
 * referenzierte Punkte, dann Punkte, deren errorTag zu focusTags passt.
 */
function resolveGrammarAdaptive(lang, level, pointIds = [], focusTags = [], maxCount = 2) {
  const picked = [];
  const seen = new Set();
  const push = (p) => {
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      picked.push({ id: p.id, title: p.title, level: p.level, errorTag: p.errorTag });
    }
  };
  // 1) explizit referenzierte Punkte
  for (const pid of pointIds) push(getPoint(lang, pid));
  // 2) Punkte, die dominante Fehler adressieren
  if (picked.length < maxCount && focusTags.length > 0) {
    const tagSet = new Set(focusTags);
    for (const p of listPoints(lang, level)) {
      if (picked.length >= maxCount) break;
      if (tagSet.has(p.errorTag)) push(p);
    }
  }
  // 3) Fallback: beliebige level-passende Punkte
  if (picked.length === 0) {
    for (const p of listPoints(lang, level)) {
      if (picked.length >= maxCount) break;
      push(p);
    }
  }
  return picked.slice(0, maxCount);
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
  if (cached) {
    return {
      ...cached,
      cached: true,
      stages: decorateStages(cached.stages, userLanguageId, cached.completed || [])
    };
  }

  const lang = ul.targetLang;
  const startLevel = ul.startCefr || 'A1';
  const targetLevel = ul.targetCefr || 'B1';

  const unit = selectUnit(lang, userLanguageId, startLevel, targetLevel);
  if (!unit) return { error: 'Kein Curriculum verfügbar' };

  const level = unit.level;
  const adaptivity = computeAdaptivity(userLanguageId);
  const stages = buildStages(lang, unit, adaptivity);
  const minutes = stages.reduce((a, s) => a + (s.minutes || 0), 0);

  const plan = {
    userLanguageId,
    date,
    unitId: unit.id,
    level,
    theme: unit.theme,
    goal: unit.goal,
    stages,
    minutes,
    adaptive: adaptivity.focusTags.length > 0 ? { focusTags: adaptivity.focusTags } : null
  };

  saveSession(userLanguageId, date, plan);
  return {
    ok: true,
    date,
    unit,
    stages: decorateStages(stages, userLanguageId, []),
    minutes,
    cached: false,
    adaptive: plan.adaptive
  };
}

function buildStages(lang, unit, adaptivity) {
  const level = unit.level;
  const { weights = STAGE_MINUTES, focusTags = [] } = adaptivity || {};
  const minutes = normalizeMinutes(
    { input: weights.input, fokus: weights.fokus, output: weights.output, check: weights.check },
    Object.values(STAGE_MINUTES).reduce((a, b) => a + b, 0)
  );

  // Item-Anzahl adaptiv: schwache Stufen bekommen mehr Items.
  const readingCount = weights.input > STAGE_MINUTES.input ? 2 : 1;
  const listeningCount = 1;
  const grammarCount = weights.fokus > STAGE_MINUTES.fokus ? 3 : 2;

  const reading = resolveReading(lang, level, unit.input?.reading || [], readingCount);
  const listening = resolveListening(lang, level, unit.input?.listening || [], listeningCount);
  const grammar = resolveGrammarAdaptive(lang, level, unit.fokus?.grammar || [], focusTags, grammarCount);
  const writing = resolveWriting(lang, level, unit.output?.writing || []);
  const speaking = resolveSpeaking(lang, level, unit.output?.speaking || []);

  const stages = [];

  // 1) INPUT
  stages.push({
    key: 'input',
    type: 'input',
    title: 'Verstehender Input',
    minutes: minutes.input,
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
    minutes: minutes.fokus,
    items: grammar.map((g) => ({ kind: 'grammar', ...g }))
  });

  // 3) OUTPUT (Schreiben + Sprechen)
  stages.push({
    key: 'output',
    type: 'output',
    title: 'Produktion',
    minutes: minutes.output,
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
    minutes: minutes.check,
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
 * Markiert eine Stufe der heutigen Sitzung als abgeschlossen – aber nur,
 * wenn alle Stufen davor abgeschlossen sind und alle Items der Stufe
 * nachweislich erledigt wurden (Quiz bestanden, Übung beantwortet, ...).
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
  let plan;
  try {
    completed = JSON.parse(row.completed || '[]');
    plan = JSON.parse(row.plan || '{}');
  } catch {
    completed = [];
    plan = {};
  }
  if (completed.includes(stageKey)) return { ok: true, date, completed };

  const stages = plan.stages || [];
  const idx = stages.findIndex((s) => s.key === stageKey);
  if (idx < 0) return { error: 'Unbekannte Stufe' };

  // Führung: Stufen nur der Reihe nach
  for (let i = 0; i < idx; i++) {
    if (!completed.includes(stages[i].key)) {
      return { error: `Bitte zuerst die Stufe „${stages[i].title}" abschließen.` };
    }
  }

  // Echte Prüfung: alle Items der Stufe erledigt?
  const pending = (stages[idx].items || []).filter((it) => !isItemDone(userLanguageId, it, completed));
  if (pending.length > 0) {
    return {
      error: `Noch ${pending.length} Aufgabe(n) offen – bitte zuerst vollständig bearbeiten.`,
      pending: pending.map((p) => ({ kind: p.kind, id: p.id }))
    };
  }

  completed.push(stageKey);
  db.prepare('UPDATE daily_sessions SET completed = ? WHERE id = ?').run(
    JSON.stringify(completed),
    row.id
  );

  return { ok: true, date, completed };
}

/**
 * Bestätigt eine Can-do-Aussage der Check-Stufe (Selbsteinschätzung).
 */
export function confirmCando(userLanguageId, userId, { candoId }) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  if (!candoId) return { error: 'candoId fehlt' };

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
  const key = `cando:${candoId}`;
  if (!completed.includes(key)) completed.push(key);
  db.prepare('UPDATE daily_sessions SET completed = ? WHERE id = ?').run(
    JSON.stringify(completed),
    row.id
  );
  return { ok: true, completed };
}

// ---------------------------------------------------------------------------
// Item-Status: wurde ein Item wirklich erledigt?
// ---------------------------------------------------------------------------

/**
 * Prüft die echte Erledigung eines Sitzungs-Items:
 *  - reading/listening: Quiz bestanden ODER Text manuell als gelesen markiert
 *  - grammar: mindestens ein Versuch auf den Grammatikpunkt
 *  - writing: Bewertungsversuch mit exakt diesem Prompt
 *  - speaking: Dialog-/Shadowing-Versuch mit exakt diesem Szenario
 *  - cando: per confirmCando bestätigt
 */
export function isItemDone(userLanguageId, item, completedList = []) {
  switch (item.kind) {
    case 'reading':
    case 'listening': {
      const quiz = getUserQuizResult(userLanguageId, item.id);
      if (quiz?.passed) return true;
      // Ohne Quiz (z. B. LLM offline und Fallback leer) reicht "gelesen".
      const hasQuiz = db
        .prepare('SELECT 1 FROM text_quizzes WHERE text_id = ? LIMIT 1')
        .get(item.id);
      if (hasQuiz) return false;
      const read = db
        .prepare(
          'SELECT 1 FROM user_text_progress WHERE user_language_id = ? AND text_id = ? AND completed_at IS NOT NULL LIMIT 1'
        )
        .get(userLanguageId, item.id);
      return !!read;
    }
    case 'grammar':
      return db
        .prepare(
          "SELECT 1 FROM attempts WHERE user_language_id = ? AND exercise_id LIKE ? ESCAPE '\\' LIMIT 1"
        )
        .get(userLanguageId, `${likeEscape(item.id)}#%`) !== undefined;
    case 'writing': {
      const promptJson = likeEscape(JSON.stringify(item.prompt).slice(1, -1));
      return (
        db
          .prepare(
            "SELECT 1 FROM attempts WHERE user_language_id = ? AND response LIKE ? ESCAPE '\\' AND response LIKE ? ESCAPE '\\' LIMIT 1"
          )
          .get(userLanguageId, '%"kind":"writing"%', `%"prompt":"${promptJson}"%`) !== undefined
      );
    }
    case 'speaking': {
      const sid = likeEscape(item.id);
      return (
        db
          .prepare(
            "SELECT 1 FROM attempts WHERE user_language_id = ? AND response LIKE ? ESCAPE '\\' AND response LIKE ? ESCAPE '\\' LIMIT 1"
          )
          .get(userLanguageId, '%"kind":"dialog"%', `%"scenarioId":"${sid}"%`) !== undefined
      );
    }
    case 'cando':
      return completedList.includes(`cando:${item.id}`);
    default:
      return false;
  }
}

function likeEscape(s) {
  return String(s).replace(/[%_\\]/g, (c) => `\\${c}`);
}

/**
 * Dekoriert Stufen-Items mit done-Flag und Stufen mit locked-Flag
 * (live, nicht aus dem Cache).
 */
function decorateStages(stages, userLanguageId, completed) {
  let locked = false;
  return (stages || []).map((s) => {
    const stageLocked = locked;
    const items = (s.items || []).map((it) => ({ ...it, done: isItemDone(userLanguageId, it, completed) }));
    const allDone = items.length === 0 || items.every((it) => it.done);
    if (!completed.includes(s.key)) locked = true;
    return { ...s, items, locked: stageLocked, allDone };
  });
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
