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
// Task: dialog_reply – Dialogpartner antwortet in der Zielsprache und gibt
// Feedback zum letzten Beitrag des Lernenden (in der Muttersprache).
// ---------------------------------------------------------------------------
registerPrompt('dialog_reply', 'v1', {
  description: 'Dialogpartner antwortet in der Zielsprache + Feedback zum Lernenden-Beitrag',
  contract: 'dialog_reply',
  build({ targetLang, nativeLang, level, scenario, learnerRole, partnerRole, history = [], lastLearnerTurn }) {
    const target = langName(targetLang);
    const native = langName(nativeLang);

    const transcript = history
      .map((t) => `${t.role === 'learner' ? learnerRole : partnerRole}: ${t.text}`)
      .join('\n');

    const system = `You are a friendly conversation partner helping a learner practice ${target}.
Level: ${level}. Stay at this level: short, natural ${target} sentences.
You play the role "${partnerRole}". The learner plays "${learnerRole}".
Scenario: ${scenario}

Do two things:
1. "reply": your next line, ALWAYS in ${target} (never in ${native}). Keep it short and move the conversation forward. When the conversation has reached a natural end, set "reply_done" to true.
2. "feedback" about the learner's LAST turn only, written in ${native}:
   - "score": integer 1-10 for how well that turn was understood/correct
   - "errors": list of { "span", "type" (agreement|tense|preposition|gender|spelling|word_order|lexis), "explanation" (in ${native}), "suggestion" (better ${target}) }
   - "hint": one short ${native} tip for the next turn
Respond ONLY with JSON:
{
  "reply": "<${target} line>",
  "reply_done": <true|false>,
  "feedback": { "score": <1-10>, "errors": [ ... ], "hint": "<${native}>" }
}`;

    const user = `Conversation so far:\n${transcript || '(no turns yet)'}\n\nLearner's last turn:\n"""${lastLearnerTurn}"""\n\nNow produce your JSON reply.`;

    return {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.7,
      maxTokens: 700
    };
  }
});

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
