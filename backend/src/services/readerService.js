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
  getTextProgress
} from './textRepository.js';
import { getUserLanguage } from './userLanguageService.js';
import { addVocabCard } from './reviewService.js';

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
