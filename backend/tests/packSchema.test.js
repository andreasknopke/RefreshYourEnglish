import { describe, it, expect } from 'vitest';
import {
  validatePack,
  normalizePack,
  defaultCapabilities,
  CEFR_LEVELS
} from '../src/languages/packSchema.js';

const validPack = {
  code: 'it',
  name: 'Italienisch',
  nativeName: 'Italiano',
  version: '1.0.0',
  direction: 'ltr',
  script: 'latin',
  ttsLocale: 'it-IT',
  sttLocale: 'it-IT',
  levels: ['A1', 'A2', 'B1']
};

describe('validatePack', () => {
  it('akzeptiert ein gültiges Pack', () => {
    const { valid, errors } = validatePack(validPack);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('lehnt Nicht-Objekte ab', () => {
    expect(validatePack(null).valid).toBe(false);
    expect(validatePack([]).valid).toBe(false);
    expect(validatePack('it').valid).toBe(false);
  });

  it('meldet fehlende Pflichtfelder', () => {
    const { valid, errors } = validatePack({ code: 'it' });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('lehnt ungültigen Sprachcode ab', () => {
    const { valid, errors } = validatePack({ ...validPack, code: 'ITA' });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('Sprachcode'))).toBe(true);
  });

  it('lehnt ungültige direction ab', () => {
    const { valid } = validatePack({ ...validPack, direction: 'sideways' });
    expect(valid).toBe(false);
  });

  it('lehnt ungültige Version ab', () => {
    const { valid } = validatePack({ ...validPack, version: '1.0' });
    expect(valid).toBe(false);
  });

  it('lehnt ungültiges Locale ab', () => {
    const { valid } = validatePack({ ...validPack, ttsLocale: 'italienisch' });
    expect(valid).toBe(false);
  });

  it('lehnt leere Level-Liste ab', () => {
    const { valid } = validatePack({ ...validPack, levels: [] });
    expect(valid).toBe(false);
  });

  it('lehnt unbekanntes CEFR-Level ab', () => {
    const { valid } = validatePack({ ...validPack, levels: ['A1', 'X1'] });
    expect(valid).toBe(false);
  });

  it('CEFR_LEVELS enthält alle sechs Stufen', () => {
    expect(CEFR_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  });
});

describe('normalizePack', () => {
  it('setzt Default-Capabilities', () => {
    const p = normalizePack(validPack);
    expect(p.capabilities).toEqual(defaultCapabilities());
    expect(p.schemaVersion).toBe(1);
  });

  it('überschreibt Defaults mit angegebenen Capabilities', () => {
    const p = normalizePack({
      ...validPack,
      capabilities: { grammaticalGender: true }
    });
    expect(p.capabilities.grammaticalGender).toBe(true);
    expect(p.capabilities.conjugation).toBe(false);
  });
});
