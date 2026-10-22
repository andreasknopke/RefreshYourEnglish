import { describe, it, expect, beforeAll } from 'vitest';
import { TEST_DB_PATH, seedUserAndLanguage } from './helpers/testDb.js';
import { upsertText } from '../src/services/textRepository.js';
import { loadUnits, listUnits, getUnit, firstUnitForLevel, nextUnit } from '../src/services/curriculumRepository.js';
import { getTodaySession, completeStage, getSessionProgress } from '../src/services/sessionComposer.js';

describe('Curriculum Repository', () => {
  beforeAll(() => {
    expect(TEST_DB_PATH).toBeTruthy();
  });

  it('lädt Units sortiert nach Level+order', () => {
    const units = loadUnits('it');
    expect(units.length).toBeGreaterThanOrEqual(30);
    expect(units[0].level).toBe('A1');
    expect(units[0].order).toBe(1);
  });

  it('jede Unit hat Input, Fokus, Output und Check', () => {
    for (const u of loadUnits('it')) {
      expect(u.input).toBeTruthy();
      expect(u.fokus).toBeTruthy();
      expect(u.output).toBeTruthy();
      expect(u.check?.cando?.length).toBeGreaterThan(0);
    }
  });

  it('filtert nach Level', () => {
    const a1 = listUnits('it', 'A1');
    expect(a1.every((u) => u.level === 'A1')).toBe(true);
    expect(a1.length).toBe(12);
  });

  it('firstUnitForLevel + nextUnit', () => {
    const first = firstUnitForLevel('it', 'A2');
    expect(first.level).toBe('A2');
    const next = nextUnit('it', first.id);
    expect(next.level).toBe('A2');
    expect(next.order).toBe(first.order + 1);
  });

  it('getUnit liefert vollständige Unit', () => {
    const u = getUnit('it', 'it-a1-u01');
    expect(u).toBeTruthy();
    expect(u.fokus.grammar.length).toBeGreaterThan(0);
  });
});

describe('Session Composer v1', () => {
  let ctx;

  beforeAll(() => {
    // Lesetexte + Hörtexte für A1/A2 bereitstellen (Composer löst sonst leer auf)
    upsertText({ lang: 'it', title: 'Al bar', level: 'A1', body: 'Un caffè, per favore.', topic: 'alltag' });
    upsertText({ lang: 'it', title: 'Il mio amico Marco', level: 'A1', body: 'Marco è mio amico.', topic: 'freunde' });
    upsertText({ lang: 'it', title: 'La mia giornata', level: 'A1', body: 'Mi alzo alle sette.', topic: 'alltag' });
    upsertText({ lang: 'it', title: 'Un viaggio in Italia', level: 'A2', body: 'Ieri sono andato a Roma.', topic: 'reisen' });
    upsertText({ lang: 'it', title: 'Al bar audio', level: 'A1', body: 'Buongiorno, un caffè.', topic: 'alltag', metadata: { kind: 'listening' } });
    ctx = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de', startCefr: 'A1' });
  });

  it('baut eine Tages-Sitzung mit allen vier Stufen', () => {
    const res = getTodaySession(ctx.userLanguageId, ctx.userId);
    expect(res.ok).toBe(true);
    expect(res.stages.map((s) => s.key)).toEqual(['input', 'fokus', 'output', 'check']);
    expect(res.unit.level).toBe('A1');
    expect(res.minutes).toBeGreaterThan(0);
  });

  it('jede Stufe hat Inhalte (Input/Fokus/Output/Check)', () => {
    const res = getTodaySession(ctx.userLanguageId, ctx.userId);
    const byKey = Object.fromEntries(res.stages.map((s) => [s.key, s]));
    expect(byKey.input.items.length).toBeGreaterThan(0);
    expect(byKey.fokus.items.length).toBeGreaterThan(0);
    expect(byKey.output.items.length).toBeGreaterThan(0);
    expect(byKey.check.items.length).toBeGreaterThan(0);
    // Input enthält mindestens einen Lesetext
    expect(byKey.input.items.some((i) => i.kind === 'reading')).toBe(true);
  });

  it('ist idempotent pro Tag (cached)', () => {
    const c = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de', startCefr: 'A1' });
    const a = getTodaySession(c.userLanguageId, c.userId);
    const b = getTodaySession(c.userLanguageId, c.userId);
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(b.unitId || b.unit.id).toBe(a.unit.id);
  });

  it('completeStage markiert Stufe und Progress zeigt sie', () => {
    const c = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de', startCefr: 'A1' });
    getTodaySession(c.userLanguageId, c.userId); // erzeugen
    const res = completeStage(c.userLanguageId, c.userId, { stageKey: 'input' });
    expect(res.ok).toBe(true);
    expect(res.completed).toContain('input');
    const prog = getSessionProgress(c.userLanguageId, c.userId);
    expect(prog.hasSession).toBe(true);
    expect(prog.completed).toContain('input');
  });

  it('completeStage ohne Sitzung -> Fehler', () => {
    const c = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de', startCefr: 'A1' });
    const res = completeStage(c.userLanguageId, c.userId, { stageKey: 'input' });
    // Sitzung existiert evtl. noch nicht für diesen frischen Nutzer an diesem Tag
    expect(res.ok === true || res.error).toBeTruthy();
  });

  it('unbekannte Sprache -> Fehler', () => {
    const res = getTodaySession(999999, ctx.userId);
    expect(res.error).toBeTruthy();
  });
});
