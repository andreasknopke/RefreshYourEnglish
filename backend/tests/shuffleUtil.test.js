import { describe, it, expect } from 'vitest';
import {
  seededShuffle,
  shuffleMcExercise,
  shufflePlacementItem
} from '../src/scripts/shuffleUtil.js';

describe('shuffleUtil', () => {
  it('seededShuffle ist deterministisch', () => {
    const a = seededShuffle(['a', 'b', 'c', 'd'], 'seed1');
    const b = seededShuffle(['a', 'b', 'c', 'd'], 'seed1');
    expect(a).toEqual(b);
  });

  it('shuffleMcExercise entfernt Duplikate und behält die richtige Antwort', () => {
    const ex = { type: 'mc', s: 'x', o: ['veloca', 'veloci', 'veloce', 'veloca'], a: 2 };
    shuffleMcExercise(ex, 'test#0');
    const norm = ex.o.map((o) => o.toLowerCase());
    expect(new Set(norm).size).toBe(norm.length);
    expect(ex.o[ex.a]).toBe('veloce');
  });

  it('shuffleMcExercise: korrekte Antwort bleibt korrekt gemischt', () => {
    const ex = { type: 'mc', s: 'x', o: ['a', 'b', 'c', 'd'], a: 0 };
    shuffleMcExercise(ex, 'p#1');
    expect(ex.o[ex.a]).toBe('a');
    // deterministisch
    const ex2 = { type: 'mc', s: 'x', o: ['a', 'b', 'c', 'd'], a: 0 };
    shuffleMcExercise(ex2, 'p#1');
    expect(ex2.o).toEqual(ex.o);
  });

  it('shufflePlacementItem entfernt Duplikate, Antwort bleibt enthalten', () => {
    const item = { id: 'x', options: ['sei', 'sono', 'è', 'sono'], answer: 'è' };
    shufflePlacementItem(item, 'it:x');
    const norm = item.options.map((o) => o.toLowerCase());
    expect(new Set(norm).size).toBe(norm.length);
    expect(item.options).toContain('è');
  });

  it('shufflePlacementItem ist idempotent', () => {
    const item = { id: 'y', options: ['a', 'b', 'c', 'd'], answer: 'c' };
    shufflePlacementItem(item, 'it:y');
    const once = [...item.options];
    shufflePlacementItem(item, 'it:y');
    expect(item.options).toEqual(once);
  });
});
