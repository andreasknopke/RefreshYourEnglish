import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { TEST_DB_PATH, seedUserAndLanguage } from './helpers/testDb.js';
import {
  listGrammarPoints,
  getGrammarPoint,
  answerExercise,
  getGrammarStats
} from '../src/services/grammarService.js';

describe('Grammar Service', () => {
  let ctx;

  beforeAll(() => {
    expect(TEST_DB_PATH).toBeTruthy();
    ctx = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de' });
  });

  it('listet Grammatikpunkte für Italienisch (mindestens 50)', () => {
    const res = listGrammarPoints(ctx.userLanguageId, ctx.userId);
    expect(res.error).toBeUndefined();
    expect(res.points.length).toBeGreaterThanOrEqual(50);
    expect(res.points[0]).toHaveProperty('id');
    expect(res.points[0]).toHaveProperty('exerciseCount');
  });

  it('filtert Punkte nach Level', () => {
    const res = listGrammarPoints(ctx.userLanguageId, ctx.userId, 'A1');
    expect(res.points.every((p) => p.level === 'A1')).toBe(true);
    expect(res.points.length).toBeGreaterThan(0);
  });

  it('liefert Punkt ohne Lösungen in den Übungen', () => {
    const res = getGrammarPoint(ctx.userLanguageId, ctx.userId, 'it-essere');
    expect(res.point.exercises.length).toBe(8);
    for (const ex of res.point.exercises) {
      expect(ex).not.toHaveProperty('a');
      expect(ex).not.toHaveProperty('ans');
    }
  });

  it('mc-Antwort richtig → correct true, kein Fehlerprofil', () => {
    // Richtige Position aus den Quelldaten ermitteln (Optionen sind gemischt)
    const src = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../content/packs/it/grammar/it_cefr.json'), 'utf-8')
    );
    const point = src.points.find((p) => p.id === 'it-essere');
    const ex = point.exercises[0];
    const res = answerExercise(ctx.userLanguageId, ctx.userId, {
      pointId: 'it-essere',
      exerciseIndex: 0,
      answer: ex.a
    });
    expect(res.correct).toBe(true);
    expect(res.errorTag).toBeNull();
    expect(res.expected).toBe('sono');
  });

  it('mc-Antwort falsch → correct false + Fehler-Tag', () => {
    const src = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../content/packs/it/grammar/it_cefr.json'), 'utf-8')
    );
    const point = src.points.find((p) => p.id === 'it-essere');
    const ex = point.exercises[0];
    const wrong = [0, 1, 2, 3].find((i) => i !== ex.a);
    const res = answerExercise(ctx.userLanguageId, ctx.userId, {
      pointId: 'it-essere',
      exerciseIndex: 0,
      answer: wrong
    });
    expect(res.correct).toBe(false);
    expect(res.errorTag).toBe('tense');
  });

  it('fill-Antwort richtig (Elision)', () => {
    const res = answerExercise(ctx.userLanguageId, ctx.userId, {
      pointId: 'it-art-determinativi',
      exerciseIndex: 6, // "___ occhio" → "L'"
      answer: "L'"
    });
    expect(res.correct).toBe(true);
  });

  it('fill-Antwort toleriert führenden Artikel', () => {
    // "La pizza è ___ (buono)" → Lösung "buona", Nutzer tippt "la buona"
    const res = answerExercise(ctx.userLanguageId, ctx.userId, {
      pointId: 'it-concordanza-agg',
      exerciseIndex: 4,
      answer: 'la buona'
    });
    expect(res.correct).toBe(true);
  });

  it('fill-Antwort falsch → Fehler-Tag gender', () => {
    const res = answerExercise(ctx.userLanguageId, ctx.userId, {
      pointId: 'it-art-determinativi',
      exerciseIndex: 6,
      answer: 'il'
    });
    expect(res.correct).toBe(false);
    expect(res.errorTag).toBe('gender');
  });

  it('unbekannter Punkt → Fehler', () => {
    const res = answerExercise(ctx.userLanguageId, ctx.userId, {
      pointId: 'gibt-es-nicht',
      exerciseIndex: 0,
      answer: 0
    });
    expect(res.error).toBeDefined();
  });

  it('Fehlerprofil sammelt Fehlertypen', () => {
    const stats = getGrammarStats(ctx.userLanguageId, ctx.userId);
    expect(stats.errorProfile.length).toBeGreaterThan(0);
    const cats = stats.errorProfile.map((e) => e.category);
    expect(cats).toContain('tense');
    expect(cats).toContain('gender');
    // Zähler sind gesetzt
    expect(stats.errorProfile.every((e) => e.count >= 1)).toBe(true);
  });

  it('Grammar-Skill wird aus Genauigkeit gesetzt', () => {
    const stats = getGrammarStats(ctx.userLanguageId, ctx.userId);
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.accuracy).toBeGreaterThan(0);
    expect(stats.accuracy).toBeLessThanOrEqual(1);
  });
});
