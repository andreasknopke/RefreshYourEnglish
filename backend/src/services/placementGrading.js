/**
 * Placement-Bewertung (rein, ohne DB) – dadurch direkt testbar.
 *
 * MVP ohne LLM:
 *   - mc / listen : exakter Vergleich mit item.answer
 *   - produce     : Keyword-Treffer + Mindestwortanzahl (Heuristik)
 */

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[„“"'’`.!?,;:]/g, '')
    .trim();
}

/**
 * Bewertet eine Antwort auf ein Item.
 * @returns {boolean} korrekt?
 */
export function gradeAnswer(item, response) {
  if (!item) return false;

  if (item.type === 'mc' || item.type === 'listen') {
    return normalize(response) === normalize(item.answer);
  }

  if (item.type === 'produce') {
    const text = normalize(response);
    if (!text) return false;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < (item.minWords || 3)) return false;
    const keywords = item.keywords || [];
    if (keywords.length === 0) return words.length >= (item.minWords || 3);
    return keywords.some((k) => text.includes(normalize(k)));
  }

  return false;
}
