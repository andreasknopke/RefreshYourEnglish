import { describe, it, expect } from 'vitest';
import {
  createPlacementState,
  probabilityCorrect,
  updateAfterAnswer,
  selectNextItem,
  standardError,
  thetaToCefr,
  overallCefr,
  shouldStop,
  summarize,
  clampTheta,
  THETA_MIN,
  THETA_MAX
} from '../src/services/placementEngine.js';

const items = [
  { id: 'a', skill: 'reading', difficulty: -2.0 },
  { id: 'b', skill: 'reading', difficulty: -1.0 },
  { id: 'c', skill: 'reading', difficulty: 0.0 },
  { id: 'd', skill: 'reading', difficulty: 1.0 },
  { id: 'e', skill: 'grammar', difficulty: -1.5 },
  { id: 'f', skill: 'grammar', difficulty: 0.5 }
];

describe('probabilityCorrect', () => {
  it('ist 0.5 wenn theta = schwierigkeit', () => {
    expect(probabilityCorrect(0, 0)).toBeCloseTo(0.5);
  });
  it('steigt mit theta', () => {
    expect(probabilityCorrect(2, 0)).toBeGreaterThan(probabilityCorrect(-2, 0));
  });
});

describe('clampTheta', () => {
  it('begrenzt nach oben und unten', () => {
    expect(clampTheta(99)).toBe(THETA_MAX);
    expect(clampTheta(-99)).toBe(THETA_MIN);
  });
});

describe('updateAfterAnswer', () => {
  it('erhöht theta bei korrekter Antwort', () => {
    const s0 = createPlacementState(['reading']);
    const s1 = updateAfterAnswer(s0, items[2], true);
    expect(s1.answers.reading.theta).toBeGreaterThan(s0.answers.reading.theta);
    expect(s1.answered).toBe(1);
  });

  it('senkt theta bei falscher Antwort', () => {
    const s0 = createPlacementState(['reading']);
    const s1 = updateAfterAnswer(s0, items[2], false);
    expect(s1.answers.reading.theta).toBeLessThan(s0.answers.reading.theta);
  });

  it('mutiert den alten State nicht', () => {
    const s0 = createPlacementState(['reading']);
    updateAfterAnswer(s0, items[2], true);
    expect(s0.answers.reading.theta).toBe(0);
    expect(s0.answered).toBe(0);
  });

  it('merkt sich gesehene Items', () => {
    const s0 = createPlacementState(['reading']);
    const s1 = updateAfterAnswer(s0, items[2], true);
    expect(s1.answers.reading.seen).toContain('c');
  });
});

describe('selectNextItem', () => {
  it('wählt Item mit Schwierigkeit nahe theta', () => {
    const s0 = createPlacementState(['reading']);
    const it = selectNextItem(s0, items, 'reading');
    expect(it.id).toBe('c'); // theta 0 -> b=0
  });

  it('überspringt gesehene Items', () => {
    let s = createPlacementState(['reading']);
    s = updateAfterAnswer(s, items[2], true); // c gesehen
    const it = selectNextItem(s, items, 'reading');
    expect(it.id).not.toBe('c');
  });

  it('gibt null zurück wenn keine Items mehr', () => {
    let s = createPlacementState(['grammar']);
    s = updateAfterAnswer(s, items[4], true);
    s = updateAfterAnswer(s, items[5], true);
    expect(selectNextItem(s, items, 'grammar')).toBeNull();
  });
});

describe('standardError', () => {
  it('sinkt mit mehr Information', () => {
    let s = createPlacementState(['reading']);
    const before = standardError(s, 'reading');
    s = updateAfterAnswer(s, items[2], true);
    const after = standardError(s, 'reading');
    expect(after).toBeLessThan(before);
  });
  it('ist Infinity ohne Antworten', () => {
    const s = createPlacementState(['reading']);
    expect(standardError(s, 'reading')).toBe(Infinity);
  });
});

describe('thetaToCefr', () => {
  it('mappt theta auf Bänder', () => {
    expect(thetaToCefr(-2.5)).toBe('A1');
    expect(thetaToCefr(-1.0)).toBe('A2');
    expect(thetaToCefr(0.5)).toBe('B1');
    expect(thetaToCefr(2.0)).toBe('B2');
    expect(thetaToCefr(3.5)).toBe('C1');
  });
});

describe('overallCefr', () => {
  it('nutzt konservatives unteres Quartil', () => {
    let s = createPlacementState(['reading', 'grammar']);
    // alles korrekt -> hohes theta
    s = updateAfterAnswer(s, items[2], true);
    s = updateAfterAnswer(s, items[4], true);
    const cefr = overallCefr(s);
    expect(['A1', 'A2', 'B1']).toContain(cefr);
  });
});

describe('shouldStop', () => {
  it('stoppt nicht vor minItems', () => {
    let s = createPlacementState(['reading']);
    s = updateAfterAnswer(s, items[2], true);
    expect(shouldStop(s, { minItems: 8 })).toBe(false);
  });
  it('stoppt bei maxItems', () => {
    let s = createPlacementState(['reading']);
    for (let i = 0; i < 25; i++) {
      const it = selectNextItem(s, items, 'reading') || items[2];
      s = updateAfterAnswer(s, it, i % 2 === 0);
    }
    expect(shouldStop(s, { maxItems: 20 })).toBe(true);
  });
});

describe('summarize', () => {
  it('liefert Skills mit theta, band, se, n', () => {
    let s = createPlacementState(['reading']);
    s = updateAfterAnswer(s, items[2], true);
    const sum = summarize(s);
    expect(sum.skills.reading).toHaveProperty('theta');
    expect(sum.skills.reading).toHaveProperty('cefr_band');
    expect(sum.skills.reading.n).toBe(1);
    expect(sum.overall).toBeTruthy();
  });
});
