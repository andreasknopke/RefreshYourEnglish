import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { TEST_DB_PATH, seedUserAndLanguage } from './helpers/testDb.js';
import { upsertText } from '../src/services/textRepository.js';
import { getUnit } from '../src/services/curriculumRepository.js';
import {
  getTodaySession,
  curateTodaySession
} from '../src/services/sessionComposer.js';
import {
  gatherLearnerState,
  curateSession,
  getCuratorReport
} from '../src/services/curatorService.js';
import { dismissPlacement, getUserLanguage } from '../src/services/userLanguageService.js';
import { getPlacementStatus } from '../src/services/placementService.js';

describe('Neue Features: Kurator + Tagesminuten + Placement-Dismiss', () => {
  beforeAll(() => {
    expect(TEST_DB_PATH).toBeTruthy();
    // Content für A1 bereitstellen
    upsertText({ lang: 'it', title: 'Testtext A1', level: 'A1', body: 'Ciao, come stai?', topic: 'alltag' });
    upsertText({ lang: 'it', title: 'Testtext A1b', level: 'A1', body: 'Buongiorno a tutti.', topic: 'alltag' });
  });

  describe('Tagesminuten steuern die Sitzungs-Länge', () => {
    it('15 Minuten → kürzere Sitzung als 30 Minuten', () => {
      const { userId, userLanguageId } = seedUserAndLanguage({ targetLang: 'it' });

      // 15 Minuten setzen
      const conn = new Database(TEST_DB_PATH);
      conn.prepare('UPDATE user_languages SET daily_minutes = 15 WHERE id = ?').run(userLanguageId);
      conn.close();

      const session = getTodaySession(userLanguageId, userId);
      expect(session.ok).toBe(true);
      // 15 Min Budget → deutlich unter 30
      expect(session.minutes).toBeLessThanOrEqual(15);
      expect(session.minutes).toBeGreaterThanOrEqual(10);
    });

    it('60 Minuten → längere Sitzung als 15 Minuten', () => {
      const { userId, userLanguageId } = seedUserAndLanguage({ targetLang: 'it' });

      const conn = new Database(TEST_DB_PATH);
      conn.prepare('UPDATE user_languages SET daily_minutes = 60 WHERE id = ?').run(userLanguageId);
      conn.close();

      const session = getTodaySession(userLanguageId, userId);
      expect(session.ok).toBe(true);
      expect(session.minutes).toBeGreaterThanOrEqual(55);
    });
  });

  describe('KI-Kurator', () => {
    it('gatherLearnerState liefert vollständigen Lernzustand', () => {
      const { userLanguageId } = seedUserAndLanguage({ targetLang: 'it' });
      const state = gatherLearnerState(userLanguageId);
      expect(state).toBeTruthy();
      expect(state.targetLang).toBe('it');
      expect(state.dailyMinutes).toBe(30);
      expect(state.availableItems).toBeTruthy();
      expect(Array.isArray(state.completedUnits)).toBe(true);
    });

    it('curateSession fällt ohne LLM_API_KEY auf Fallback zurück', async () => {
      const { userId, userLanguageId } = seedUserAndLanguage({ targetLang: 'it' });
      // API-Key sicher entfernen, damit der Fallback-Pfad deterministisch ist
      const prevKey = process.env.LLM_API_KEY;
      delete process.env.LLM_API_KEY;
      try {
        const result = await curateSession(userLanguageId, userId);
        expect(result.ok).toBe(true);
        expect(result.source).toBe('fallback');
      } finally {
        if (prevKey) process.env.LLM_API_KEY = prevKey;
      }
    });

    it('curateTodaySession erzeugt einen gültigen Plan (Fallback)', async () => {
      const { userId, userLanguageId } = seedUserAndLanguage({ targetLang: 'it' });
      const prevKey = process.env.LLM_API_KEY;
      delete process.env.LLM_API_KEY;
      try {
        const result = await curateTodaySession(userLanguageId, userId);
        expect(result.ok).toBe(true);
        expect(result.source).toBe('fallback');
        expect(result.plan).toBeTruthy();
        expect(result.plan.unitId).toBeTruthy();
        expect(result.plan.stages).toHaveLength(4);
        // Plan-Format entspricht getTodaySession
        expect(result.plan.theme).toBeTruthy();
        expect(result.plan.level).toBeTruthy();
      } finally {
        if (prevKey) process.env.LLM_API_KEY = prevKey;
      }
    });

    it('getCuratorReport liest den gespeicherten Kurator-Plan', async () => {
      const { userId, userLanguageId } = seedUserAndLanguage({ targetLang: 'it' });
      const prevKey = process.env.LLM_API_KEY;
      delete process.env.LLM_API_KEY;
      try {
        await curateTodaySession(userLanguageId, userId);
        const report = getCuratorReport(userLanguageId, userId);
        expect(report.ok).toBe(true);
        expect(report.hasReport).toBe(true);
        expect(report.unitId).toBeTruthy();
      } finally {
        if (prevKey) process.env.LLM_API_KEY = prevKey;
      }
    });
  });

  describe('Placement-Dismiss', () => {
    it('dismissPlacement setzt den Flag und getPlacementStatus meldet dismissed', () => {
      const { userId, userLanguageId } = seedUserAndLanguage({ targetLang: 'it' });

      // Vorher: nicht dismissed
      let status = getPlacementStatus(userLanguageId);
      expect(status.done).toBe(false);
      expect(status.dismissed).toBe(false);

      // Dismiss
      const ok = dismissPlacement(userLanguageId, userId);
      expect(ok).toBe(true);

      // Nachher: dismissed
      status = getPlacementStatus(userLanguageId);
      expect(status.dismissed).toBe(true);

      // hydrate meldet placementDismissed
      const ul = getUserLanguage(userLanguageId, userId);
      expect(ul.placementDismissed).toBe(true);
    });

    it('dismissPlacement lehrt fremde Sprache ab', () => {
      const { userId, userLanguageId } = seedUserAndLanguage({ targetLang: 'it' });
      const other = seedUserAndLanguage({ targetLang: 'it' });
      const ok = dismissPlacement(other.userLanguageId, userId);
      expect(ok).toBe(false);
    });
  });
});
