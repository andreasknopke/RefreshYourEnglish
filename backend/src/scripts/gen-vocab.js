/**
 * Generator: content/packs/it/vocab/seed.json
 *
 * Führt drei offene italienische Wortlisten (Grund-/Ausbau-/Spezialwortschatz,
 * Quelle: giniedp/media_education, latin-1 CSVs, Format `lemma;bedeutung`) mit
 * den kuratierten Kern-Wörtern zusammen, die bereits Beispiele/POS/Level
 * tragen. Ergebnis: ~2500 Lemmata für den SRS-Vokabeltrainer.
 *
 * Sprachneutral im Sinne der Engine: nur Lemma + Übersetzung sind Pflicht;
 * POS/Level/Beispiel sind optional und werden nach Möglichkeit angereichert.
 *
 * Nutzung:
 *   node src/scripts/gen-vocab.js
 *   node src/scripts/gen-vocab.js --limit 2500
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '../../../content/packs/it/vocab');
const SRC = path.join(PACK, 'sources');
const OUT = path.join(PACK, 'seed.json');

// Reihenfolge = Priorität (frühe Listen bekommen niedrigere Frequenz-Ränge).
const SOURCES = [
  { file: 'grundwortschatz.csv', level: 'A1' },
  { file: 'ausbauwortschatz.csv', level: 'A2' },
  { file: 'spezialwortschatz.csv', level: 'B1' }
];

function readCsv(file) {
  const raw = fs.readFileSync(file, 'utf-8').replace(/\r/g, '');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const idx = l.indexOf(';');
      if (idx === -1) return { lemma: l, translation: '' };
      return { lemma: l.slice(0, idx).trim(), translation: l.slice(idx + 1).trim() };
    });
}

// Primärschlüssel: erster Komma-getrennter Lemma-Teil, normalisiert.
function primaryKey(lemma) {
  return lemma.split(',')[0].trim().toLowerCase();
}

// Leichte POS-Heuristik (nur infinitive Verben sind sicher).
function inferPos(lemma) {
  const first = lemma.split(',')[0].trim().toLowerCase();
  if (/(arsi|ersi|irsi)$/.test(first)) return 'verb'; // reflexiv
  if (/(are|ere|ire)$/.test(first)) return 'verb';
  return null;
}

function main() {
  const limitArg = process.argv.indexOf('--limit');
  const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : 2500;

  // Kuratierte Kern-Wörter (Beispiele/POS/Level) laden und nach Primärschlüssel indexieren.
  const curatedFile = path.join(PACK, 'curated.json');
  const curated = new Map();
  if (fs.existsSync(curatedFile)) {
    const data = JSON.parse(fs.readFileSync(curatedFile, 'utf-8'));
    for (const w of data.words || []) {
      curated.set(primaryKey(w.lemma), w);
    }
  }

  const seen = new Set();
  const words = [];
  let rank = 0;

  // 1) Kuratierte Wörter zuerst (sie tragen Beispiele).
  for (const w of curated.values()) {
    const key = primaryKey(w.lemma);
    if (seen.has(key)) continue;
    seen.add(key);
    rank += 1;
    words.push({
      lemma: w.lemma,
      pos: w.pos || inferPos(w.lemma) || null,
      translation: w.translation,
      example: w.example || null,
      level: w.level || 'A1',
      frequency_rank: rank
    });
  }

  // 2) Offene Listen in Prioritätsreihenfolge auffüllen.
  for (const src of SOURCES) {
    const file = path.join(SRC, src.file);
    if (!fs.existsSync(file)) {
      console.warn(`⚠️  Quelle fehlt: ${src.file}`);
      continue;
    }
    for (const row of readCsv(file)) {
      if (!row.lemma || !row.translation) continue;
      const key = primaryKey(row.lemma);
      if (seen.has(key)) continue;
      seen.add(key);
      rank += 1;
      const cur = curated.get(key);
      words.push({
        lemma: row.lemma,
        pos: (cur && cur.pos) || inferPos(row.lemma) || null,
        translation: row.translation,
        example: (cur && cur.example) || null,
        level: (cur && cur.level) || src.level,
        frequency_rank: rank
      });
      if (words.length >= LIMIT) break;
    }
    if (words.length >= LIMIT) break;
  }

  const doc = {
    lang: 'it',
    version: '2.0.0',
    source:
      'Kuratiert + giniedp/media_education (Grund-/Ausbau-/Spezialwortschatz, CC)',
    words
  };

  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf-8');

  const withExample = words.filter((w) => w.example).length;
  const withPos = words.filter((w) => w.pos).length;
  const byLevel = words.reduce((m, w) => ((m[w.level] = (m[w.level] || 0) + 1), m), {});
  console.log(
    `✅ ${words.length} Lemmata → ${OUT}\n` +
      `   Level: ${JSON.stringify(byLevel)}\n` +
      `   mit Beispiel: ${withExample}, mit POS: ${withPos}`
  );
}

main();
