/**
 * AI Curator Service
 *
 * Der KI-Kurator ist der "Lehrer" der App. Er analysiert den Fortschritt
 * des Lernenden (Skills, Fehlerprofil, Grammatik-Genauigkeit, Vokabel-
 * Statistik, kürzliche Versuche) und baut eine personalisierte Tages-
 * lektion. Er wählt konkrete Items aus (Lesetexte, Grammatikpunkte,
 * Schreib-Prompts, Sprech-Szenarien) und liefert eine didaktische
 * Begründung (Insight) auf Deutsch.
 *
 * Architektur:
 *   1. Learner State sammeln (DB-Abfragen)
 *   2. LLM-Aufruf über taskRunner (curator_plan Prompt)
 *   3. Validierung: alle referenzierten IDs müssen existieren
 *   4. Fallback: deterministischer Composer (bestehende Logik)
 *
 * Sprachneutral: alles über Pack-Code und Curriculum-Referenzen.
 */

import db from '../models/database.js';
import { getUserLanguage } from './userLanguageService.js';
import { loadUnits, getUnit } from './curriculumRepository.js';
import { listTexts } from './textRepository.js';
import { listPoints, getErrorProfile, getSkills, getGrammarAccuracy } from './grammarRepository.js';
import { listPrompts } from './outputRepository.js';
import { listScenarios } from './dialogRepository.js';
import { getVocabStats, countDue } from './vocabRepository.js';
import { runLLMTask } from '../llm/taskRunner.js';

// ---------------------------------------------------------------------------
// Learner State – sammelt alle relevanten Fortschrittsdaten
// ---------------------------------------------------------------------------

/**
 * Sammelt den vollständigen Lernzustand für den Kurator.
 *
 * @returns {{
 *   targetLang, nativeLang, startCefr, targetCefr, dailyMinutes,
 *   skills, errorProfile, grammarAccuracy, vocabStats,
 *   recentAttempts, completedUnits, availableItems
 * }}
 */
export function gatherLearnerState(userLanguageId) {
  const ul = getUserLanguage(userLanguageId);
  if (!ul) return null;

  const lang = ul.targetLang;
  const skills = getSkills(userLanguageId) || {};
  const errorProfile = getErrorProfile(userLanguageId) || [];
  const grammarAcc = getGrammarAccuracy(userLanguageId);
  const vocabStats = getVocabStats(userLanguageId);

  // Kürzliche Versuche (letzte 30) für Trend-Analyse
  const recentAttempts = db
    .prepare(
      `SELECT exercise_id, score, error_tags, created_at
       FROM attempts WHERE user_language_id = ?
       ORDER BY created_at DESC LIMIT 30`
    )
    .all(userLanguageId);

  // Abgeschlossene Units
  const completedUnits = getCompletedUnitIds(lang, userLanguageId);

  // Verfügbare Items je Kategorie (für den LLM-Kontext)
  const startLevel = ul.startCefr || 'A1';
  const targetLevel = ul.targetCefr || 'B1';
  const levels = levelsBetween(startLevel, targetLevel);

  const availableItems = {
    reading: collectReadingItems(lang, levels),
    listening: collectListeningItems(lang, levels),
    grammar: collectGrammarItems(lang, levels),
    writing: collectWritingItems(lang, levels),
    speaking: collectSpeakingItems(lang, levels)
  };

  return {
    targetLang: lang,
    nativeLang: ul.nativeLang,
    startCefr: startLevel,
    targetCefr: targetLevel,
    dailyMinutes: ul.dailyMinutes || 30,
    goalType: ul.goalType,
    interests: ul.interests || [],
    skills,
    errorProfile: errorProfile.map((e) => ({
      category: e.category,
      count: e.count,
      lastSeen: e.lastSeen
    })),
    grammarAccuracy: grammarAcc,
    vocabStats,
    dueCards: countDue(userLanguageId),
    recentAttempts: recentAttempts.map((a) => ({
      exerciseId: a.exercise_id,
      score: a.score,
      errorTags: safeParseArray(a.error_tags),
      createdAt: a.created_at
    })),
    completedUnits,
    availableItems
  };
}

