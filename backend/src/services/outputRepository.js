/**
 * Output-Prompts Repository
 *
 * Lädt Schreib-/Sprech-Prompts eines Language Packs (Manifest-Feld
 * `outputPrompts`). Sprachneutral über Pack-Code.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPack } from '../languages/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_DIR =
  process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

const promptsCache = new Map();

export function loadPrompts(lang, forceReload = false) {
  if (promptsCache.has(lang) && !forceReload) {
    return promptsCache.get(lang);
  }
  const pack = getPack(lang);
  const rel = pack?.outputPrompts || `output/prompts.json`;
  const file = path.join(PACKS_DIR, lang, rel);

  let prompts = [];
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      prompts = Array.isArray(data.prompts) ? data.prompts : [];
    } else {
      console.warn(`⚠️ Keine Output-Prompts gefunden: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Output-Prompts "${file}" konnten nicht gelesen werden:`, err.message);
    prompts = [];
  }
  promptsCache.set(lang, prompts);
  return prompts;
}

export function getPromptById(lang, id) {
  return loadPrompts(lang).find((p) => p.id === id) || null;
}

/**
 * Prompts nach Level (und optional kind) filtern.
 */
export function listPrompts(lang, { level = null, kind = null } = {}) {
  return loadPrompts(lang).filter(
    (p) => (!level || p.level === level) && (!kind || p.kind === kind)
  );
}
