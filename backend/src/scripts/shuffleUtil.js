/**
 * Deterministisches Mischen von Multiple-Choice-Optionen.
 *
 * Der Seed leitet sich aus der Item-/Point-ID ab, damit das Ergebnis stabil
 * ueber Regenerierungen und Reloads hinweg ist (Nutzer sehen nie zwei Ordnungen).
 */

// String -> 32-bit Hash (FNV-1a)
export function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 PRNG
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates-Shuffle mit Seed. Gibt eine neue Array zurueck.
 */
export function seededShuffle(arr, seedStr) {
  const rng = makeRng(hashSeed(seedStr));
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Mischt die Optionen eines mc-Experiments (o + a) deterministisch.
 * Entfernt vorher Duplikate (case-insensitiv) und stellt sicher, dass die
 * richtige Antwort erhalten bleibt. Mutiert und gibt das Exercise-Objekt
 * zurueck.
 */
export function shuffleMcExercise(exercise, seedStr) {
  if (exercise.type !== 'mc' || !Array.isArray(exercise.o) || exercise.o.length < 2) {
    return exercise;
  }
  const correct = exercise.o[exercise.a];
  // Duplikate entfernen, richtige Antwort hat Vorrang (erste Position)
  const seen = new Set([String(correct).trim().toLowerCase()]);
  const unique = [correct];
  for (const o of exercise.o) {
    const key = String(o).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(o);
  }
  if (unique.length < 2) return exercise;
  const shuffled = seededShuffle(unique, seedStr);
  exercise.a = shuffled.indexOf(correct);
  exercise.o = shuffled;
  return exercise;
}

/**
 * Mischt die Optionen eines Placement-Items (options + answer-String).
 * Die Bewertung vergleicht Antwort-Texte, daher bleibt `answer` unveraendert.
 */
export function shufflePlacementItem(item, seedStr) {
  if (!Array.isArray(item.options) || item.options.length < 2) return item;
  if (!item.options.includes(item.answer)) return item;
  // Duplikate entfernen (richtige Antwort hat Vorrang)
  const seen = new Set([String(item.answer).trim().toLowerCase()]);
  const unique = [item.answer];
  for (const o of item.options) {
    const key = String(o).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(o);
  }
  if (unique.length < 2) return item;
  // Kanonische Ausgangsordnung -> idempotent (mehrfaches Ausfuehren ist stabil)
  const canonical = unique.slice().sort((a, b) =>
    a === item.answer ? -1 : b === item.answer ? 1 : String(a).localeCompare(String(b))
  );
  item.options = seededShuffle(canonical, seedStr);
  return item;
}
