/**
 * Reader Service
 *
 * Liefert Lesetexte mit Coverage-Check (Anteil bereits bekannter Wörter) und
 * ermöglicht Satz-Mining: Ein Wort aus dem Reader wird zur SRS-Karte.
 *
 * Coverage-Check: Der Nutzer kennt ein Wort, wenn sein Lemma bereits als Karte
 * existiert. Da wir (MVP) keinen Lemmatisierer haben, vergleichen wir normalisierte
 * Wortformen gegen bekannte Lemmata UND deren Wortstamm (Präfix-Match), um
 * flektierte Formen (italienisch) pragmatisch abzudecken.
 */

import {
  getTextById,
  getSegments,
  listTexts,
  getKnownLemmas,
  upsertTextProgress,
  getTextProgress,
  getQuiz,
  upsertQuiz,
  getUserQuizResult,
  upsertUserQuizResult,
  getTranslation,
  upsertTranslation
} from './textRepository.js';
import { getUserLanguage } from './userLanguageService.js';
import { addVocabCard } from './reviewService.js';
import { runLLMTask } from '../llm/taskRunner.js';

const STOPWORDS = new Set([
  // italienische Funktionswörter, die nicht als Vokabel gelernt werden
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'l',
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'del', 'dello',
  'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli',
  'alle', 'dal', 'dallo', 'dalla', 'nei', 'negli', 'nelle', 'nel', 'nello',
  'nella', 'sul', 'sullo', 'sulla', 'e', 'o', 'ma', 'se', 'che', 'chi',
  'è', 'sono', 'sei', 'siamo', 'siete', 'ho', 'hai', 'ha', 'abbiamo',
  'avete', 'this', 'the', 'is', 'are', 'a', 'an', 'and', 'or', 'but'
]);

/**
 * Normalisiert ein Wort für den Vergleich: lowercase, Akzente bleiben,
 * Satzzeichen weg.
 */
