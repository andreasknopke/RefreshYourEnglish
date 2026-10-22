/**
 * LLM Task Runner
 *
 * Kombiniert Prompt Registry -> Provider -> JSON-Parse -> Contract-Validierung.
 * Bei Validierungsfehler: genau ein Repair-Versuch, danach Fallback-Signal.
 */

import { getPrompt } from './prompts/index.js';
import { chatCompletion, parseJsonResponse } from './provider.js';
import { validateContract } from './validate.js';

/**
 * Führt einen registrierten LLM-Task aus.
 *
 * @param {string} key - Prompt-Key, z. B. "evaluate_writing"
 * @param {string} version - z. B. "v1"
 * @param {object} params - Parameter für prompt.build(params)
 * @param {object} [options] - { fallback } optionaler Fallback bei Fehler
 * @returns {Promise<{ ok: boolean, data?: object, source: 'llm'|'fallback', error?: string }>}
 */
export async function runLLMTask(key, version, params, options = {}) {
  const entry = getPrompt(key, version);
  const built = entry.build(params);

  let result = await chatCompletion(built.messages, {
    temperature: built.temperature,
    maxTokens: built.maxTokens
  });

  if (!result.ok) {
    return finishFallback(result.error, options);
  }

  let parsed = parseJsonResponse(result.content);
  let validated = parsed.ok ? validateContract(entry.contract, parsed.data) : parsed;

  // Ein Repair-Versuch, wenn die Antwort nicht dem Contract entspricht
  if (!validated.ok) {
    const repairMessages = [
      ...built.messages,
      { role: 'assistant', content: result.content },
      {
        role: 'user',
        content: `Deine Antwort war ungültig (${validated.error}). Antworte NUR mit korrektem JSON gemäß dem Schema.`
      }
    ];

    result = await chatCompletion(repairMessages, {
      temperature: 0.1,
      maxTokens: built.maxTokens
    });

    if (!result.ok) {
      return finishFallback(result.error, options);
    }

    parsed = parseJsonResponse(result.content);
    validated = parsed.ok ? validateContract(entry.contract, parsed.data) : parsed;

    if (!validated.ok) {
      return finishFallback(validated.error, options);
    }
  }

  return { ok: true, data: validated.data, source: 'llm' };
}

function finishFallback(error, options) {
  if (options.fallback !== undefined) {
    return { ok: true, data: options.fallback, source: 'fallback', error };
  }
  return { ok: false, source: 'fallback', error };
}
