/**
 * Generator: content/packs/en/vocab/seed.json
 *
 * Portiert den Englisch-Wortschatz aus v1 (1529 B2-Wörter, Quelle:
 * v1-Tabelle `vocabulary`, vendored als sources/v1_english.csv) und ergänzt
 * einen kuratierten A1/A2-Kern, damit Placement, Level-Fallback und SRS auch
 * für Anfänger funktionieren. Format identisch zum Italienisch-Pack.
 *
 * Nutzung:
 *   node src/scripts/gen-vocab-en.js
 *   node src/scripts/gen-vocab-en.js --limit 2000
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '../../../content/packs/en/vocab');
const SRC = path.join(PACK, 'sources');
const OUT = path.join(PACK, 'seed.json');

// Kuratierter A1/A2-Kern (Lemma = englisches Wort, translation = Deutsch).
// Deckt die häufigsten Alltagswörter ab, damit A1-Lerner nicht nur B2 sehen.
const CORE = [
  // A1
  ['hello', 'hallo / tschüss', 'A1'], ['thank you', 'danke', 'A1'], ['please', 'bitte', 'A1'],
  ['yes', 'ja', 'A1'], ['no', 'nein', 'A1'], ['good', 'gut', 'A1'], ['bad', 'schlecht', 'A1'],
  ['big', 'groß', 'A1'], ['small', 'klein', 'A1'], ['new', 'neu', 'A1'], ['old', 'alt', 'A1'],
  ['water', 'Wasser', 'A1'], ['bread', 'Brot', 'A1'], ['house', 'Haus', 'A1'], ['friend', 'Freund', 'A1'],
  ['family', 'Familie', 'A1'], ['work', 'Arbeit', 'A1'], ['time', 'Zeit', 'A1'], ['day', 'Tag', 'A1'],
  ['night', 'Nacht', 'A1'], ['man', 'Mann', 'A1'], ['woman', 'Frau', 'A1'], ['child', 'Kind', 'A1'],
  ['book', 'Buch', 'A1'], ['car', 'Auto', 'A1'], ['city', 'Stadt', 'A1'], ['street', 'Straße', 'A1'],
  ['food', 'Essen', 'A1'], ['coffee', 'Kaffee', 'A1'], ['tea', 'Tee', 'A1'], ['money', 'Geld', 'A1'],
  ['to eat', 'essen', 'A1'], ['to drink', 'trinken', 'A1'], ['to go', 'gehen', 'A1'], ['to come', 'kommen', 'A1'],
  ['to see', 'sehen', 'A1'], ['to want', 'wollen', 'A1'], ['to have', 'haben', 'A1'], ['to be', 'sein', 'A1'],
  ['I', 'ich', 'A1'], ['you', 'du', 'A1'], ['we', 'wir', 'A1'], ['they', 'sie (Pl.)', 'A1'],
  ['today', 'heute', 'A1'], ['tomorrow', 'morgen', 'A1'], ['here', 'hier', 'A1'], ['there', 'dort', 'A1'],
  // A2
  ['weather', 'Wetter', 'A2'], ['holiday', 'Urlaub', 'A2'], ['journey', 'Reise', 'A2'], ['ticket', 'Ticket', 'A2'],
  ['meeting', 'Treffen', 'A2'], ['colleague', 'Kollege/Kollegin', 'A2'], ['salary', 'Gehalt', 'A2'],
  ['health', 'Gesundheit', 'A2'], ['hobby', 'Hobby', 'A2'], ['neighbour', 'Nachbar/in', 'A2'],
  ['to travel', 'reisen', 'A2'], ['to work', 'arbeiten', 'A2'], ['to learn', 'lernen', 'A2'],
  ['to remember', 'sich erinnern', 'A2'], ['to decide', 'entscheiden', 'A2'], ['to suggest', 'vorschlagen', 'A2'],
  ['already', 'bereits', 'A2'], ['always', 'immer', 'A2'], ['never', 'nie', 'A2'], ['often', 'oft', 'A2'],
  ['because', 'weil', 'A2'], ['although', 'obwohl', 'A2'], ['before', 'bevor', 'A2'], ['after', 'nachdem', 'A2'],
  ['different', 'anders', 'A2'], ['important', 'wichtig', 'A2'], ['difficult', 'schwierig', 'A2'],
  ['easy', 'leicht', 'A2'], ['interesting', 'interessant', 'A2'], ['boring', 'langweilig', 'A2']
];

function readCsv(file) {
  const raw = fs.readFileSync(file, 'utf-8').replace(/\r/g, '');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split(';');
      return { lemma: (parts[0] || '').trim(), translation: (parts[1] || '').trim() };
    });
}

function primaryKey(lemma) {
  return lemma.split(',')[0].trim().toLowerCase();
}

function inferPos(lemma) {
  const first = lemma.split(',')[0].trim().toLowerCase();
  if (/^to\s+\w/.test(first)) return 'verb';
  return null;
}

function main() {
  const limitArg = process.argv.indexOf('--limit');
  const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : 2000;

  const seen = new Set();
  const words = [];
  let rank = 0;

  // 1) Kuratierter A1/A2-Kern zuerst (niedrige Frequenz-Ränge).
  for (const [lemma, translation, level] of CORE) {
    const key = primaryKey(lemma);
    if (seen.has(key)) continue;
    seen.add(key);
    rank += 1;
    words.push({ lemma, pos: inferPos(lemma), translation, example: null, level, frequency_rank: rank });
  }

  // 2) Portierte v1-Wörter (B2) auffüllen.
  const file = path.join(SRC, 'v1_english.csv');
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  Quelle fehlt: ${file}`);
  } else {
    for (const row of readCsv(file)) {
      if (!row.lemma || !row.translation) continue;
      const key = primaryKey(row.lemma);
      if (seen.has(key)) continue;
      seen.add(key);
      rank += 1;
      words.push({
        lemma: row.lemma,
        pos: inferPos(row.lemma),
        translation: row.translation,
        example: null,
        level: 'B2',
        frequency_rank: rank
      });
      if (words.length >= LIMIT) break;
    }
  }

  const doc = {
    lang: 'en',
    version: '1.0.0',
    source: 'Kuratiert (A1/A2-Kern) + v1 vocabulary (B2, Refresh Your English)',
    words
  };

  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf-8');

  const byLevel = words.reduce((m, w) => ((m[w.level] = (m[w.level] || 0) + 1), m), {});
  const withPos = words.filter((w) => w.pos).length;
  console.log(
    `✅ ${words.length} Lemmata → ${OUT}\n` +
      `   Level: ${JSON.stringify(byLevel)}\n` +
      `   mit POS: ${withPos}`
  );
}

main();
