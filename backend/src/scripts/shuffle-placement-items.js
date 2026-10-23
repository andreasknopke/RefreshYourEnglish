/**
 * Mischt die Optionen der Placement-Items (mc/listen) gleichmaessig ueber A-D.
 * Deterministisch per Item-ID -> stabil bei erneutem Ausfuehren.
 * Die Bewertung vergleicht Antwort-Texte, daher bleibt `answer` unveraendert.
 *
 * Aufruf: node backend/src/scripts/shuffle-placement-items.js [lang]
 *   (ohne Argument: alle Packs in content/packs/)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { shufflePlacementItem } from './shuffleUtil.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = path.resolve(__dirname, '../../../content/packs');

const langs = process.argv[2] ? [process.argv[2]] : fs.readdirSync(PACKS_DIR);

for (const lang of langs) {
  const file = path.join(PACKS_DIR, lang, 'placement', 'items.json');
  if (!fs.existsSync(file)) continue;
  const doc = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const items = doc.items || doc;
  let shuffled = 0;
  for (const item of items) {
    if (Array.isArray(item.options) && item.options.length >= 2) {
      shufflePlacementItem(item, `${lang}:${item.id}`);
      shuffled++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
  // Verteilung der richtigen Position berichten
  const dist = {};
  for (const item of items) {
    if (Array.isArray(item.options) && item.options.length >= 2) {
      const pos = item.options.indexOf(item.answer);
      dist[pos] = (dist[pos] || 0) + 1;
    }
  }
  console.log(`${lang}: ${shuffled} Items gemischt, Positionen der richtigen Antwort:`, dist);
}
