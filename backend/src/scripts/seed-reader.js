/**
 * Seed: lädt Lesetexte aus content/packs/<lang>/reader/seed.json in
 * texts + text_segments. Idempotent (upsert über lang+title).
 *
 * Nutzung:
 *   node src/scripts/seed-reader.js it
 *   node src/scripts/seed-reader.js it en
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { upsertText } from '../services/textRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKS_DIR = process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

function seedLang(lang) {
  const file = path.join(PACKS_DIR, lang, 'reader', 'seed.json');
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  Kein Reader-Seed für "${lang}" (${file})`);
    return 0;
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const texts = Array.isArray(data.texts) ? data.texts : [];

  let count = 0;
  for (const t of texts) {
    upsertText({
      lang,
      title: t.title,
      level: t.level || null,
      body: t.body,
      source: t.source || 'curated',
      topic: t.topic || null,
      estMinutes: t.est_minutes || null,
      metadata: t.metadata || null,
      segments: t.segments || null
    });
    count += 1;
  }
  return count;
}

function main() {
  const langs = process.argv.slice(2);
  const targets = langs.length > 0 ? langs : ['it'];
  for (const lang of targets) {
    const n = seedLang(lang);
    console.log(`✅ ${lang}: ${n} Lesetexte geseedet`);
  }
}

main();
