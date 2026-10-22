import { describe, it, expect } from 'vitest';
import { tokenize, computeCoverage } from '../src/services/readerService.js';

describe('Reader Tokenisierung', () => {
  it('zerlegt und normalisiert Wörter', () => {
    const t = tokenize('Ciao, come stai? Bene!');
    expect(t).toContain('ciao');
    expect(t).toContain('come');
    expect(t).toContain('stai');
    expect(t).toContain('bene');
    expect(t).not.toContain('');
  });

  it('entfernt Satzzeichen', () => {
    expect(tokenize('mela, pera;')).toEqual(['mela', 'pera']);
  });
});

describe('Coverage-Check', () => {
  const known = new Set(['ciao', 'come', 'stai']);

  it('kennt 0 Wörter → Coverage 0', () => {
    const cov = computeCoverage('mela pera acqua', new Set());
    expect(cov.coverage).toBe(0);
    expect(cov.unknown.length).toBe(3);
  });

  it('kennt alle Wörter → Coverage 1', () => {
    const cov = computeCoverage('ciao come stai', known);
    expect(cov.coverage).toBe(1);
    expect(cov.known).toBe(3);
  });

  it('Stopwords zählen nicht in die Wertung', () => {
    // "il" ist Stopword → nur "ciao" zählt
    const cov = computeCoverage('il ciao', known);
    expect(cov.total).toBe(1);
    expect(cov.coverage).toBe(1);
  });

  it('teilweise bekannt → gemischte Coverage', () => {
    const cov = computeCoverage('ciao mela', known);
    expect(cov.known).toBe(1);
    expect(cov.unknown).toContain('mela');
    expect(cov.coverage).toBeCloseTo(0.5, 2);
  });

  it('Flexion wird über Wortstamm erkannt', () => {
    // "mangiare" bekannt → "mangio" (Stamm "mang") sollte matchen
    const cov = computeCoverage('mangio', new Set(['mangiare']));
    expect(cov.known).toBe(1);
  });

  it('leerer Text → Coverage 1 (nichts unbekannt)', () => {
    const cov = computeCoverage('', known);
    expect(cov.coverage).toBe(1);
    expect(cov.total).toBe(0);
  });
});
