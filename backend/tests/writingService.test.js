import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { TEST_DB_PATH, seedUserAndLanguage } from './helpers/testDb.js';

// LLM-Provider mocken (kein echter Netzwerkaufruf)
vi.mock('../src/llm/provider.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    chatCompletion: vi.fn(),
    parseJsonResponse: actual.parseJsonResponse
  };
});

const { chatCompletion } = await import('../src/llm/provider.js');
const { getWritingTask, evaluateWriting, getWritingStats } = await import(
  '../src/services/writingService.js'
);

function llmJson(obj) {
  return { ok: true, content: JSON.stringify(obj) };
}

describe('Writing Service', () => {
  let ctx;

  beforeAll(() => {
    expect(TEST_DB_PATH).toBeTruthy();
    ctx = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de', startCefr: 'A2' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('erzeugt eine Aufgabe aus LLM-Antwort', async () => {
    chatCompletion.mockResolvedValueOnce(llmJson({ native: 'Mangio una mela.', target: 'Mangio una mela.' }));
    const res = await getWritingTask(ctx.userLanguageId, ctx.userId, { topic: 'essen' });
    expect(res.ok).toBe(true);
    expect(res.prompt).toBe('Mangio una mela.');
    expect(res.source).toBe('llm');
  });

  it('nutzt Fallback ohne LLM (Provider-Fehler)', async () => {
    chatCompletion.mockResolvedValueOnce({ ok: false, error: 'LLM_API_KEY ist nicht gesetzt' });
    const res = await getWritingTask(ctx.userLanguageId, ctx.userId);
    expect(res.ok).toBe(true);
    expect(res.source).toBe('fallback');
    expect(res.prompt).toBeTruthy();
  });

  it('bewertet Produktion und zählt Fehlerprofil hoch', async () => {
    chatCompletion.mockResolvedValueOnce(
      llmJson({
        score: 6,
        cefr_estimate: 'A2',
        corrected: 'Ho mangiato una mela.',
        errors: [
          { span: 'mangiato', type: 'agreement', explanation: 'Angleichung', suggestion: 'mangiata' },
          { span: 'ho', type: 'tense', explanation: 'Zeitform', suggestion: 'sono' }
        ],
        strengths: ['Wortschatz'],
        next_focus: 'Partizip-Angleichung üben'
      })
    );
    const res = await evaluateWriting(ctx.userLanguageId, ctx.userId, {
      prompt: 'Übersetze: Ich habe einen Apfel gegessen.',
      answer: 'Ho mangiato una mela'
    });
    expect(res.ok).toBe(true);
    expect(res.score).toBe(6);
    expect(res.errors.length).toBe(2);
    expect(res.cefrEstimate).toBe('A2');

    const stats = getWritingStats(ctx.userLanguageId, ctx.userId);
    const cats = stats.errorProfile.map((e) => e.category);
    expect(cats).toContain('agreement');
    expect(cats).toContain('tense');
  });

  it('Writing-Skill wird gesetzt', async () => {
    chatCompletion.mockResolvedValueOnce(
      llmJson({ score: 9, cefr_estimate: 'B1', corrected: '', errors: [], strengths: [], next_focus: '' })
    );
    await evaluateWriting(ctx.userLanguageId, ctx.userId, { answer: 'Buongiorno, come stai?' });
    const stats = getWritingStats(ctx.userLanguageId, ctx.userId);
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.average).toBeGreaterThan(0);
  });

  it('leere Antwort → Fehler', async () => {
    const res = await evaluateWriting(ctx.userLanguageId, ctx.userId, { answer: '   ' });
    expect(res.error).toBeDefined();
  });

  it('Fallback-Bewertung ohne LLM', async () => {
    chatCompletion.mockResolvedValueOnce({ ok: false, error: 'offline' });
    const res = await evaluateWriting(ctx.userLanguageId, ctx.userId, { answer: 'Ciao' });
    expect(res.ok).toBe(true);
    expect(res.source).toBe('fallback');
    expect(res.score).toBe(7);
  });
});
