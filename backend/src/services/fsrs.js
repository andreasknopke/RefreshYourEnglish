/**
 * FSRS-5 Scheduler (Free Spaced Repetition Scheduler)
 *
 * Reine, zustandslose Implementierung des FSRS-5-Algorithmus
 * (open-spaced-repetition). Keine DB-, keine Sprachannahmen – dadurch vollständig
 * unit-testbar und sprachneutral. Der Review-Service persistiert das Ergebnis.
 *
 * Karten-Zustand:
 *   { state, stability, difficulty, reps, lapses, due_at, last_review }
 *   state: 'new' | 'learning' | 'review' | 'relearning'
 *
 * Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
 */

// FSRS-5 Default-Parameter (w), 19 Werte.
export const DEFAULT_PARAMS = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.4526, 3.6472, 0.196,
  0.125
];

export const RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };

// Retrievability-Kurve: R = (1 + FACTOR * t / S) ^ DECAY
export const DECAY = -0.5;
export const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // = 19/81

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// Kurzzeit-Schritte (Minuten) für Learning/Relearning.
const LEARNING_STEPS_MIN = [1, 10];

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * Retrievability (Erinnerungswahrscheinlichkeit) nach t Tagen bei Stabilität S.
 */
export function retrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (FACTOR * t) / stability, DECAY);
}

/**
 * Initiale Stabilität nach erstem Rating (1..4).
 */
export function initStability(rating, w = DEFAULT_PARAMS) {
  return Math.max(0.1, w[rating - 1]);
}

/**
 * Initiale Schwierigkeit nach erstem Rating (1..4), geclampt auf [1,10].
 */
export function initDifficulty(rating, w = DEFAULT_PARAMS) {
  const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  return clamp(d, 1, 10);
}

/**
 * Nächste Schwierigkeit nach Recall-Review mit Mean-Reversion.
 */
export function nextDifficulty(d, rating, w = DEFAULT_PARAMS) {
  const delta = -w[6] * (rating - 3);
  const nextD = d + delta;
  // Mean-Reversion Richtung D0(3)
  const reversionTarget = initDifficulty(3, w);
  const reverted = w[7] * reversionTarget + (1 - w[7]) * nextD;
  return clamp(reverted, 1, 10);
}

/**
 * Stabilität nach erfolgreichem Recall (Rating Hard/Good/Easy).
 */
export function nextRecallStability(
  s,
  d,
  r,
  rating,
  w = DEFAULT_PARAMS
) {
  const hardPenalty = rating === RATING.HARD ? w[15] : 1;
  const easyBonus = rating === RATING.EASY ? w[16] : 1;
  const factor =
    Math.exp(w[8]) *
    (11 - d) *
    Math.pow(s, -w[9]) *
    (Math.exp(w[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return s * (1 + factor);
}

/**
 * Stabilität nach Lapse (Rating Again in Review/Relearning).
 */
export function nextLapseStability(s, d, r, w = DEFAULT_PARAMS) {
  const lapse =
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp(w[14] * (1 - r));
  return Math.max(1, Math.min(lapse, s));
}

/**
 * Intervall (Tage) aus Stabilität bei gewünschter Einbehaltsrate.
 */
export function nextIntervalDays(stability, desiredRetention = 0.9) {
  const interval = (stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(interval));
}

/**
 * Leert eine neue Karte.
 */
export function createCard() {
  return {
    state: 'new',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    due_at: null,
    last_review: null
  };
}

/**
 * Führt einen Review aus und liefert den neuen Karten-Zustand plus Metadaten
 * für das Review-Log. Rein – verändert das Eingabeobjekt nicht.
 *
 * @param {object} card      aktueller Karten-Zustand
 * @param {number} rating    1..4
 * @param {number} now       Zeitstempel (ms) der Antwort
 * @param {object} opts      { params, desiredRetention }
 * @returns {{ card, intervalDays, elapsedDays, prevStability, nextStability, prevDifficulty, nextDifficulty }}
 */
export function review(card, rating, now = Date.now(), opts = {}) {
  const w = opts.params || DEFAULT_PARAMS;
  const desiredRetention = opts.desiredRetention ?? 0.9;

  if (!Number.isInteger(rating) || rating < 1 || rating > 4) {
    throw new Error(`Ungültiges Rating: ${rating}`);
  }

  const prevStability = card.stability;
  const prevDifficulty = card.difficulty;
  const elapsedDays = card.last_review
    ? Math.max(0, (now - card.last_review) / DAY_MS)
    : 0;

  const next = { ...card };
  let intervalDays = 0;
  let dueMs;

  if (card.state === 'new') {
    // Erste Begegnung
    next.stability = initStability(rating, w);
    next.difficulty = initDifficulty(rating, w);
    next.reps = 1;
    if (rating === RATING.AGAIN) {
      next.state = 'learning';
      dueMs = now + LEARNING_STEPS_MIN[0] * MINUTE_MS;
    } else {
      next.state = 'review';
      intervalDays = nextIntervalDays(next.stability, desiredRetention);
      dueMs = now + intervalDays * DAY_MS;
    }
  } else if (card.state === 'learning') {
    const r = retrievability(elapsedDays, next.stability || 0.1);
    next.difficulty = nextDifficulty(next.difficulty || initDifficulty(rating, w), rating, w);
    if (rating === RATING.AGAIN) {
      next.stability = Math.max(0.1, next.stability);
      dueMs = now + LEARNING_STEPS_MIN[0] * MINUTE_MS;
    } else if (rating === RATING.HARD) {
      dueMs = now + LEARNING_STEPS_MIN[0] * MINUTE_MS;
    } else {
      // Good/Easy → in Review überführen
      next.stability = nextRecallStability(
        next.stability || initStability(rating, w),
        next.difficulty,
        r,
        rating,
        w
      );
      next.state = 'review';
      intervalDays = nextIntervalDays(next.stability, desiredRetention);
      dueMs = now + intervalDays * DAY_MS;
    }
    next.reps = (card.reps || 0) + 1;
  } else {
    // review | relearning
    const r = retrievability(elapsedDays, next.stability || 1);
    next.difficulty = nextDifficulty(next.difficulty, rating, w);
    if (rating === RATING.AGAIN) {
      next.stability = nextLapseStability(next.stability, next.difficulty, r, w);
      next.lapses = (card.lapses || 0) + 1;
      next.state = 'relearning';
      dueMs = now + LEARNING_STEPS_MIN[0] * MINUTE_MS;
    } else {
      next.stability = nextRecallStability(next.stability, next.difficulty, r, rating, w);
      next.state = 'review';
      intervalDays = nextIntervalDays(next.stability, desiredRetention);
      dueMs = now + intervalDays * DAY_MS;
    }
    next.reps = (card.reps || 0) + 1;
  }

  next.stability = Number(next.stability.toFixed(6));
  next.difficulty = Number(next.difficulty.toFixed(6));
  next.last_review = now;
  next.due_at = dueMs;

  return {
    card: next,
    intervalDays,
    elapsedDays,
    prevStability,
    nextStability: next.stability,
    prevDifficulty,
    nextDifficulty: next.difficulty
  };
}

/**
 * Hilfsfunktion: formatiert einen ms-Zeitstempel als SQLite-DATETIME (UTC).
 */
export function toSqliteDateTime(ms) {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
}