function getCompletedUnitIds(lang, userLanguageId) {
  const completed = new Set();
  const units = loadUnits(lang);
  for (const unit of units) {
    const grammarIds = unit.fokus?.grammar || [];
    if (grammarIds.length === 0) continue;
    const practiced = grammarIds.filter((gid) => hasAttempt(userLanguageId, gid));
    if (practiced.length === grammarIds.length) completed.add(unit.id);
  }
  return [...completed];
}

function hasAttempt(userLanguageId, exerciseId) {
  const row = db
    .prepare('SELECT 1 FROM attempts WHERE user_language_id = ? AND exercise_id = ? LIMIT 1')
    .get(userLanguageId, exerciseId);
  return !!row;
}

function levelsBetween(start, target) {
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const si = Math.max(0, LEVELS.indexOf(start));
  const ti = Math.max(si, LEVELS.indexOf(target));
  return LEVELS.slice(si, ti + 1);
}

function collectReadingItems(lang, levels) {
  const items = [];
  for (const level of levels) {
    for (const t of listTexts(lang, level)) {
      if (isListeningText(t)) continue;
      items.push({ id: t.id, title: t.title, level: t.level });
    }
  }
  return items.slice(0, 30);
}

function collectListeningItems(lang, levels) {
  const items = [];
  for (const level of levels) {
    for (const t of listTexts(lang, level)) {
      if (!isListeningText(t)) continue;
      items.push({ id: t.id, title: t.title, level: t.level });
    }
  }
  return items.slice(0, 15);
}

function collectGrammarItems(lang, levels) {
  const items = [];
  for (const level of levels) {
    for (const p of listPoints(lang, level)) {
      items.push({ id: p.id, title: p.title, level: p.level, errorTag: p.errorTag });
    }
  }
  return items.slice(0, 40);
}

function collectWritingItems(lang, levels) {
  const items = [];
  for (const level of levels) {
    for (const p of listPrompts(lang, { level, kind: 'writing' })) {
      items.push({ id: p.id, topic: p.topic, level: p.level });
    }
  }
  return items.slice(0, 15);
}

function collectSpeakingItems(lang, levels) {
  const items = [];
  for (const level of levels) {
    for (const s of listScenarios(lang, level)) {
      items.push({ id: s.id, title: s.title, level: s.level });
    }
  }
  return items.slice(0, 15);
}

function isListeningText(text) {
  if (!text.metadata) return false;
  try {
    const m = typeof text.metadata === 'string' ? JSON.parse(text.metadata) : text.metadata;
    return m?.kind === 'listening';
  } catch {
    return false;
  }
}

function safeParseArray(s) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Kurator: LLM-Aufruf + Validierung + Fallback
// ---------------------------------------------------------------------------

/**
 * Baut die personalisierte Tageslektion.
 *
 * @param {number} userLanguageId
 * @param {number} userId
 * @returns {{
 *   ok: boolean,
 *   plan: object|null,       // validierter Kurator-Plan
 *   insight: string|null,    // didaktische Begründung (Deutsch)
 *   source: 'llm'|'fallback',// woher der Plan stammt
 *   error?: string
 * }}
 */
export async function curateSession(userLanguageId, userId) {
  const state = gatherLearnerState(userLanguageId);
  if (!state) return { ok: false, error: 'Sprache nicht gefunden' };

  // LLM-Aufruf
  let llmResult;
  try {
    llmResult = await runLLMTask('curator_plan', 'v1', {
      learnerState: state
    });
  } catch (err) {
    return {
      ok: true,
      plan: null,
      insight: null,
      source: 'fallback',
      error: `Kurator-LLM-Fehler: ${err.message}`
    };
  }

  if (!llmResult.ok) {
    return {
      ok: true,
      plan: null,
      insight: null,
      source: 'fallback',
      error: llmResult.error
    };
  }

  // Validierung: alle referenzierten IDs müssen existieren
  const validated = validateCuratorPlan(llmResult.data, state);
  if (!validated.ok) {
    return {
      ok: true,
      plan: null,
      insight: llmResult.data.insight || null,
      source: 'fallback',
      error: `Kurator-Plan ungültig: ${validated.error}`
    };
  }

  return {
    ok: true,
    plan: validated.data,
    insight: validated.data.insight,
    source: 'llm'
  };
}

