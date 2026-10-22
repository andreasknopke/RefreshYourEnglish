/**
 * Aussprache-Bewertung – Stufe 1
 *
 * Rein deterministische Heuristik ohne LLM und ohne Audio-Analyse: Wir
 * vergleichen das STT-Transkript (Web Speech API) mit dem Referenzsatz und
 * bewerten Worttreffer, Dauer und Fluss.
 *
 * Stufe 1 beantwortet "Habe ich die Wörter richtig getroffen und in einem
 * natürlichen Tempo gesprochen?". Phonembasierte Detailbewertung ist als
 * spätere Stufe vorgesehen (capabilities.pronunciationScoring).
 *
 * Sprachneutral: Es werden nur Zeichenketten verglichen – keine Sprache ist
 * hartkodiert. Akzente werden zur Vergleichbarkeit normalisiert.
 */

// Komfortables Sprechtempo für Lernende (Wörter pro Sekunde)
const TARGET_WORDS_PER_SECOND = 2.6;
// Toleranzband für das Dauer-Verhältnis (Ist / Soll)
const DURATION_FAST_LIMIT = 0.5; // darunter: zu überhastet
const DURATION_SLOW_LIMIT = 1.7; // darüber: zu zögerlich

/**
 * Normalisiert einen Text für den Vergleich:
 * lowercase, Akzente entfernen, Interpunktion tilgen, Whitespace glätten.
 */
export function normalize(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining diacritics entfernen
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Interpunktion -> Leerzeichen
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/**
 * Multiset-Schnittmenge: zählt, wie viele Referenz-Wörter im Transkript
 * vorkommen (jedes höchstens so oft, wie es dort steht).
 */
function multisetIntersection(refTokens, hypTokens) {
  const counts = new Map();
  for (const t of hypTokens) counts.set(t, (counts.get(t) || 0) + 1);

  let matched = 0;
  const missing = [];
  for (const t of refTokens) {
    const c = counts.get(t) || 0;
    if (c > 0) {
      counts.set(t, c - 1);
      matched += 1;
    } else {
      missing.push(t);
    }
  }
  return { matched, missing };
}

/**
 * Dauer-Score (0–1): wie nah das Sprechtempo am Ziel liegt.
 */
function scoreDuration(durationMs, expectedMs) {
  // Keine / ungültige Dauer -> neutral bewerten (nicht bestrafen)
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0.7;
  if (!Number.isFinite(expectedMs) || expectedMs <= 0) return 0.7; // unbekanntes Soll -> neutral
  const ratio = durationMs / expectedMs;

  if (ratio >= DURATION_FAST_LIMIT && ratio <= DURATION_SLOW_LIMIT) {
    // Im Toleranzband: 1.0 in der Mitte, leicht abfallend zu den Rändern
    const center = 1.0;
    const halfSpan = (DURATION_SLOW_LIMIT - DURATION_FAST_LIMIT) / 2;
    const dist = Math.abs(ratio - center) / halfSpan; // 0..~1
    return Math.max(0.6, 1 - 0.35 * dist);
  }
  if (ratio < DURATION_FAST_LIMIT) {
    // zu schnell / vermutlich abgeschnitten
    return Math.max(0, ratio / DURATION_FAST_LIMIT) * 0.6;
  }
  // zu langsam
  const over = (ratio - DURATION_SLOW_LIMIT) / DURATION_SLOW_LIMIT;
  return Math.max(0.15, 0.7 - over);
}

/**
 * Bewertet einen Sprechversuch.
 *
 * @param {object} args
 * @param {string} args.reference - Referenzsatz in der Zielsprache
 * @param {string} args.transcript - STT-Ergebnis des Lernenden
 * @param {number} [args.durationMs] - gemessene Aufnahmedauer in ms
 * @returns {{
 *   ok: boolean,
 *   score: number,          // 0–100 Gesamt
 *   wordAccuracy: number,   // 0–1
 *   durationScore: number,  // 0–1
 *   fluency: number,        // 0–1
 *   matched: number,
 *   total: number,
 *   missing: string[],
 *   durationMs: number|null,
 *   expectedMs: number,
 *   level: string,          // qualitative Einordnung (Deutsch)
 *   empty: boolean
 * }}
 */
export function scorePronunciation({ reference, transcript, durationMs }) {
  const refTokens = tokenize(reference);
  const hypTokens = tokenize(transcript);

  const total = refTokens.length;
  const expectedMs = total > 0 ? Math.round((total / TARGET_WORDS_PER_SECOND) * 1000) : 0;

  // Leere Eingabe -> klarer Null-Score
  if (total === 0) {
    return {
      ok: false,
      error: 'Referenzsatz fehlt',
      score: 0,
      wordAccuracy: 0,
      durationScore: 0,
      fluency: 0,
      matched: 0,
      total: 0,
      missing: [],
      durationMs: durationMs ?? null,
      expectedMs: 0,
      level: 'keine Vorlage',
      empty: true
    };
  }

  const { matched, missing } = multisetIntersection(refTokens, hypTokens);
  const wordAccuracy = matched / total;
  const durationScore = scoreDuration(durationMs, expectedMs);

  // Leeres Transkript: klarer Null-Score (nichts gesprochen).
  if (hypTokens.length === 0) {
    return {
      ok: true,
      score: 0,
      wordAccuracy: 0,
      durationScore: 0,
      fluency: 0,
      matched: 0,
      total,
      missing: refTokens,
      durationMs: Number.isFinite(durationMs) ? Math.round(durationMs) : null,
      expectedMs,
      level: 'keine Aufnahme',
      empty: true
    };
  }

  // Fluss: Tempo-Score, verstärkt durch Worttreffer (flüssig = tempo-stabil
  // UND verständlich). Sehr niedrige Treffer drücken den Fluss zusätzlich.
  const fluency = clamp01(durationScore * (0.55 + 0.45 * wordAccuracy));

  // Gewichtung: Worttreffer dominieren, Dauer und Fluss ergänzen.
  const raw = 0.6 * wordAccuracy + 0.2 * durationScore + 0.2 * fluency;
  const score = Math.round(clamp01(raw) * 100);

  return {
    ok: true,
    score,
    wordAccuracy: round2(wordAccuracy),
    durationScore: round2(durationScore),
    fluency: round2(fluency),
    matched,
    total,
    missing,
    durationMs: Number.isFinite(durationMs) ? Math.round(durationMs) : null,
    expectedMs,
    level: levelLabel(score),
    empty: hypTokens.length === 0
  };
}

function levelLabel(score) {
  if (score >= 85) return 'hervorragend';
  if (score >= 70) return 'gut';
  if (score >= 50) return 'ansprechend';
  return 'Übungsbedarf';
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
