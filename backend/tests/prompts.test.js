import { describe, it, expect } from 'vitest';
import { getPrompt, listPrompts, langName } from '../src/llm/prompts/index.js';
import { parseJsonResponse, stripCodeFences } from '../src/llm/provider.js';

describe('Prompt Registry', () => {
  it('kennt generate_sentence v1', () => {
    const entry = getPrompt('generate_sentence', 'v1');
    expect(entry.contract).toBe('generate_sentence');
  });

  it('wirft bei unbekanntem Prompt', () => {
    expect(() => getPrompt('gibtsnicht', 'v1')).toThrow(/nicht registriert/);
  });

  it('listet registrierte Prompts', () => {
    const keys = listPrompts().map((p) => p.key);
    expect(keys).toContain('generate_sentence');
    expect(keys).toContain('evaluate_writing');
  });

  it('baut sprachneutrale Prompts für Italienisch', () => {
    const entry = getPrompt('generate_sentence', 'v1');
    const built = entry.build({
      targetLang: 'it',
      nativeLang: 'de',
      level: 'A1',
      topic: 'Café'
    });
    const all = built.messages.map((m) => m.content).join('\n');
    // Instruktionen nennen Italienisch/Deutsch, aber NIE Englisch als Zielsprache
    expect(all).toContain('Italian');
    expect(all).toContain('German');
    expect(all).not.toMatch(/\bEnglish\b/);
  });

  it('setzt Zielvokabel korrekt ein', () => {
    const entry = getPrompt('generate_sentence', 'v1');
    const built = entry.build({
      targetLang: 'it',
      nativeLang: 'de',
      level: 'A2',
      targetVocab: { native: 'Apfel', target: 'mela' }
    });
    const user = built.messages[1].content;
    expect(user).toContain('Apfel');
    expect(user).toContain('mela');
  });

  it('evaluate_writing verlangt Fehler-Schema', () => {
    const entry = getPrompt('evaluate_writing', 'v1');
    const built = entry.build({
      targetLang: 'it',
      nativeLang: 'de',
      level: 'B1',
      prompt: 'Beschreibe deinen Tag',
      answer: 'Ieri sono andato al mare'
    });
    const sys = built.messages[0].content;
    expect(sys).toContain('errors');
    expect(sys).toContain('cefr_estimate');
  });

  it('langName mappt bekannte und unbekannte Codes', () => {
    expect(langName('it')).toBe('Italian');
    expect(langName('xx')).toBe('xx');
  });
});

describe('provider JSON-Helfer', () => {
  it('entfernt Codezäune', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('parst sauberes JSON', () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ ok: true, data: { a: 1 } });
  });

  it('parst JSON mit umgebendem Text', () => {
    const r = parseJsonResponse('Hier ist das Ergebnis: {"a":1} Hoffentlich hilft das.');
    expect(r.ok).toBe(true);
    expect(r.data.a).toBe(1);
  });

  it('meldet Fehler bei ungültigem JSON', () => {
    expect(parseJsonResponse('kein json').ok).toBe(false);
  });
});
