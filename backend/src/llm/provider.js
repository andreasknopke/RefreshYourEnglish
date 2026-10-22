/**
 * LLM Provider Client
 *
 * Ein einziger, konfigurierbarer OpenAI-kompatibler Client für alle LLM-Aufgaben
 * (Entscheidung 2026-10-22: ein Endpoint für alles).
 *
 * Env (Backend):
 *   LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, LLM_DISABLE_THINKING
 */

const DEFAULT_BASE_URL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'mistral-large-latest';

export function normalizeBaseUrl(baseUrl) {
  const url = (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  return url.replace(/\/chat\/completions$/i, '');
}

const DISABLE_THINKING =
  String(process.env.LLM_DISABLE_THINKING ?? 'true').toLowerCase() !== 'false';

function noThinkingParams() {
  if (!DISABLE_THINKING) {
    return {};
  }
  return {
    chat_template_kwargs: { enable_thinking: false, thinking: false },
    reasoning_effort: 'none'
  };
}

export function getProviderConfig() {
  return {
    baseUrl: normalizeBaseUrl(process.env.LLM_BASE_URL),
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
    apiKey: process.env.LLM_API_KEY || '',
    endpoint: `${normalizeBaseUrl(process.env.LLM_BASE_URL)}/chat/completions`
  };
}

/**
 * Ruft den Chat-Completion-Endpoint auf.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options - { temperature, maxTokens, timeoutMs, signal }
 * @returns {Promise<{ ok: boolean, content?: string, error?: string, status?: number }>}
 */
export async function chatCompletion(messages, options = {}) {
  const { temperature = 0.7, maxTokens = 800, timeoutMs = 30000 } = options;
  const config = getProviderConfig();

  if (!config.apiKey) {
    return { ok: false, error: 'LLM_API_KEY ist nicht gesetzt' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      signal: options.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...noThinkingParams()
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        status: response.status,
        error: `LLM API Fehler ${response.status}: ${text.substring(0, 300)}`
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return { ok: false, error: 'LLM-Antwort enthält keinen Inhalt' };
    }

    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'LLM-Timeout' : err.message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Entfernt Markdown-Codezäune um eine LLM-JSON-Antwort.
 */
export function stripCodeFences(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

/**
 * Parst eine LLM-Antwort als JSON; toleriert Codezäune und umgebenden Text.
 */
export function parseJsonResponse(text) {
  const cleaned = stripCodeFences(text);
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch {
    // Letzter Versuch: größtes JSON-Objekt im Text extrahieren
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { ok: true, data: JSON.parse(match[0]) };
      } catch {
        /* durchfallen lassen */
      }
    }
    return { ok: false, error: 'Antwort ist kein gültiges JSON' };
  }
}
