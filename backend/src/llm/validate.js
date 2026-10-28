/**
 * LLM Response Contracts + Validator
 *
 * Jeder Prompt-Task deklariert einen Contract. Die LLM-Antwort wird dagegen
 * validiert; bei Verstoß liefert der Validator eine korrigierte, sichere
 * Struktur (bzw. ein Fallback-Signal), damit die App nie mit kaputten
 * LLM-Daten arbeitet.
 */

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const ERROR_TYPES = [
  'agreement',
  'tense',
  'preposition',
  'gender',
  'spelling',
  'word_order',
  'lexis'
];

function asString(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function asStringArray(v) {
  if (Array.isArray(v)) {
    return v.map(asString).filter(Boolean);
  }
  const s = asString(v);
  return s ? [s] : [];
}

function clampScore(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : 7;
}

/**
 * Contract-Validatoren: geben { ok, data } oder { ok:false, error } zurück.
 */
export const contracts = {
  generate_sentence(parsed) {
    const native = asString(parsed?.native || parsed?.de || parsed?.nativeSentence);
    const target = asString(parsed?.target || parsed?.en || parsed?.targetSentence);

    if (!native || !target) {
      return { ok: false, error: 'generate_sentence: native/target fehlen' };
    }
    return { ok: true, data: { native, target } };
  },

  dialog_reply(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'dialog_reply: keine Objendantwort' };
    }

    const reply = asString(parsed.reply);
    if (!reply) {
      return { ok: false, error: 'dialog_reply: reply fehlt' };
    }

    const fb = parsed.feedback && typeof parsed.feedback === 'object' ? parsed.feedback : {};
    const errors = Array.isArray(fb.errors)
      ? fb.errors
          .filter((e) => e && typeof e === 'object')
          .map((e) => ({
            span: asString(e.span),
            type: ERROR_TYPES.includes(e.type) ? e.type : 'lexis',
            explanation: asString(e.explanation),
            suggestion: asString(e.suggestion)
          }))
      : [];

    return {
      ok: true,
      data: {
        reply,
        reply_done: parsed.reply_done === true,
        feedback: {
          score: clampScore(fb.score),
          errors,
          hint: asString(fb.hint)
        }
      }
    };
  },

  generate_comprehension_quiz(parsed) {
    const qs = Array.isArray(parsed?.questions) ? parsed.questions : [];
    if (qs.length === 0) {
      return { ok: false, error: 'generate_comprehension_quiz: questions fehlen' };
    }
    const clean = [];
    for (const q of qs) {
      const text = asString(q?.q);
      const options = asStringArray(q?.options).filter(Boolean);
      const answer = asString(q?.answer);
      if (!text || options.length < 2 || !answer) continue;
      if (!options.includes(answer)) {
        return { ok: false, error: `generate_comprehension_quiz: answer nicht in options ("${text.slice(0, 40)}")` };
      }
      clean.push({ q: text, options, answer });
    }
    if (clean.length === 0) {
      return { ok: false, error: 'generate_comprehension_quiz: keine gültigen Fragen' };
    }
    return { ok: true, data: { questions: clean } };
  },

  translate_text(parsed) {
    const translation = asString(parsed?.translation);
    if (!translation) {
      return { ok: false, error: 'translate_text: translation fehlt' };
    }
    return { ok: true, data: { translation } };
  },

  curator_plan(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'curator_plan: keine Objendantwort' };
    }
    const unitId = asString(parsed.unitId);
    if (!unitId) {
      return { ok: false, error: 'curator_plan: unitId fehlt' };
    }
    const weights = parsed.stageWeights && typeof parsed.stageWeights === 'object'
      ? parsed.stageWeights
      : {};
    const items = parsed.items && typeof parsed.items === 'object' ? parsed.items : {};
    return {
      ok: true,
      data: {
        unitId,
        stageWeights: weights,
        items,
        insight: asString(parsed.insight),
        focusTags: asStringArray(parsed.focusTags)
      }
    };
  },

  evaluate_writing(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'evaluate_writing: keine Objendantwort' };
    }

    const errors = Array.isArray(parsed.errors)
      ? parsed.errors
          .filter((e) => e && typeof e === 'object')
          .map((e) => ({
            span: asString(e.span),
            type: ERROR_TYPES.includes(e.type) ? e.type : 'lexis',
            explanation: asString(e.explanation),
            suggestion: asString(e.suggestion)
          }))
      : [];

    const cefr = CEFR.includes(parsed.cefr_estimate) ? parsed.cefr_estimate : null;

    return {
      ok: true,
      data: {
        score: clampScore(parsed.score),
        cefr_estimate: cefr,
        corrected: asString(parsed.corrected),
        errors,
        strengths: asStringArray(parsed.strengths),
        next_focus: asString(parsed.next_focus)
      }
    };
  }
};

/**
 * Validiert eine geparste Antwort gegen einen benannten Contract.
 */
export function validateContract(contractName, parsed) {
  const validator = contracts[contractName];
  if (!validator) {
    return { ok: false, error: `Unbekannter Contract "${contractName}"` };
  }
  return validator(parsed);
}
