/**
 * Adaptive Placement Engine (1PL-Rasch / ELO-light)
 *
 * Reine, zustandslose Funktionen – kein DB-/I/O-Zugriff, dadurch vollständig
 * testbar. Der Zustand (theta je Skill, gesehene Items) wird vom Aufrufer
 * verwaltet und zurückgegeben.
 *
 * Modell:  P(korrekt | theta, b) = 1 / (1 + exp(-(theta - b)))
 * Update:  theta += K * (correct - P)          (Gradientenschritt)
 * SE:      1 / sqrt(sum P*(1-P))               (Fisher-Information)
 */

export const SKILLS = ['reading', 'listening', 'grammar', 'vocabulary', 'writing', 'speaking'];

// theta-Skala: grob -3 (A1) bis +4 (C2). b (Item-Schwierigkeit) auf derselben Skala.
export const THETA_MIN = -3;
export const THETA_MAX = 4.5;

const K = 0.6; // Lernrate des Gradientenschritts

export function clampTheta(t) {
  return Math.min(THETA_MAX, Math.max(THETA_MIN, t));
}

/**
 * Wahrscheinlichkeit einer korrekten Antwort (logistische Funktion).
 */
export function probabilityCorrect(theta, b) {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/**
 * Startzustand: theta = 0 pro Skill, keine Items gesehen.
 * @param {string[]} skills - zu testende Skills
 */
export function createPlacementState(skills = SKILLS) {
  const state = { answers: {}, itemsSeen: {}, answered: 0 };
  for (const skill of skills) {
    state.answers[skill] = { theta: 0, information: 0, seen: [] };
    state.itemsSeen[skill] = [];
  }
  return state;
}

/**
 * Wählt das nächste Item für einen Skill: das noch ungesehene Item, dessen
 * Schwierigkeit b am nächsten am aktuellen theta liegt (maximale Information).
 *
 * @returns {object|null} das Item oder null, wenn keine Items mehr übrig sind
 */
export function selectNextItem(state, items, skill) {
  const seen = new Set(state.answers[skill]?.seen || []);
  const theta = state.answers[skill]?.theta ?? 0;

  const candidates = items.filter((it) => it.skill === skill && !seen.has(it.id));
  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => Math.abs(a.difficulty - theta) - Math.abs(b.difficulty - theta));
  return candidates[0];
}

/**
 * Aktualisiert theta nach einer Antwort.
 * @param {object} state - Placement-State (wird geklont, nicht mutiert)
 * @param {object} item - das beantwortete Item (mit .skill, .difficulty, .id)
 * @param {boolean} correct
 * @returns {object} neuer State
 */
export function updateAfterAnswer(state, item, correct) {
  const next = structuredClone(state);
  const a = next.answers[item.skill];
  if (!a) {
    return next;
  }

  const p = probabilityCorrect(a.theta, item.difficulty);
  a.theta = clampTheta(a.theta + K * ((correct ? 1 : 0) - p));
  a.information += p * (1 - p);
  a.seen.push(item.id);
  next.answered += 1;
  return next;
}

/**
 * Standardfehler der theta-Schätzung für einen Skill.
 */
export function standardError(state, skill) {
  const info = state.answers[skill]?.information || 0;
  if (info <= 0) {
    return Infinity;
  }
  return 1 / Math.sqrt(info);
}

/**
 * Übersetzt theta in ein CEFR-Band.
 */
export function thetaToCefr(theta) {
  if (theta < -1.5) return 'A1';
  if (theta < -0.2) return 'A2';
  if (theta < 1.2) return 'B1';
  if (theta < 2.5) return 'B2';
  return 'C1';
}

/**
 * Gesamt-CEFR aus dem Median der Skill-thetas (konservativ: nimmt das
 * niedrigste Band, um Nutzer nicht zu überschätzen).
 */
export function overallCefr(state) {
  const thetas = Object.values(state.answers).map((a) => a.theta);
  if (thetas.length === 0) return 'A1';
  thetas.sort((x, y) => x - y);
  // unteres Quartil statt Median -> eher zu niedrig als zu hoch einstufen
  const lower = thetas[Math.floor(thetas.length * 0.25)];
  return thetaToCefr(lower);
}

/**
 * Abbruchregel: beenden, wenn genug Items beantwortet sind ODER alle Skills
 * hinreichend genau geschätzt sind (SE unter Schwelle).
 */
export function shouldStop(state, { minItems = 8, maxItems = 20, seThreshold = 0.6 } = {}) {
  if (state.answered >= maxItems) return true;
  if (state.answered < minItems) return false;

  const skills = Object.keys(state.answers);
  const allPrecise = skills.every((s) => standardError(state, s) <= seThreshold);
  return allPrecise;
}

/**
 * Fasst das Ergebnis für die Anzeige/Speicherung zusammen.
 */
export function summarize(state) {
  const skills = {};
  for (const [skill, a] of Object.entries(state.answers)) {
    skills[skill] = {
      theta: Number(a.theta.toFixed(2)),
      cefr_band: thetaToCefr(a.theta),
      se: Number(standardError(state, skill).toFixed(2)),
      n: a.seen.length
    };
  }
  return { answered: state.answered, skills, overall: overallCefr(state) };
}
