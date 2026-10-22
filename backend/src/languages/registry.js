/**
 * Language Pack Registry
 *
 * Lädt alle Manifeste aus content/packs/<code>/manifest.json, validiert sie
 * gegen das Pack-Schema und stellt sie sprachneutral bereit.
 *
 * Die Engine fragt hier nur nach `code` / Fähigkeiten – nie nach hartkodierten
 * Sprachnamen.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validatePack, normalizePack } from './packSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// content/ liegt auf Repo-Ebene neben backend/
const PACKS_DIR =
  process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

let cache = null;

/**
 * Lädt und validiert alle Packs. Fehlerhafte Packs werden übersprungen und
 * geloggt, damit ein kaputtes Pack die App nicht komplett lahmlegt.
 *
 * @param {boolean} forceReload - Ignoriert den Cache.
 * @returns {Map<string, object>} code -> normalisiertes Pack
 */
export function loadPacks(forceReload = false) {
  if (cache && !forceReload) {
    return cache;
  }

  const packs = new Map();

  if (!fs.existsSync(PACKS_DIR)) {
    console.warn(`⚠️ Language Packs Verzeichnis nicht gefunden: ${PACKS_DIR}`);
    cache = packs;
    return packs;
  }

  const entries = fs.readdirSync(PACKS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const manifestPath = path.join(PACKS_DIR, entry.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.warn(`⚠️ Kein manifest.json in Pack "${entry.name}" – übersprungen`);
      continue;
    }

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const pack = JSON.parse(raw);
      const { valid, errors } = validatePack(pack);

      if (!valid) {
        console.error(`❌ Pack "${entry.name}" ungültig:`, errors.join('; '));
        continue;
      }

      if (pack.code !== entry.name) {
        console.warn(
          `⚠️ Pack-Ordner "${entry.name}" != code "${pack.code}" – code gewinnt`
        );
      }

      packs.set(pack.code, normalizePack(pack));
    } catch (err) {
      console.error(`❌ Pack "${entry.name}" konnte nicht gelesen werden:`, err.message);
    }
  }

  cache = packs;
  console.log(`🌍 ${packs.size} Language Pack(s) geladen: ${[...packs.keys()].join(', ')}`);
  return packs;
}

/**
 * Gibt ein einzelnes Pack per Sprachcode zurück oder null.
 */
export function getPack(code) {
  return loadPacks().get(code) || null;
}

/**
 * Listet alle verfügbaren Packs (für GET /api/v2/languages).
 */
export function listPacks() {
  return [...loadPacks().values()];
}
