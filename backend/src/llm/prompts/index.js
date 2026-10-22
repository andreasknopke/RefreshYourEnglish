/**
 * Prompt Registry
 *
 * Zentrale, versionierte Quelle aller LLM-Prompts. Jeder Prompt ist
 * sprachneutral: Instruktionen stehen auf Englisch (robuster bei kleinen
 * Modellen), Inhalte werden über Platzhalter (targetLang, nativeLang, level)
 * eingesetzt. Kein Prompt enthält hartkodierte Sprachen wie "Englisch".
 *
 * Jeder Task hat einen Contract (siehe contracts.js), gegen den die Antwort
 * validiert wird.
 */

const LANG_NAMES = {
  it: 'Italian',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish'
};

export function langName(code) {
  return LANG_NAMES[code] || code;
}

/**
 * Registry-Eintrag: key@version -> { build(params), contract }
 */
const registry = new Map();

export function registerPrompt(key, version, definition) {
  registry.set(`${key}@${version}`, { key, version, ...definition });
}

export function getPrompt(key, version) {
  const entry = registry.get(`${key}@${version}`);
  if (!entry) {
    throw new Error(`Prompt "${key}@${version}" ist nicht registriert`);
  }
  return entry;
}

export function listPrompts() {
  return [...registry.values()].map(({ key, version, description }) => ({
    key,
    version,
    description
  }));
}

// ---------------------------------------------------------------------------
// Task: generate_sentence – erzeugt einen Übersetzungssatz (Muttersprache ->
// Zielsprache) auf Niveau, optional mit Zielvokabel.
// ---------------------------------------------------------------------------
registerPrompt('generate_sentence', 'v1', {
  description: 'Generiert einen Übersetzungssatz in der Muttersprache + Zielsprache',
  contract: 'generate_sentence',
  build({ targetLang, nativeLang, level, topic = 'Alltag', targetVocab = null }) {
    const target = langName(targetLang);
    const native = langName(nativeLang);

    const vocabRule = targetVocab
      ? `The ${native} sentence MUST contain the ${native} word "${targetVocab.native}" and its ${target} translation must contain "${targetLang ? targetVocab.target : ''}". Do NOT put any ${target} word inside the ${native} sentence.`
      : '';

    const system = `You are an experienced language teacher. Generate one ${native} sentence for translation into ${target}.
Level: ${level}
Topic: "${topic}"
The ${native} sentence must be 100% in ${native} - never mix in ${target} words.
${vocabRule}
Respond ONLY with JSON: {"native": "<${native} sentence>", "target": "<${target} translation>"}`;

    const user = targetVocab
      ? `Create a ${level}-level ${native} sentence using the ${native} word "${targetVocab.native}". Its ${target} translation must contain "${targetVocab.target}".`
      : `Create a ${level}-level ${native} sentence about "${topic}".`;

    return {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.8,
      maxTokens: 200
    };
  }
});

// ---------------------------------------------------------------------------
// Task: evaluate_writing – bewertet eine Produktion des Lernenden.
// ---------------------------------------------------------------------------
registerPrompt('evaluate_writing', 'v1', {
  description: 'Bewertet einen Schreib-/Übersetzungsbeitrag mit Fehlerkategorien',
  contract: 'evaluate_writing',
  build({ targetLang, nativeLang, level, prompt, answer }) {
    const target = langName(targetLang);
    const native = langName(nativeLang);

    const system = `You are a friendly ${target} teacher. Evaluate the learner's ${target} production.
Expected level: ${level}.
Give feedback in ${native}.
Respond ONLY with JSON matching this schema:
{
  "score": <integer 1-10>,
  "cefr_estimate": "<A1|A2|B1|B2|C1|C2>",
  "corrected": "<corrected ${target} version>",
  "errors": [ { "span": "<excerpt>", "type": "<agreement|tense|preposition|gender|spelling|word_order|lexis>", "explanation": "<in ${native}>", "suggestion": "<better ${target}>" } ],
  "strengths": ["<in ${native}>"],
  "next_focus": "<one short ${native} tip>"
}`;

    const user = `Task: ${prompt}\n\nLearner answer:\n"""${answer}"""`;

    return {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.3,
      maxTokens: 900
    };
  }
});
