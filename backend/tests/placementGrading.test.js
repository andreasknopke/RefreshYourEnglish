import { describe, it, expect } from 'vitest';
import { gradeAnswer, normalize } from '../src/services/placementGrading.js';

describe('normalize', () => {
  it('kleinschreibt, Interpunktion entfernt', () => {
    expect(normalize('  „Ciao, Mondo!“ ')).toBe('ciao mondo');
  });
});

describe('gradeAnswer: mc', () => {
  const item = { type: 'mc', answer: 'La' };
  it('korrekt bei exakter Antwort', () => {
    expect(gradeAnswer(item, 'La')).toBe(true);
  });
  it('ignoriert Groß-/Kleinschreibung und Interpunktion', () => {
    expect(gradeAnswer(item, ' la.')).toBe(true);
  });
  it('falsch bei abweichender Antwort', () => {
    expect(gradeAnswer(item, 'Il')).toBe(false);
  });
});

describe('gradeAnswer: listen', () => {
  const item = { type: 'listen', answer: "Vent'anni" };
  it('vergleicht mit audioText-Antwort', () => {
    expect(gradeAnswer(item, "vent'anni")).toBe(true);
  });
});

describe('gradeAnswer: produce', () => {
  it('korrekt mit Keyword und ausreichender Länge', () => {
    const item = { type: 'produce', keywords: ['mi chiamo'], minWords: 4 };
    expect(gradeAnswer(item, 'Mi chiamo Luca e ho venti anni')).toBe(true);
  });
  it('falsch ohne Keyword', () => {
    const item = { type: 'produce', keywords: ['mi chiamo'], minWords: 3 };
    expect(gradeAnswer(item, 'Luca ha venti anni oggi')).toBe(false);
  });
  it('falsch bei zu kurzer Antwort', () => {
    const item = { type: 'produce', keywords: ['ciao'], minWords: 5 };
    expect(gradeAnswer(item, 'Ciao')).toBe(false);
  });
  it('korrekt ohne Keywords wenn lang genug', () => {
    const item = { type: 'produce', keywords: [], minWords: 3 };
    expect(gradeAnswer(item, 'uno due tre quattro cinque')).toBe(true);
  });
  it('falsch bei leerer Antwort', () => {
    const item = { type: 'produce', keywords: ['ciao'], minWords: 1 };
    expect(gradeAnswer(item, '')).toBe(false);
  });
});

describe('gradeAnswer: unbekannte Items', () => {
  it('gibt false für null-Item', () => {
    expect(gradeAnswer(null, 'x')).toBe(false);
  });
  it('gibt false für unbekannten Typ', () => {
    expect(gradeAnswer({ type: 'exotic' }, 'x')).toBe(false);
  });
});
