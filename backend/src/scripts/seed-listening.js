/**
 * Seed: lädt Hörtexte aus content/packs/<lang>/listening/seed.json in die
 * texts-Tabelle (metadata.kind = 'listening'). Idempotent über lang+title.
 *
 * Nutzung:
 *   node src/scripts/seed-listening.js it
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { upsertText } from '../services/textRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKS_DIR = process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

function seedLang(lang) {
  const file = path.join(PACKS_DIR, lang, 'listening', 'seed.json');
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  Kein Listening-Seed für "${lang}" (${file})`);
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
      metadata: { ...(t.metadata || {}), kind: 'listening' },
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
    console.log(`✅ ${lang}: ${n} Hörtexte geseedet`);
  }
}

main();
