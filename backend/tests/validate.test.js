import { describe, it, expect } from 'vitest';
import { validateContract } from '../src/llm/validate.js';

describe('validateContract: generate_sentence', () => {
  it('normalisiert native/target', () => {
    const r = validateContract('generate_sentence', {
      native: ' Ciao mondo ',
      target: 'Hello world'
    });
    expect(r.ok).toBe(true);
    expect(r.data).toEqual({ native: 'Ciao mondo', target: 'Hello world' });
  });

  it('toleriert de/en-Aliasse', () => {
    const r = validateContract('generate_sentence', { de: 'Hallo', en: 'Hi' });
    expect(r.ok).toBe(true);
    expect(r.data.native).toBe('Hallo');
  });

  it('lehnt fehlende Felder ab', () => {
    const r = validateContract('generate_sentence', { native: 'Hallo' });
    expect(r.ok).toBe(false);
  });
});

describe('validateContract: evaluate_writing', () => {
  it('begrenzt den Score auf 1-10', () => {
    const r = validateContract('evaluate_writing', { score: 42 });
    expect(r.data.score).toBe(10);
    const r2 = validateContract('evaluate_writing', { score: -3 });
    expect(r2.data.score).toBe(1);
  });

  it('filtert unbekannte Fehlertypen auf lexis', () => {
    const r = validateContract('evaluate_writing', {
      score: 7,
      errors: [{ span: 'x', type: 'quatsch', explanation: 'e', suggestion: 's' }]
    });
    expect(r.data.errors[0].type).toBe('lexis');
  });

  it('akzeptiert gültige Fehlertypen', () => {
    const r = validateContract('evaluate_writing', {
      score: 6,
      errors: [{ span: 'la casa', type: 'gender', explanation: 'e', suggestion: 'il casa' }]
    });
    expect(r.data.errors[0].type).toBe('gender');
  });

  it('validiert cefr_estimate', () => {
    expect(validateContract('evaluate_writing', { cefr_estimate: 'B1' }).data.cefr_estimate).toBe('B1');
    expect(validateContract('evaluate_writing', { cefr_estimate: 'Z9' }).data.cefr_estimate).toBeNull();
  });

  it('lehnt Nicht-Objekte ab', () => {
    expect(validateContract('evaluate_writing', null).ok).toBe(false);
  });

  it('meldet unbekannten Contract', () => {
    const r = validateContract('unbekannt', {});
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Unbekannter Contract');
  });
});
