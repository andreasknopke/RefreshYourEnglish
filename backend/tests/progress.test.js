import { describe, it, expect, beforeAll } from 'vitest';
import { TEST_DB_PATH, seedUserAndLanguage } from './helpers/testDb.js';
import { upsertSkill, bumpErrorProfile } from '../src/services/grammarRepository.js';
import { computeAdaptivity } from '../src/services/sessionComposer.js';
import { getProgress, exportProgress } from '../src/services/progressService.js';

describe('Session Composer – Adaptivität', () => {
  beforeAll(() => {
    expect(TEST_DB_PATH).toBeTruthy();
  });

  it('liefert neutrale Gewichte ohne Skill-/Fehlerdaten', () => {
    const ctx = seedUserAndLanguage({ targetLang: 'it', startCefr: 'A1' });
    const { weights, focusTags } = computeAdaptivity(ctx.userLanguageId);
    expect(weights.input).toBeGreaterThan(0);
    expect(weights.fokus).toBeGreaterThan(0);
    expect(weights.output).toBeGreaterThan(0);
    expect(weights.check).toBeGreaterThan(0);
    expect(focusTags).toEqual([]);
  });

  it('erhöht die Minuten schwacher Stufen gegenüber starken', () => {
    const ctx = seedUserAndLanguage({ targetLang: 'it', startCefr: 'A1' });
    // grammar/vocabulary stark, writing/speaking schwach
    upsertSkill(ctx.userLanguageId, 'grammar', 90);
    upsertSkill(ctx.userLanguageId, 'vocabulary', 90);
    upsertSkill(ctx.userLanguageId, 'writing', 20);
    upsertSkill(ctx.userLanguageId, 'speaking', 20);
    const { weights } = computeAdaptivity(ctx.userLanguageId);
    expect(weights.output).toBeGreaterThan(weights.fokus);
  });

  it('hebt dominante Fehlerkategorien als focusTags hervor', () => {
    const ctx = seedUserAndLanguage({ targetLang: 'it', startCefr: 'A1' });
    bumpErrorProfile(ctx.userLanguageId, 'tense', 'sono andato');
    bumpErrorProfile(ctx.userLanguageId, 'tense', 'ha fatto');
    bumpErrorProfile(ctx.userLanguageId, 'agreement', 'la bella');
    const { focusTags } = computeAdaptivity(ctx.userLanguageId);
    // nur Kategorien mit count >= 2
    expect(focusTags).toContain('tense');
    expect(focusTags).not.toContain('agreement');
  });
});

describe('Progress Dashboard', () => {
  let ctx;

  beforeAll(() => {
    ctx = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de', startCefr: 'A1' });
    upsertSkill(ctx.userLanguageId, 'reading', 72, 'A2');
    upsertSkill(ctx.userLanguageId, 'grammar', 40, 'A1');
    bumpErrorProfile(ctx.userLanguageId, 'tense', 'sono andato');
    bumpErrorProfile(ctx.userLanguageId, 'tense', 'ha fatto');
    bumpErrorProfile(ctx.userLanguageId, 'gender', 'il mano');
  });

  it('aggregiert Skills mit Labels und Bändern', () => {
    const p = getProgress(ctx.userLanguageId, ctx.userId);
    expect(p.ok).toBe(true);
    expect(p.skills).toHaveLength(6);
    const reading = p.skills.find((s) => s.skill === 'reading');
    expect(reading.score).toBe(72);
    expect(reading.band).toBe('mittel');
    const grammar = p.skills.find((s) => s.skill === 'grammar');
    expect(grammar.band).toBe('schwach');
  });

  it('liefert Fehlerprofil mit Labels und Anteilen', () => {
    const p = getProgress(ctx.userLanguageId, ctx.userId);
    expect(p.errorProfile.length).toBeGreaterThanOrEqual(2);
    const tense = p.errorProfile.find((e) => e.category === 'tense');
    expect(tense.count).toBe(2);
    expect(tense.label).toBeTruthy();
    expect(tense.share).toBeGreaterThan(0);
    // absteigend sortiert: tense (2) vor gender (1)
    expect(p.errorProfile[0].category).toBe('tense');
  });

  it('liefert Curriculum-Fortschritt und Gesamtfortschritt', () => {
    const p = getProgress(ctx.userLanguageId, ctx.userId);
    expect(p.curriculum.A1).toBeTruthy();
    expect(p.curriculum.A1.total).toBe(12);
    expect(p.overall.totalUnits).toBeGreaterThan(0);
    expect(p.overall.percent).toBeGreaterThanOrEqual(0);
    expect(p.overall.percent).toBeLessThanOrEqual(100);
  });

  it('exportProgress liefert formatierten JSON-Wrapper', () => {
    const e = exportProgress(ctx.userLanguageId, ctx.userId);
    expect(e.ok).toBe(true);
    expect(e.format).toBe('refresh-your-english.progress.v1');
    expect(e.exportedAt).toBeTruthy();
    expect(e.data.skills).toHaveLength(6);
  });

  it('gibt Fehler zurück, wenn Sprache nicht zum Nutzer gehört', () => {
    const bad = getProgress(ctx.userLanguageId, ctx.userId + 99999);
    expect(bad.error).toBeTruthy();
  });
});
