/**
 * Curriculum Repository
 *
 * Lädt die Curriculum-Units eines Language Packs (Manifest-Feld
 * `curriculumUnits`). Eine Unit bündelt Input (Lesen/Hören), Fokus
 * (Grammatik), Output (Schreiben/Sprechen) und Check (Can-do) zu einer
 * lernpfad-Station.
 *
 * Sprachneutral: lädt nur über Pack-Code und Manifest.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPack } from '../languages/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_DIR =
  process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const unitsCache = new Map();

export function levelRank(level) {
  const i = LEVEL_ORDER.indexOf(level);
  return i === -1 ? 0 : i;
}

/**
 * Lädt die Units einer Sprache aus dem Pack (nach level+order sortiert).
 */
export function loadUnits(lang, forceReload = false) {
  if (unitsCache.has(lang) && !forceReload) {
    return unitsCache.get(lang);
  }

  const pack = getPack(lang);
  const rel = pack?.curriculumUnits || `curriculum/units_a1_b1.json`;
  const file = path.join(PACKS_DIR, lang, rel);

  let units = [];
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      units = Array.isArray(data.units) ? data.units : [];
      units.sort(
        (a, b) => levelRank(a.level) - levelRank(b.level) || (a.order || 0) - (b.order || 0)
      );
    } else {
      console.warn(`⚠️ Keine Curriculum-Units gefunden: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Curriculum-Units "${file}" konnten nicht gelesen werden:`, err.message);
    units = [];
  }

  unitsCache.set(lang, units);
  return units;
}

/**
 * Kompakte Unit-Übersicht, optional nach Level gefiltert.
 */
export function listUnits(lang, level = null) {
  return loadUnits(lang)
    .filter((x) => !level || x.level === level)
    .map((x) => ({
      id: x.id,
      level: x.level,
      order: x.order,
      theme: x.theme,
      goal: x.goal
    }));
}

/**
 * Eine vollständige Unit.
 */
export function getUnit(lang, unitId) {
  return loadUnits(lang).find((x) => x.id === unitId) || null;
}

/**
 * Erste Unit auf einem Level (für den Einstieg).
 */
export function firstUnitForLevel(lang, level) {
  const units = loadUnits(lang).filter((x) => x.level === level);
  return units[0] || null;
}

/**
 * Unit, die auf eine gegebene Unit folgt (Pfad-Fortschritt).
 */
export function nextUnit(lang, unitId) {
  const units = loadUnits(lang);
  const i = units.findIndex((x) => x.id === unitId);
  if (i === -1 || i === units.length - 1) return null;
  return units[i + 1];
}
