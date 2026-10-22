import { describe, it, expect } from 'vitest';
import {
  review,
  createCard,
  retrievability,
  initStability,
  initDifficulty,
  nextIntervalDays,
  nextRecallStability,
  nextLapseStability,
  DEFAULT_PARAMS,
  RATING,
  FACTOR,
  DECAY
} from '../src/services/fsrs.js';

const DAY = 24 * 60 * 60 * 1000;

describe('FSRS Grundlagen', () => {
  it('Retrievability ist 1 bei t=0 und fällt mit der Zeit', () => {
    expect(retrievability(0, 5)).toBeCloseTo(1, 5);
    expect(retrievability(5, 5)).toBeLessThan(1);
    expect(retrievability(30, 5)).toBeLessThan(retrievability(5, 5));
  });

  it('Retrievability bei t = S entspricht dem Zielwert ~0.9', () => {
    // Per Definition: bei t = S * (0.9^(1/DECAY)-1)/FACTOR ... bei t=S ist R ~ 0.9
    const r = retrievability(5, 5);
    expect(r).toBeGreaterThan(0.8);
    expect(r).toBeLessThan(0.95);
  });

  it('Init-Stabilität steigt mit dem Rating', () => {
    expect(initStability(RATING.AGAIN)).toBeLessThan(initStability(RATING.GOOD));
    expect(initStability(RATING.GOOD)).toBeLessThan(initStability(RATING.EASY));
  });

  it('Init-Schwierigkeit sinkt mit dem Rating und liegt in [1,10]', () => {
    expect(initDifficulty(RATING.AGAIN)).toBeGreaterThan(initDifficulty(RATING.EASY));
    for (const r of [1, 2, 3, 4]) {
      const d = initDifficulty(r);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it('nextIntervalDays wächst monoton mit der Stabilität', () => {
    expect(nextIntervalDays(1)).toBeLessThanOrEqual(nextIntervalDays(5));
    expect(nextIntervalDays(5)).toBeLessThan(nextIntervalDays(20));
    expect(nextIntervalDays(0.5)).toBeGreaterThanOrEqual(1);
  });
});

describe('FSRS Review-Transitions', () => {
  it('Neue Karte mit Good → review mit Intervall >= 1', () => {
    const now = Date.now();
    const { card, intervalDays } = review(createCard(), RATING.GOOD, now);
    expect(card.state).toBe('review');
    expect(intervalDays).toBeGreaterThanOrEqual(1);
    expect(card.reps).toBe(1);
    expect(card.due_at).toBeGreaterThan(now);
  });

  it('Neue Karte mit Again → learning', () => {
    const now = Date.now();
    const { card } = review(createCard(), RATING.AGAIN, now);
    expect(card.state).toBe('learning');
    expect(card.due_at).toBeGreaterThan(now);
  });

  it('Rating außerhalb 1..4 wirft', () => {
    expect(() => review(createCard(), 0)).toThrow();
    expect(() => review(createCard(), 5)).toThrow();
  });

  it('Lapse (Again in review) erhöht lapses und setzt relearning', () => {
    const now = Date.now();
    let { card } = review(createCard(), RATING.GOOD, now);
    const before = card;
    const later = now + 5 * DAY;
    const res = review(before, RATING.AGAIN, later);
    expect(res.card.state).toBe('relearning');
    expect(res.card.lapses).toBe(1);
    expect(res.card.stability).toBeLessThanOrEqual(before.stability);
  });

  it('Erfolgreiche Reviews erhöhen die Stabilität', () => {
    let card = createCard();
    let now = Date.now();
    card = review(card, RATING.GOOD, now).card;
    const s1 = card.stability;
    now += Math.round(nextIntervalDays(s1) * DAY);
    card = review(card, RATING.GOOD, now).card;
    const s2 = card.stability;
    expect(s2).toBeGreaterThan(s1);
  });

  it('Review verändert das Eingabeobjekt nicht (rein)', () => {
    const card = createCard();
    const snapshot = JSON.stringify(card);
    review(card, RATING.GOOD, Date.now());
    expect(JSON.stringify(card)).toBe(snapshot);
  });

  it('Hard gibt kürzeres Intervall als Easy (gleiche Karte)', () => {
    const now = Date.now();
    const base = review(createCard(), RATING.GOOD, now).card;
    const t = now + nextIntervalDays(base.stability) * DAY;
    const hard = review(base, RATING.HARD, t);
    const easy = review(base, RATING.EASY, t);
    expect(hard.intervalDays).toBeLessThan(easy.intervalDays);
  });
});

describe('FSRS 30-Tage-Simulation', () => {
  it('liefert plausible, wachsende Intervalle bei konsistentem Recall', () => {
    let card = createCard();
    let now = Date.now();
    const intervals = [];

    // 30 Tage, täglich gelernt, Antworten passend zur aktuellen Retrievability
    for (let day = 0; day < 30; day++) {
      // Bewerte "Good", wenn die Karte fällig ist (neu oder due_at erreicht)
      if (!card.due_at || now >= card.due_at) {
        const res = review(card, RATING.GOOD, now);
        if (res.intervalDays > 0) intervals.push(res.intervalDays);
        card = res.card;
      }
      now += DAY;
    }

    expect(intervals.length).toBeGreaterThanOrEqual(2);
    // Spätere Intervalle sollten im Trend länger sein als frühe
    const last = intervals[intervals.length - 1];
    const first = intervals[0];
    expect(last).toBeGreaterThan(first);
    // Plausibilitätsgrenze: kein absurd langes Intervall in 30 Tagen
    expect(last).toBeLessThan(120);
  });

  it('Vergessene Karten (Again) bleiben in kurzen Intervallen', () => {
    let card = createCard();
    let now = Date.now();
    card = review(card, RATING.GOOD, now).card;
    // Lapse
    now += 10 * DAY;
    const res = review(card, RATING.AGAIN, now);
    expect(res.intervalDays).toBe(0); // relearning → Minuten-Step
    expect(res.card.state).toBe('relearning');
  });
});

describe('FSRS Stabilitätsformeln', () => {
  it('nextRecallStability ist > vorherige Stabilität bei Recall', () => {
    const s = nextRecallStability(5, 5, 0.9, RATING.GOOD, DEFAULT_PARAMS);
    expect(s).toBeGreaterThan(5);
  });

  it('nextLapseStability ist <= vorherige Stabilität und >= 1', () => {
    const s = nextLapseStability(10, 5, 0.9, DEFAULT_PARAMS);
    expect(s).toBeLessThanOrEqual(10);
    expect(s).toBeGreaterThanOrEqual(1);
  });

  it('FACTOR und DECAY entsprechen der FSRS-Definition', () => {
    expect(DECAY).toBeCloseTo(-0.5, 6);
    expect(FACTOR).toBeCloseTo(19 / 81, 6);
  });
});