function normalizeWord(w) {
  return w.toLowerCase().replace(/[.,!?;:"'’()…«»]/g, '').trim();
}

/**
 * Tokenisiert einen Text in Wörter (ohne Whitespace/Leerzeichen).
 */
export function tokenize(text) {
  return text
    .split(/\s+/)
    .map(normalizeWord)
    .filter((w) => w.length > 0);
}

/**
 * Prüft, ob ein Wort gegen die bekannte Lemma-Menge matcht – exakt oder über
 * Wortstamm-Präfix (mind. 4 Zeichen), um Flexion abzudecken.
 */
function isKnown(word, knownLemmas) {
  if (knownLemmas.has(word)) return true;
  if (word.length < 5) return false;
  const stem = word.slice(0, Math.max(4, Math.ceil(word.length * 0.7)));
  for (const lemma of knownLemmas) {
    if (lemma.length >= 4 && (word.startsWith(lemma) || lemma.startsWith(stem))) {
      return true;
    }
  }
  return false;
}

/**
 * Berechnet Coverage eines Textes gegen die bekannten Wörter des Nutzers.
 * @returns {{ coverage, total, known, unknown: string[] }}
 */
export function computeCoverage(body, knownLemmas) {
  const tokens = tokenize(body);
  // Eindeutige, lernrelevante Wörter (Stopwords raus)
  const unique = [...new Set(tokens)].filter((w) => !STOPWORDS.has(w) && w.length > 1);
  if (unique.length === 0) {
    return { coverage: 1, total: 0, known: 0, unknown: [] };
  }
  let known = 0;
  const unknown = [];
  for (const w of unique) {
    if (isKnown(w, knownLemmas)) known += 1;
    else unknown.push(w);
  }
  return {
    coverage: Number((known / unique.length).toFixed(3)),
    total: unique.length,
    known,
    unknown
  };
}

/**
 * Liefert die Textliste einer Sprache inkl. Coverage pro Text für den Nutzer.
 * Empfohlen: Texte nahe dem Startniveau mit hoher, aber nicht perfekter
 * Abdeckung (i+1-Prinzip).
 */
export function listTextsWithCoverage(userLanguageId, userId, level = null) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden', texts: [] };

  const knownLemmas = getKnownLemmas(userLanguageId);
  const texts = listTexts(ul.targetLang, level);

  return {
    targetLang: ul.targetLang,
    nativeLang: ul.nativeLang,
    texts: texts.map((t) => {
      const cov = computeCoverage(t.body, knownLemmas);
      const progress = getTextProgress(userLanguageId, t.id);
      return {
        id: t.id,
        title: t.title,
        level: t.level,
        topic: t.topic,
        estMinutes: t.est_minutes,
        coverage: cov.coverage,
        unknownCount: cov.unknown.length,
        completed: !!progress?.completed_at
      };
    })
  };
}

/**
 * Liefert einen einzelnen Text mit Segmenten, Coverage und Wortstatus
 * (bekannt/unbekannt) fürs klickbare Lesen.
 */
export function getTextForReading(textId, userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const text = getTextById(textId);
  if (!text || text.lang !== ul.targetLang) {
    return { error: 'Text nicht gefunden' };
  }
  const segments = getSegments(textId);
  const knownLemmas = getKnownLemmas(userLanguageId);
  const cov = computeCoverage(text.body, knownLemmas);

  // Wortstatus pro Segment (für Färbung im Reader)
  const segsWithStatus = segments.map((s) => ({
    seq: s.seq,
    body: s.body,
    audioUrl: s.audio_url,
    words: tokenize(s.body).map((w) => ({
      word: w,
      known: STOPWORDS.has(w) || isKnown(w, knownLemmas)
    }))
  }));

  // Fortschritt als "gelesen" markieren (Coverage persistieren)
  upsertTextProgress(userLanguageId, textId, { coverage: cov.coverage });

  return {
    text: {
      id: text.id,
      title: text.title,
      level: text.level,
      topic: text.topic,
      estMinutes: text.est_minutes
    },
    coverage: cov,
    segments: segsWithStatus
  };
}

/**
 * Markiert einen Text als gelesen (für das Sitzungs-Gating).
 */
export function markTextRead(textId, userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const text = getTextById(textId);
  if (!text || text.lang !== ul.targetLang) return { error: 'Text nicht gefunden' };
  upsertTextProgress(userLanguageId, textId, { completed: true });
  return { ok: true };
}

/**
 * Satz-Mining: markiert ein Wort aus dem Reader als zu lernende Karte.
 * Übersetzung kann später per LLM ergänzt werden; hier optional übergeben.
 */
export function mineWord(userLanguageId, userId, { lemma, translation, example, source = 'reader' }) {
  const clean = (lemma || '').trim();
  if (!clean) return { error: 'Lemma fehlt' };
  return addVocabCard(userLanguageId, userId, {
    lemma: clean,
    translation: translation || null,
    example: example || null,
    source
  });
}

// ---------------------------------------------------------------------------
// Lesequiz + Übersetzung (Phase 9)
// ---------------------------------------------------------------------------

const PASS_THRESHOLD = 0.6; // ab 60 % richtiger Antworten gilt das Quiz als bestanden

/**
 * Liefert das Verständnis-Quiz zu einem Text. Existiert noch keines, wird es
 * per LLM generiert und gecacht. Ohne LLM (oder Fehler) kommt ein Fallback:
 * Vokabel-Fragen aus dem Text selbst (Sinn erschließen, ohne LLM).
 */
export async function getQuizForText(textId, userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const text = getTextById(textId);
  if (!text || text.lang !== ul.targetLang) return { error: 'Text nicht gefunden' };

  let questions = getQuiz(textId);
  let source = 'cache';
  if (!questions) {
    const level = ul.startCefr || ul.targetCefr || 'A2';
    const result = await runLLMTask(
      'generate_comprehension_quiz',
      'v1',
      {
        targetLang: ul.targetLang,
        nativeLang: ul.nativeLang,
        level,
        title: text.title,
        body: text.body,
        count: 3
      },
      { fallback: buildFallbackQuiz(text) }
    );
    if (!result.ok) return { error: result.error || 'Quiz-Generierung fehlgeschlagen' };
    questions = result.data.questions;
    source = result.source;
    if (questions.length > 0) upsertQuiz(textId, questions);
  }

  // Antworttexte nie an den Client liefern (nur Optionen + Frage)
  const publicQuestions = questions.map((q) => ({ q: q.q, options: q.options }));
  const attempt = getUserQuizResult(userLanguageId, textId);
  return {
    questions: publicQuestions,
    source,
    attempt // { score, passed } | null
  };
}

/**
 * Wertet ein eingereichtes Quiz aus (Server-seitig, Antworttexte bleiben
 * beim Server). Bestehen ab PASS_THRESHOLD.
 */
export function submitQuizForText(textId, userLanguageId, userId, { answers }) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const text = getTextById(textId);
  if (!text || text.lang !== ul.targetLang) return { error: 'Text nicht gefunden' };

  const questions = getQuiz(textId);
  if (!questions) return { error: 'Quiz nicht gefunden' };
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    return { error: 'Antworten passen nicht zur Anzahl der Fragen' };
  }

  const detailed = questions.map((q, i) => {
    const chosen = String(answers[i] ?? '');
    return { q: q.q, chosen, correct: chosen === q.answer, answer: q.answer };
  });
  const score = detailed.filter((d) => d.correct).length / questions.length;
  const passed = score >= PASS_THRESHOLD;
  upsertUserQuizResult(userLanguageId, textId, { score, passed, answers: detailed });

  return { ok: true, score, passed, results: detailed };
}

