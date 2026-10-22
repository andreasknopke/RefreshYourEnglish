/**
 * User Language Service
 *
 * Verwaltet Zielsprachen-Profil (user_languages) und Skill-State pro Nutzer.
 * Mehrere parallele Zielsprachen sind erlaubt; genau eine ist aktiv.
 *
 * Folgt dem synchronen db.prepare-Muster der bestehenden Routen
 * (better-sqlite3). Für den PG-Pfad greift der db-Adapter.
 */

import db from '../models/database.js';
import { getPack } from '../languages/registry.js';

export const GOAL_TYPES = [
  'reisen',
  'alltag',
  'arbeit',
  'studium',
  'pruefung',
  'familie'
];

export const TARGET_CEFR = ['A2', 'B1', 'B2', 'C1'];
export const ALL_CEFR = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const SKILLS = [
  'reading',
  'listening',
  'speaking',
  'writing',
  'grammar',
  'vocabulary'
];

const DEFAULT_DAILY_MINUTES = [15, 30, 45, 60];

/**
 * Validiert ein Onboarding-Profil.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProfile({ targetLang, nativeLang, goalType, targetCefr, dailyMinutes, interests }) {
  const errors = [];

  if (!getPack(targetLang)) {
    errors.push(`Unbekannte Zielsprache "${targetLang}"`);
  }
  if (nativeLang && !/^[a-z]{2}$/.test(nativeLang)) {
    errors.push(`Ungültige Muttersprache "${nativeLang}"`);
  }
  if (goalType && !GOAL_TYPES.includes(goalType)) {
    errors.push(`Unbekannter Zieltyp "${goalType}"`);
  }
  if (targetCefr && !TARGET_CEFR.includes(targetCefr)) {
    errors.push(`Zielniveau "${targetCefr}" nicht erlaubt (A2-C1)`);
  }
  if (dailyMinutes != null) {
    const n = Number(dailyMinutes);
    if (!Number.isFinite(n) || n < 5 || n > 240) {
      errors.push(`Ungültiges Zeitbudget "${dailyMinutes}" (5-240 Min)`);
    }
  }
  if (interests != null && !Array.isArray(interests)) {
    errors.push('interests muss ein Array sein');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Legt eine neue Zielsprache für einen Nutzer an. Wenn der Nutzer noch keine
 * aktive Sprache hat, wird diese aktiv.
 */