/**
 * Validiert den Kurator-Plan: alle IDs müssen in den verfügbaren Items
 * existieren, die Unit muss gültig sein, die Gewichte müssen sinnvoll sein.
 */
function validateCuratorPlan(plan, state) {
  if (!plan || typeof plan !== 'object') {
    return { ok: false, error: 'Kein Plan-Objekt' };
  }

  // Unit validieren
  const unitId = plan.unitId;
  if (!unitId || typeof unitId !== 'string') {
    return { ok: false, error: 'unitId fehlt' };
  }
  const unit = getUnit(state.targetLang, unitId);
  if (!unit) {
    return { ok: false, error: `Unbekannte Unit "${unitId}"` };
  }

  // Stage weights validieren
  const weights = plan.stageWeights || {};
  for (const key of ['input', 'fokus', 'output', 'check']) {
    const w = Number(weights[key]);
    if (!Number.isFinite(w) || w < 1 || w > 60) {
      return { ok: false, error: `Ungültiges stageWeight für "${key}": ${weights[key]}` };
    }
  }

  // Items validieren
  const available = state.availableItems;
  const items = plan.items || {};
  const validatedItems = {};

  const validateIds = (key, availableList, maxCount) => {
    const ids = Array.isArray(items[key]) ? items[key] : [];
    const valid = ids.filter((id) => availableList.some((a) => a.id === id));
    if (valid.length > maxCount) return valid.slice(0, maxCount);
    return valid;
  };

  validatedItems.reading = validateIds('reading', available.reading, 3);
  validatedItems.listening = validateIds('listening', available.listening, 2);
  validatedItems.grammar = validateIds('grammar', available.grammar, 4);
  validatedItems.writing = validateIds('writing', available.writing, 2);
  validatedItems.speaking = validateIds('speaking', available.speaking, 2);

  // Mindestens ein Item pro Hauptstufe
  if (validatedItems.reading.length === 0 && validatedItems.listening.length === 0) {
    return { ok: false, error: 'Keine gültigen Input-Items' };
  }
  if (validatedItems.grammar.length === 0) {
    return { ok: false, error: 'Keine gültigen Grammatik-Items' };
  }

  const insight = typeof plan.insight === 'string' ? plan.insight.slice(0, 500) : '';
  const focusTags = Array.isArray(plan.focusTags)
    ? plan.focusTags.filter((t) => typeof t === 'string').slice(0, 5)
    : [];

  return {
    ok: true,
    data: {
      unitId,
      stageWeights: weights,
      items: validatedItems,
      insight,
      focusTags
    }
  };
}

// ---------------------------------------------------------------------------
// Kurator-Report (für die UI)
// ---------------------------------------------------------------------------

/**
 * Liefert den letzten Kurator-Report für eine Sprache.
 * Wird aus dem daily_sessions-Plan gelesen.
 */
export function getCuratorReport(userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };

  const date = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare('SELECT plan FROM daily_sessions WHERE user_language_id = ? AND date = ?')
    .get(userLanguageId, date);

  if (!row) return { ok: true, hasReport: false };

  try {
    const plan = JSON.parse(row.plan);
    return {
      ok: true,
      hasReport: true,
      insight: plan.curatorInsight || null,
      source: plan.curatorSource || 'fallback',
      focusTags: plan.adaptive?.focusTags || [],
      unitId: plan.unitId,
      level: plan.level,
      theme: plan.theme
    };
  } catch {
    return { ok: true, hasReport: false };
  }
}
