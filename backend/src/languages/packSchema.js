/**
 * Language Pack Schema + Validator
 *
 * Ein Language Pack ist ein deklaratives, versioniertes Paket, das alles
 * Sprachspezifische beschreibt (Locales, Fähigkeiten, Content-Referenzen).
 * Die Lern-Engine selbst enthält keine hartkodierten Sprachcodes.
 *
 * Diese Datei ist bewusst dependency-frei (kein Zod), damit sie in Backend,
 * Tests und ggf. Build-Validierung identisch genutzt werden kann.
 */

export const PACK_SCHEMA_VERSION = 1;

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const REQUIRED_STRING_FIELDS = [
  'code',
  'name',
  'nativeName',
  'version',
  'direction',
  'script',
  'ttsLocale',
  'sttLocale'
];

const DIRECTIONS = ['ltr', 'rtl'];

/**
 * Prüft ein Major.Minor.Patch-Versionsstring.
 */
function isValidSemver(version) {
  return typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version);
}

/**
 * Prüft ein BCP-47-ähnliches Locale (z. B. "it-IT", "en-US", "de").
 */
function isValidLocale(locale) {
  return typeof locale === 'string' && /^[a-z]{2,3}(-[A-Za-z]{2,4})?(-[A-Z]{2})?$/.test(locale);
}

/**
 * Validiert ein Language-Pack-Manifest.
 *
 * @param {object} pack - Das zu prüfende Manifest.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePack(pack) {
  const errors = [];

  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return { valid: false, errors: ['Pack muss ein Objekt sein'] };
  }

  // Pflichtfelder
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof pack[field] !== 'string' || pack[field].trim() === '') {
      errors.push(`Pflichtfeld "${field}" fehlt oder ist leer`);
    }
  }

  // Sprachcode: 2-3 Kleinbuchstaben
  if (pack.code && !/^[a-z]{2,3}$/.test(pack.code)) {
    errors.push(`Ungültiger Sprachcode "${pack.code}" (erwartet 2-3 Kleinbuchstaben)`);
  }

  // Richtung
  if (pack.direction && !DIRECTIONS.includes(pack.direction)) {
    errors.push(`Ungültige direction "${pack.direction}" (erwartet ltr|rtl)`);
  }

  // Version
  if (pack.version && !isValidSemver(pack.version)) {
    errors.push(`Ungültige version "${pack.version}" (erwartet Major.Minor.Patch)`);
  }

  // Locales
  for (const localeField of ['ttsLocale', 'sttLocale']) {
    if (pack[localeField] && !isValidLocale(pack[localeField])) {
      errors.push(`Ungültiges ${localeField} "${pack[localeField]}"`);
    }
  }

  // Levels
  if (!Array.isArray(pack.levels) || pack.levels.length === 0) {
    errors.push('levels muss eine nicht-leere Liste sein');
  } else {
    for (const level of pack.levels) {
      if (!CEFR_LEVELS.includes(level)) {
        errors.push(`Unbekanntes CEFR-Level "${level}"`);
      }
    }
  }

  // Capabilities (optional, aber wenn vorhanden: Typ-Check)
  if (pack.capabilities !== undefined) {
    if (typeof pack.capabilities !== 'object' || pack.capabilities === null) {
      errors.push('capabilities muss ein Objekt sein');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Liefert die Standard-Capabilities, falls ein Pack sie nicht angibt.
 */
export function defaultCapabilities() {
  return {
    grammaticalGender: false,
    conjugation: false,
    pronunciationScoring: false,
    tokenization: 'whitespace'
  };
}

/**
 * Normalisiert ein valides Pack um Defaultwerte und Metadaten.
 */
export function normalizePack(pack) {
  return {
    ...pack,
    capabilities: { ...defaultCapabilities(), ...(pack.capabilities || {}) },
    schemaVersion: PACK_SCHEMA_VERSION
  };
}
