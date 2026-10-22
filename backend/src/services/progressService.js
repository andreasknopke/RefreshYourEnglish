/**
 * Progress Dashboard (Phase 7)
 *
 * Aggregiert den Lernfortschritt einer Zielsprache zu einem Dashboard:
 *  - Skill-Profile (reading/listening/speaking/writing/grammar/vocabulary)
 *  - Fehlerprofil (dominante Fehlerkategorien)
 *  - Can-do-Report (abgeschlossene Units je Level + deren Can-do-Ziele)
 *  - Curriculum-Fortschritt (erledigte vs. gesamte Units je Level)
 *  - Vokabel-Statistik (FSRS-Zustände)
 *  - Aktivität (Sitzungen, Minuten, Versuche)
 *
 * Sprachneutral: alles über Pack-Code (targetLang) und Curriculum-Referenzen.
 */

import db from '../models/database.js';
import { getUserLanguage } from './userLanguageService.js';
import { getSkills, getErrorProfile, getGrammarAccuracy, getWritingAverage } from './grammarRepository.js';
import { getVocabStats } from './vocabRepository.js';
import { loadUnits } from './curriculumRepository.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const SKILL_LABELS = {
  reading: 'Leseverstehen',
  listening: 'Hörverstehen',
  speaking: 'Sprechen',
  writing: 'Schreiben',
  grammar: 'Grammatik',
  vocabulary: 'Wortschatz'
};

const ERROR_LABELS = {
  agreement: 'Kongruenz',
  tense: 'Zeitformen',
  preposition: 'Präpositionen',
  gender: 'Genus',
  spelling: 'Rechtschreibung',
  word_order: 'Wortstellung',
  lexis: 'Wortschatz/Ausdruck'
};

/**
 * Set abgeschlossener Unit-IDs (Unit gilt als behandelt, wenn alle ihre
 * Grammatikpunkte mindestens einmal geübt wurden).
 */
function completedUnitIds(lang, userLanguageId) {
  const completed = new Set();
  const units = loadUnits(lang);
  for (const unit of units) {
    const grammarIds = unit.fokus?.grammar || [];
    if (grammarIds.length === 0) continue;
    const practiced = grammarIds.filter((gid) => hasAttempt(userLanguageId, gid));
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
 * Baut das vollständige Dashboard für eine Zielsprache.
 *
 * @returns {{ ok, ... } | { error }}
 */
export function getProgress(userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };

  const lang = ul.targetLang;
  const skills = getSkills(userLanguageId);
  const errorProfile = getErrorProfile(userLanguageId);
  const grammarAcc = getGrammarAccuracy(userLanguageId);
  const writingAvg = getWritingAverage(userLanguageId);
  const vocab = getVocabStats(userLanguageId);

  // Skill-Array mit Labels + Stärken-/Schwächen-Einordnung.
  const skillList = Object.entries(SKILL_LABELS).map(([skill, label]) => {
    const s = skills[skill];
    const score = s && typeof s.score === 'number' ? s.score : null;
    return {
      skill,
      label,
      score,
      cefrBand: s ? s.cefrBand : null,
      band: scoreBand(score)
    };
  });

  // Fehlerprofil mit Labels, absteigend nach Häufigkeit.
  const totalErrors = errorProfile.reduce((a, e) => a + e.count, 0);
  const errorList = errorProfile.map((e) => ({
    category: e.category,
    label: ERROR_LABELS[e.category] || e.category,
    count: e.count,
    share: totalErrors > 0 ? e.count / totalErrors : 0,
    lastSeen: e.lastSeen
  }));

  // Curriculum-Fortschritt je Level + Can-do-Report.
  const completed = completedUnitIds(lang, userLanguageId);
  const allUnits = loadUnits(lang);
  const byLevel = {};
  const candoReport = [];
  for (const level of LEVELS) {
    const units = allUnits.filter((u) => u.level === level);
    if (units.length === 0) continue;
    const done = units.filter((u) => completed.has(u.id));
    byLevel[level] = {
      total: units.length,
      completed: done.length,
      percent: units.length ? Math.round((done.length / units.length) * 100) : 0
    };
    for (const u of done) {
      for (const c of u.check?.cando || []) {
        candoReport.push({ level, unit: u.theme, cando: c });
      }
    }
  }

  // Aktivität.
  const sessions = db
    .prepare('SELECT COUNT(*) AS c, COALESCE(SUM(minutes),0) AS m FROM daily_sessions WHERE user_language_id = ?')
    .get(userLanguageId);
  const attempts = db
    .prepare('SELECT COUNT(*) AS c FROM attempts WHERE user_language_id = ?')
    .get(userLanguageId);

  // Gesamtfortschritt Start->Ziel über alle Units im Zielband.
  const overall = overallProgress(allUnits, completed, ul.startCefr || 'A1', ul.targetCefr || 'B1');

  return {
    ok: true,
    userLanguageId,
    targetLang: lang,
    nativeLang: ul.nativeLang,
    startCefr: ul.startCefr,
    targetCefr: ul.targetCefr,
    goalType: ul.goalType,
    overall,
    skills: skillList,
    errorProfile: errorList,
    grammarAccuracy: grammarAcc,
    writingAverage: writingAvg,
    vocab,
    curriculum: byLevel,
    candoReport,
    activity: {
      sessions: sessions.c,
      minutes: sessions.m,
      attempts: attempts.c
    }
  };
}

function scoreBand(score) {
  if (score == null) return 'unbekannt';
  if (score >= 80) return 'stark';
  if (score >= 55) return 'mittel';
  return 'schwach';
}

function overallProgress(allUnits, completed, startLevel, targetLevel) {
  const startIdx = Math.max(0, LEVELS.indexOf(startLevel));
  const targetIdx = Math.max(startIdx, LEVELS.indexOf(targetLevel));
  const band = LEVELS.slice(startIdx, targetIdx + 1);
  const units = allUnits.filter((u) => band.includes(u.level));
  const done = units.filter((u) => completed.has(u.id)).length;
  return {
    levels: band,
    totalUnits: units.length,
    completedUnits: done,
    percent: units.length ? Math.round((done / units.length) * 100) : 0
  };
}

/**
 * Exportiert das Dashboard als JSON-Objekt (für Download).
 */
export function exportProgress(userLanguageId, userId) {
  const data = getProgress(userLanguageId, userId);
  if (data.error) return data;
  return {
    ok: true,
    exportedAt: new Date().toISOString(),
    format: 'refresh-your-english.progress.v1',
    data
  };
}
