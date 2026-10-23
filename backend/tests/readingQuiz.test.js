import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { TEST_DB_PATH, seedUserAndLanguage } from './helpers/testDb.js';
import { upsertText } from '../src/services/textRepository.js';
import Database from 'better-sqlite3';

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
const { getQuizForText, submitQuizForText, getTranslationForText } = await import(
  '../src/services/readerService.js'
);

function readText(lang, title) {
  const db = new Database(TEST_DB_PATH);
  const row = db.prepare('SELECT * FROM texts WHERE lang = ? AND title = ?').get(lang, title);
  db.close();
  return row;
}

function llmJson(obj) {
  return { ok: true, content: JSON.stringify(obj) };
}

describe('Reading Quiz + Übersetzung', () => {
  let ctx, text;

  beforeAll(() => {
    expect(TEST_DB_PATH).toBeTruthy();
    ctx = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de', startCefr: 'A2' });
    upsertText({
      lang: 'it',
      title: 'Quiz Testtext',
      level: 'A2',
      body: 'Ogni mattina Maria beve un caffè e mangia una briosa al bar vicino alla stazione.',
      topic: 'alltag'
    });
    text = readText('it', 'Quiz Testtext');
    expect(text).toBeTruthy();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('erzeugt ein Quiz per LLM und cached es', async () => {
    const quiz = {
      questions: [
        { q: 'Was trinkt Maria?', options: ['Kaffee', 'Tee', 'Wasser', 'Saft'], answer: 'Kaffee' },
        { q: 'Wo ist das Bar?', options: ['Bahnhof', 'Schule', 'Park', 'Strand'], answer: 'Bahnhof' }
      ]
    };
    chatCompletion.mockResolvedValueOnce(llmJson(quiz));
    const res = await getQuizForText(text.id, ctx.userLanguageId, ctx.userId);
    expect(res.questions.length).toBe(2);
    expect(res.source).toBe('llm');
    // Antworttexte dürfen nicht an den Client gehen
    expect(JSON.stringify(res)).not.toContain('"answer"');

    // Zweiter Aufruf: aus Cache, kein LLM-Call
    const res2 = await getQuizForText(text.id, ctx.userLanguageId, ctx.userId);
    expect(res2.source).toBe('cache');
    expect(chatCompletion).toHaveBeenCalledTimes(1);
  });

  it('besteht Quiz bei richtigen Antworten', async () => {
    const res = await getQuizForText(text.id, ctx.userLanguageId, ctx.userId);
    const answers = res.questions.map((q) =>
      q.q === 'Was trinkt Maria?' ? 'Kaffee' : 'Bahnhof'
    );
    const sub = submitQuizForText(text.id, ctx.userLanguageId, ctx.userId, { answers });
    expect(sub.ok).toBe(true);
    expect(sub.score).toBe(1);
    expect(sub.passed).toBe(true);

    // Attempt wird mitgeliefert
    const again = await getQuizForText(text.id, ctx.userLanguageId, ctx.userId);
    expect(again.attempt?.passed).toBe(true);
  });

  it('fällt bei falschen Antworten durch', async () => {
    const res = await getQuizForText(text.id, ctx.userLanguageId, ctx.userId);
    const answers = res.questions.map(() => 'Unsinn');
    const sub = submitQuizForText(text.id, ctx.userLanguageId, ctx.userId, { answers });
    expect(sub.passed).toBe(false);
    expect(sub.score).toBe(0);
  });

  it('lehrt falsche Antwortanzahl ab', async () => {
    const sub = submitQuizForText(text.id, ctx.userLanguageId, ctx.userId, { answers: [] });
    expect(sub.error).toBeTruthy();
  });

  it('nutzt Offline-Fallback-Quiz ohne LLM', async () => {
    upsertText({
      lang: 'it',
      title: 'Fallback Text',
      level: 'A2',
      body: 'Il treno regionale ferma spesso nella piccola stazione vicino al fiume.',
      topic: 'reisen'
    });
    const t2 = readText('it', 'Fallback Text');
    chatCompletion.mockResolvedValueOnce({ ok: false, error: 'LLM_API_KEY ist nicht gesetzt' });
    const res = await getQuizForText(t2.id, ctx.userLanguageId, ctx.userId);
    expect(res.error).toBeUndefined();
    expect(res.questions.length).toBeGreaterThan(0);
    expect(res.source).toBe('fallback');
  });

  it('übersetzt Text per LLM und cached', async () => {
    chatCompletion.mockResolvedValueOnce(llmJson({ translation: 'Jeden Morgen trinkt Maria einen Kaffee.' }));
    const res = await getTranslationForText(text.id, ctx.userLanguageId, ctx.userId);
    expect(res.translation).toContain('Kaffee');
    expect(res.source).toBe('llm');
    const res2 = await getTranslationForText(text.id, ctx.userLanguageId, ctx.userId);
    expect(res2.source).toBe('cache');
  });

  it('Übersetzung ohne LLM -> Fehler, kein Crash', async () => {
    upsertText({ lang: 'it', title: 'Kein LLM Text', level: 'A2', body: 'Ciao.', topic: 'alltag' });
    const t3 = readText('it', 'Kein LLM Text');
    chatCompletion.mockResolvedValueOnce({ ok: false, error: 'LLM_API_KEY ist nicht gesetzt' });
    const res = await getTranslationForText(t3.id, ctx.userLanguageId, ctx.userId);
    expect(res.error).toBeTruthy();
  });
});
