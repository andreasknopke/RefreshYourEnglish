/**
 * Seed: lädt Vokabeln aus content/packs/<lang>/vocab/seed.json in
 * vocab_items + vocab_senses. Idempotent (upsert über Lemma+Lang).
 *
 * Nutzung:
 *   node src/scripts/seed-vocab.js it
 *   node src/scripts/seed-vocab.js it en   (mehrere Sprachen)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { upsertVocabItem, addSense } from '../services/vocabRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKS_DIR = process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

function seedLang(lang) {
  const file = path.join(PACKS_DIR, lang, 'vocab', 'seed.json');
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  Kein Vokabel-Seed für "${lang}" (${file})`);
    return { items: 0, senses: 0 };
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const words = Array.isArray(data.words) ? data.words : [];

  let items = 0;
  let senses = 0;
  for (const w of words) {
    const item = upsertVocabItem({
      lang,
      lemma: w.lemma,
      pos: w.pos || null,
      gender: w.gender || null,
      ipa: w.ipa || null,
      frequencyRank: w.frequency_rank ?? null,
      level: w.level || null,
      audioUrl: w.audio_url || null,
      metadata: w.metadata || null
    });
    items += 1;
    if (w.translation) {
      addSense({
        vocabId: item.id,
        nativeLang: w.native_lang || 'de',
        translation: w.translation,
        example: w.example || null,
        notes: w.notes || null
      });
      senses += 1;
    }
  }
  return { items, senses };
}

function main() {
  const langs = process.argv.slice(2);
  const targets = langs.length > 0 ? langs : ['it'];
  for (const lang of targets) {
    const { items, senses } = seedLang(lang);
    console.log(`✅ ${lang}: ${items} Vokabeln, ${senses} Bedeutungen geseedet`);
  }
}

main();