/**
 * Übersetzung des Textkörpers in die Muttersprache (gecacht, LLM).
 */
export async function getTranslationForText(textId, userLanguageId, userId) {
  const ul = getUserLanguage(userLanguageId, userId);
  if (!ul) return { error: 'Sprache nicht gefunden' };
  const text = getTextById(textId);
  if (!text || text.lang !== ul.targetLang) return { error: 'Text nicht gefunden' };

  const cached = getTranslation(textId, ul.nativeLang);
  if (cached) return { translation: cached, source: 'cache' };

  const level = ul.startCefr || ul.targetCefr || 'A2';
  const result = await runLLMTask(
    'translate_text',
    'v1',
    {
      targetLang: ul.targetLang,
      nativeLang: ul.nativeLang,
      level,
      title: text.title,
      body: text.body
    },
  );
  if (!result.ok) return { error: result.error || 'Übersetzung nicht verfügbar' };

  upsertTranslation(textId, ul.nativeLang, result.data.translation);
  return { translation: result.data.translation, source: 'llm' };
}

/**
 * Offline-Fallback-Quiz: Wortschatz-Fragen aus dem Text.
 * Richtige Antwort = ein Wort, das wirklich im Text vorkommt; Distraktoren =
 * andere Wörter desselben Textes bzw. generische Platzhalter.
 */
function buildFallbackQuiz(text) {
  const words = tokenize(text.body)
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i);
  if (words.length < 1) return { questions: [] };

  // Distraktoren: häufige italienische Wörter, die NICHT im Text vorkommen
  const inText = new Set(tokenize(text.body));
  const distractorPool = FALLBACK_DISTRACTORS.filter((w) => !inText.has(w));
  if (distractorPool.length < 3) return { questions: [] };

  const questions = [];
  const picks = words.slice(0, Math.min(3, words.length));
  for (const w of picks) {
    const distractors = pickRandom(distractorPool, 3);
    const options = shuffle([w, ...distractors]);
    questions.push({
      q: `Welches Wort kommt im Text „${text.title}" tatsächlich vor?`,
      options,
      answer: w
    });
  }
  return { questions };
}

// Häufige italienische Wörter als Distraktor-Pool für Offline-Quizze
const FALLBACK_DISTRACTORS = [
  'finestra', 'bicicletta', 'biblioteca', 'cielo', 'montagna', 'fiume', 'cucina',
  'giardino', 'campana', 'neve', 'sabbia', 'specchio', 'candela', 'tavolo',
  'scaffale', 'cassetto', 'cancello', 'cuscino', 'lenzuolo', 'ascensore',
  'campanile', 'traghetto', 'valigia', 'ombrello', 'secchio', 'tanica',
  'mattone', 'grattacielo', 'tettoia', 'pavimento', 'soffitto', 'cantina',
  'bagagliaio', 'parabrezza', 'motorino', 'filobus', 'metropolitana', 'binario',
  'spazzaneve', 'parchimetro', 'distributore', 'autogrill', 'camper', 'bifore'
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(pool, n) {
  const copy = [...pool];
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}
