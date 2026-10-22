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
const {
  listDialogScenarios,
  getDialogScenario,
  submitDialogTurn,
  listShadowingPhrases,
  scoreShadowing,
  getSpeakingStats
} = await import('../src/services/dialogService.js');

function llmJson(obj) {
  return { ok: true, content: JSON.stringify(obj) };
}

describe('Dialog Service', () => {
  let ctx;

  beforeAll(() => {
    expect(TEST_DB_PATH).toBeTruthy();
    ctx = seedUserAndLanguage({ targetLang: 'it', nativeLang: 'de', startCefr: 'A2' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('listet Szenarien aus dem Pack', () => {
    const res = listDialogScenarios(ctx.userLanguageId, ctx.userId);
    expect(res.ok).toBe(true);
    expect(res.targetLang).toBe('it');
    expect(res.scenarios.length).toBeGreaterThan(0);
    expect(res.scenarios[0]).toHaveProperty('id');
    expect(res.scenarios[0]).toHaveProperty('roles');
  });

  it('filtert Szenarien nach Level', () => {
    const res = listDialogScenarios(ctx.userLanguageId, ctx.userId, { level: 'A1' });
    expect(res.scenarios.every((s) => s.level === 'A1')).toBe(true);
  });

  it('lädt ein Szenario mit Eröffnungszeile', () => {
    const res = getDialogScenario(ctx.userLanguageId, ctx.userId, 'bar-kafe');
    expect(res.ok).toBe(true);
    expect(res.scenario.opening).toBeTruthy();
    expect(res.scenario.roles.learner).toBeTruthy();
  });

  it('unbekanntes Szenario -> Fehler', () => {
    const res = getDialogScenario(ctx.userLanguageId, ctx.userId, 'gibt-es-nicht');
    expect(res.error).toBeTruthy();
  });

  it('Dialogzug: Partnerantwort + Feedback aus LLM', async () => {
    chatCompletion.mockResolvedValueOnce(
      llmJson({
        reply: 'Un caffe, ottimo! Altro?',
        reply_done: false,
        feedback: {
          score: 8,
          errors: [{ span: 'vorrei un caffe', type: 'gender', explanation: 'Il caffè è maschile', suggestion: 'un caffè' }],
          hint: 'Usa gli articoli.'
        }
      })
    );
    const res = await submitDialogTurn(ctx.userLanguageId, ctx.userId, {
      scenarioId: 'bar-kafe',
      text: 'Vorrei un caffe'
    });
    expect(res.ok).toBe(true);
    expect(res.reply).toBe('Un caffe, ottimo! Altro?');
    expect(res.feedback.score).toBe(8);
    expect(res.feedback.errors[0].type).toBe('gender');
    expect(res.source).toBe('llm');
    expect(res.skill.total).toBeGreaterThan(0);
  });

  it('Dialogzug: Fehler landen im Fehlerprofil', async () => {
    chatCompletion.mockResolvedValueOnce(
      llmJson({
        reply: 'Bene!',
        reply_done: false,
        feedback: { score: 6, errors: [{ span: 'la caffe', type: 'gender', explanation: 'x', suggestion: 'il caffè' }], hint: '' }
      })
    );
    await submitDialogTurn(ctx.userLanguageId, ctx.userId, { scenarioId: 'bar-kafe', text: 'La caffe' });
    const stats = getSpeakingStats(ctx.userLanguageId, ctx.userId);
    const gender = stats.errorProfile.find((e) => e.category === 'gender');
    expect(gender).toBeTruthy();
    expect(gender.count).toBeGreaterThanOrEqual(1);
  });

  it('Dialogzug: Fallback ohne LLM', async () => {
    chatCompletion.mockResolvedValueOnce({ ok: false, error: 'no key' });
    const res = await submitDialogTurn(ctx.userLanguageId, ctx.userId, {
      scenarioId: 'presentarsi',
      text: 'Mi chiamo Andrea'
    });
    expect(res.ok).toBe(true);
    expect(res.source).toBe('fallback');
    expect(res.reply).toBeTruthy();
  });

  it('Dialogzug: fehlender Text -> Fehler', async () => {
    const res = await submitDialogTurn(ctx.userLanguageId, ctx.userId, { scenarioId: 'bar-kafe', text: '' });
    expect(res.error).toBeTruthy();
  });

  it('Shadowing-Sätze werden aus dem Pack geladen', () => {
    const res = listShadowingPhrases(ctx.userLanguageId, ctx.userId, { level: 'A1' });
    expect(res.ok).toBe(true);
    expect(res.phrases.length).toBeGreaterThan(0);
    expect(res.phrases[0]).toHaveProperty('reference');
  });

  it('Shadowing-Bewertung speichert Versuch + Speaking-Skill', () => {
    const ref = 'Vorrei un caffe per favore';
    const res = scoreShadowing(ctx.userLanguageId, ctx.userId, {
      reference: ref,
      transcript: ref,
      durationMs: 1900
    });
    expect(res.ok).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.skill.total).toBeGreaterThan(0);
  });

  it('Speaking-Statistiken liefern Skill + Fehlerprofil', () => {
    const stats = getSpeakingStats(ctx.userLanguageId, ctx.userId);
    expect(stats.targetLang).toBe('it');
    expect(stats.total).toBeGreaterThan(0);
    expect(Array.isArray(stats.errorProfile)).toBe(true);
  });
});