export function createUserLanguage(userId, profile) {
  const {
    targetLang,
    nativeLang = 'de',
    goalType = null,
    targetCefr = null,
    startCefr = null,
    dailyMinutes = 30,
    deadline = null,
    interests = []
  } = profile;

  const hasActive = db
    .prepare('SELECT id FROM user_languages WHERE user_id = ? AND active = 1')
    .get(userId);

  const active = hasActive ? 0 : 1;

  const result = db
    .prepare(
      `INSERT INTO user_languages
        (user_id, target_lang, native_lang, goal_type, target_cefr, start_cefr, daily_minutes, deadline, interests, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      targetLang,
      nativeLang,
      goalType,
      targetCefr,
      startCefr,
      Number(dailyMinutes) || DEFAULT_DAILY_MINUTES[1],
      deadline,
      JSON.stringify(interests || []),
      active
    );

  const id = result.lastInsertRowid;
  initSkillState(id);
  return getUserLanguage(id);
}

/**
 * Initialisiert die sechs Skill-Zeilen für eine neue Sprache.
 */
export function initSkillState(userLanguageId) {
  const existing = db
    .prepare('SELECT COUNT(*) AS c FROM user_skill_state WHERE user_language_id = ?')
    .get(userLanguageId);
  if (existing && existing.c > 0) {
    return;
  }
  const stmt = db.prepare(
    'INSERT INTO user_skill_state (user_language_id, skill, score, cefr_band) VALUES (?, ?, 0, NULL)'
  );
  for (const skill of SKILLS) {
    stmt.run(userLanguageId, skill);
  }
}

/**
 * Liest eine Sprache (mit Skills) – nur wenn sie dem Nutzer gehört.
 */
export function getUserLanguage(userLanguageId, userId = null) {
  const row = db
    .prepare('SELECT * FROM user_languages WHERE id = ?')
    .get(userLanguageId);
  if (!row) {
    return null;
  }
  if (userId != null && row.user_id !== userId) {
    return null;
  }
  return hydrate(row);
}

/**
 * Listet alle Zielsprachen eines Nutzers.
 */
export function listUserLanguages(userId) {
  const rows = db
    .prepare('SELECT * FROM user_languages WHERE user_id = ? ORDER BY active DESC, created_at ASC')
    .all(userId);
  return rows.map(hydrate);
}

/**
 * Setzt die aktive Sprache eines Nutzers (Umschalter im Header).
 */
export function setActiveLanguage(userId, userLanguageId) {
  const owned = db
    .prepare('SELECT id FROM user_languages WHERE id = ? AND user_id = ?')
    .get(userLanguageId, userId);
  if (!owned) {
    return false;
  }
  db.prepare('UPDATE user_languages SET active = 0 WHERE user_id = ?').run(userId);
  db.prepare('UPDATE user_languages SET active = 1 WHERE id = ?').run(userLanguageId);
  return true;
}

/**
 * Aktualisiert Profilfelder (Onboarding-Nachbearbeitung / Einstellungen).
 */
export function updateUserLanguage(userId, userLanguageId, updates) {
  const owned = db
    .prepare('SELECT id FROM user_languages WHERE id = ? AND user_id = ?')
    .get(userLanguageId, userId);
  if (!owned) {
    return null;
  }

  const allowed = {
    goal_type: updates.goalType,
    target_cefr: updates.targetCefr,
    start_cefr: updates.startCefr,
    daily_minutes: updates.dailyMinutes,
    deadline: updates.deadline,
    interests: updates.interests != null ? JSON.stringify(updates.interests) : undefined
  };

  const sets = [];
  const values = [];
  for (const [col, val] of Object.entries(allowed)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      values.push(val);
    }
  }
  if (sets.length === 0) {
    return getUserLanguage(userLanguageId, userId);
  }

  values.push(userLanguageId);
  db.prepare(`UPDATE user_languages SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getUserLanguage(userLanguageId, userId);
}

/**
 * Speichert Einstufungs-/Skill-Ergebnisse.
 */
export function saveSkillState(userLanguageId, skillScores) {
  for (const [skill, value] of Object.entries(skillScores)) {
    if (!SKILLS.includes(skill)) continue;
    const score = clampScore(value.score);
    const band = ALL_CEFR.includes(value.cefr_band) ? value.cefr_band : null;
    db.prepare(
      `UPDATE user_skill_state SET score = ?, cefr_band = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_language_id = ? AND skill = ?`
    ).run(score, band, userLanguageId, skill);
  }
}

/**
 * Setzt das Startniveau nach der Einstufung.
 */
export function setStartCefr(userLanguageId, cefr) {
  if (!ALL_CEFR.includes(cefr)) return;
  db.prepare('UPDATE user_languages SET start_cefr = ? WHERE id = ?').run(cefr, userLanguageId);
}

function clampScore(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

function hydrate(row) {
  let interests = [];
  try {
    interests = row.interests ? JSON.parse(row.interests) : [];
  } catch {
    interests = [];
  }
  const skills = db
    .prepare('SELECT skill, score, cefr_band FROM user_skill_state WHERE user_language_id = ?')
    .all(row.id);

  return {
    id: row.id,
    userId: row.user_id,
    targetLang: row.target_lang,
    nativeLang: row.native_lang,
    goalType: row.goal_type,
    targetCefr: row.target_cefr,
    startCefr: row.start_cefr,
    dailyMinutes: row.daily_minutes,
    deadline: row.deadline,
    interests,
    active: !!row.active,
    createdAt: row.created_at,
    skills
  };
}
