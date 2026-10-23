import { useState, useEffect, useCallback } from 'react';
import v2Client from '../../core/api/v2Client';
import { useLanguage } from '../../core/language/LanguageContext';
import ttsService from '../../services/ttsService';

/**
 * Reader-Modul (Phase 3). Listet Lesetexte mit Coverage, zeigt sie mit
 * klickbaren Wörtern (bekannt/unbekannt), Glossar-Popup, Satz-Mining und
 * Segment-Audio (Browser-TTS).
 */
function ReaderModule({ focus = null }) {
  const { activeUserLanguage, activePack } = useLanguage();
  const [view, setView] = useState('list'); // list | reading
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [levelFilter, setLevelFilter] = useState('');

  const [reading, setReading] = useState(null); // { text, coverage, segments }
  const [activeWord, setActiveWord] = useState(null); // { word, known, translation }
  const [mining, setMining] = useState(false);
  const [playingSeq, setPlayingSeq] = useState(null);

  // Quiz + Übersetzung
  const [quiz, setQuiz] = useState(null); // { questions, attempt }
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizError, setQuizError] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationBusy, setTranslationBusy] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [markedRead, setMarkedRead] = useState(false);

  const lang = activeUserLanguage?.targetLang;

  const loadList = useCallback(async () => {
    if (!activeUserLanguage) return;
    setLoading(true);
    setError(null);
    try {
      const data = await v2Client.getTexts(activeUserLanguage.id, levelFilter || undefined);
      setTexts(data.texts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeUserLanguage, levelFilter]);

  useEffect(() => {
    setView('list');
    setReading(null);
    loadList();
  }, [loadList]);

  const openText = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const data = await v2Client.getText(activeUserLanguage.id, id);
      setReading(data);
      setView('reading');
      setActiveWord(null);
      setQuiz(null);
      setQuizAnswers([]);
      setQuizResult(null);
      setQuizError(null);
      setTranslation(null);
      setShowTranslation(false);
      setTranslationError(null);
      setMarkedRead(false);
      // Quiz laden (erscheint unter dem Text)
      try {
        const q = await v2Client.getTextQuiz(activeUserLanguage.id, id);
        if (!q.error) {
          setQuiz(q);
          setQuizAnswers((q.questions || []).map(() => null));
          if (q.attempt) setQuizResult({ score: q.attempt.score, passed: q.attempt.passed });
        }
      } catch {
        /* Quiz optional */
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Deep-Link aus der Tages-Sitzung: Text direkt öffnen
  useEffect(() => {
    if (focus && focus.module === 'reader' && focus.id && activeUserLanguage) {
      openText(focus.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserLanguage, focus?.id]);

  const submitQuiz = async () => {
    if (!reading || !quiz) return;
    setQuizBusy(true);
    setQuizError(null);
    try {
      const res = await v2Client.submitTextQuiz(
        activeUserLanguage.id,
        reading.text.id,
        quizAnswers.map((a) => a || '')
      );
      if (res.error) {
        setQuizError(res.error);
        return;
      }
      setQuizResult(res);
    } catch (err) {
      setQuizError(err.message);
    } finally {
      setQuizBusy(false);
    }
  };

  const showTranslationText = async () => {
    if (!reading) return;
    if (translation) {
      setShowTranslation((v) => !v);
      return;
    }
    setTranslationBusy(true);
    setTranslationError(null);
    try {
      const res = await v2Client.getTextTranslation(activeUserLanguage.id, reading.text.id);
      if (res.error) setTranslationError(res.error);
      else {
        setTranslation(res.translation);
        setShowTranslation(true);
      }
    } catch (err) {
      setTranslationError(err.message);
    } finally {
      setTranslationBusy(false);
    }
  };

  const markRead = async () => {
    if (!reading) return;
    try {
      await v2Client.markTextRead(activeUserLanguage.id, reading.text.id);
      setMarkedRead(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const playSegment = async (segment) => {
    try {
      if (playingSeq === segment.seq) {
        ttsService.stop();
        setPlayingSeq(null);
        return;
      }
      setPlayingSeq(segment.seq);
      await ttsService.speak(segment.body, lang);
      setPlayingSeq(null);
    } catch {
      setPlayingSeq(null);
    }
  };

  const playAll = async () => {
    if (!reading) return;
    for (const seg of reading.segments) {
      setPlayingSeq(seg.seq);
      try {
        await ttsService.speak(seg.body, lang);
      } catch {
        /* weiter */
      }
    }
    setPlayingSeq(null);
  };

  const mineWord = async (word, translation) => {
    setMining(true);
    try {
      await v2Client.mineWord(activeUserLanguage.id, reading.text.id, {
        lemma: word,
        translation: translation || null
      });
      setActiveWord((w) => (w ? { ...w, known: true, mined: true } : w));
    } catch (err) {
      setError(err.message);
    } finally {
      setMining(false);
    }
  };

  if (!activeUserLanguage) {
    return <Empty text="Bitte wähle zuerst eine Zielsprache." />;
  }

  if (loading && view === 'list' && texts.length === 0) {
    return <Empty text="Lade Texte…" />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card rounded-3xl p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadList} className="btn-primary px-5 py-2">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            Lesetexte · {activePack?.name || lang}
          </h2>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-sm p-2 rounded-xl border border-gray-200"
          >
            <option value="">Alle Niveaus</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
          </select>
        </div>

        {texts.length === 0 ? (
          <Empty text="Keine Texte verfügbar." />
        ) : (
          <div className="space-y-3">
            {texts.map((t) => (
              <button
                key={t.id}
                onClick={() => openText(t.id)}
                className="w-full glass-card rounded-2xl p-4 text-left hover:scale-[1.01] transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-800">{t.title}</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {t.level}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {t.topic && <span>#{t.topic}</span>}
                  {t.estMinutes && <span>~{t.estMinutes} Min</span>}
                  {t.completed && <span className="text-green-600">✓ gelesen</span>}
                </div>
                <CoverageBar coverage={t.coverage} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // reading view
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setView('list')}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          ← Zurück
        </button>
        <button onClick={playAll} className="text-sm text-gray-500 hover:text-gray-700">
          ▶ Ganz vorlesen
        </button>
      </div>

      <div className="glass-card rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-800">{reading.text.title}</h2>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {reading.text.level}
          </span>
        </div>
        <div className="mb-4">
          <CoverageBar coverage={reading.coverage.coverage} />
          <p className="text-xs text-gray-400 mt-1">
            {reading.coverage.known}/{reading.coverage.total} Wörter bekannt
          </p>
        </div>

        {/* Anleitung */}
        <div className="mb-4 text-xs text-gray-500 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2 space-y-0.5">
          <p className="font-semibold text-gray-600">So arbeitest du diesen Text:</p>
          <p>1. Lies den Text langsam. Unbekannte Wörter (gestrichelt) anklicken → als Karte lernen.</p>
          <p>2. Höre den Text an (🔊 pro Satz oder ▶ ganz vorlesen).</p>
          <p>3. Beantworte unten die Verständnisfragen. Erst dann gilt der Text als erledigt.</p>
          <p>4. Unsicher? „Auf Deutsch anzeigen" zeigt dir die Übersetzung.</p>
        </div>

        <div className="space-y-3">
          {reading.segments.map((seg) => (
            <div key={seg.seq} className="flex items-start gap-2">
              <button
                onClick={() => playSegment(seg)}
                className={`mt-0.5 text-lg ${
                  playingSeq === seg.seq
                    ? 'text-indigo-600 animate-pulse'
                    : 'text-gray-300 hover:text-indigo-500'
                }`}
                title="Segment vorlesen"
              >
                {playingSeq === seg.seq ? '⏸' : '🔊'}
              </button>
              <p className="text-lg leading-relaxed flex-1">{renderSegment(seg, setActiveWord)}</p>
            </div>
          ))}
        </div>

        {/* Übersetzung */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={showTranslationText}
            disabled={translationBusy}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            {translationBusy ? 'Übersetzung wird geladen…' : showTranslation ? '🙈 Übersetzung verbergen' : '🇩🇪 Auf Deutsch anzeigen'}
          </button>
          {translationError && (
            <p className="text-xs text-orange-600 mt-1">{translationError}</p>
          )}
          {showTranslation && translation && (
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 italic whitespace-pre-wrap">
              {translation}
            </div>
          )}
        </div>
      </div>

      {/* Verständnis-Quiz */}
      {quiz && quiz.questions && quiz.questions.length > 0 && (
        <div className="glass-card rounded-3xl p-6 shadow-xl mt-4">
          <h3 className="font-bold text-gray-800 mb-1">🧠 Verständnisfragen</h3>
          <p className="text-xs text-gray-500 mb-4">
            Beantworte alle Fragen richtig genug, um den Text abzuschließen.
          </p>
          <div className="space-y-4">
            {quiz.questions.map((q, qi) => (
              <div key={qi}>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {qi + 1}. {q.q}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const chosen = quizAnswers[qi] === opt;
                    const resultOpt = quizResult?.results?.[qi];
                    let cls = 'border-gray-200 hover:border-indigo-300';
                    if (quizResult && resultOpt) {
                      if (opt === resultOpt.answer) cls = 'border-emerald-400 bg-emerald-50';
                      else if (chosen && !resultOpt.correct) cls = 'border-red-300 bg-red-50';
                      else cls = 'border-gray-200 opacity-60';
                    } else if (chosen) {
                      cls = 'border-indigo-400 bg-indigo-50';
                    }
                    return (
                      <button
                        key={oi}
                        onClick={() => {
                          if (quizResult) return;
                          setQuizAnswers((prev) => {
                            const next = [...prev];
                            next[qi] = opt;
                            return next;
                          });
                        }}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${cls}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {quizError && <p className="text-sm text-red-600 mt-3">{quizError}</p>}

          {quizResult ? (
            <div className="mt-4 space-y-2">
              <div
                className={`text-sm font-bold rounded-lg px-3 py-2 ${
                  quizResult.passed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}
              >
                {quizResult.passed
                  ? `✓ Bestanden! ${Math.round(quizResult.score * 100)}% richtig.`
                  : `${Math.round(quizResult.score * 100)}% richtig – lies den Text noch einmal und versuche es erneut.`}
              </div>
              {!quizResult.passed && (
                <button
                  onClick={() => {
                    setQuizResult(null);
                    setQuizAnswers(quiz.questions.map(() => null));
                  }}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Erneut versuchen
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={submitQuiz}
              disabled={quizBusy || quizAnswers.some((a) => !a)}
              className="btn-primary w-full mt-4 py-2.5 disabled:opacity-50"
            >
              {quizBusy ? '…' : 'Antworten prüfen'}
            </button>
          )}
        </div>
      )}

      {/* Als gelesen markieren (falls kein Quiz verfügbar) */}
      {quiz && (!quiz.questions || quiz.questions.length === 0) && (
        <div className="glass-card rounded-3xl p-5 shadow-xl mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Für diesen Text gibt es noch keine Verständnisfragen.
          </p>
          <button
            onClick={markRead}
            disabled={markedRead}
            className={`text-sm font-semibold px-4 py-2 rounded-lg ${
              markedRead ? 'text-emerald-600' : 'btn-primary'
            }`}
          >
            {markedRead ? '✓ Gelesen' : 'Als gelesen markieren'}
          </button>
        </div>
      )}

      {/* Glossar-Popup */}
      {activeWord && (
        <div
          className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setActiveWord(null)}
        >
          <div
            className="glass-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-800">{activeWord.word}</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  activeWord.known ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}
              >
                {activeWord.known ? 'bekannt' : 'neu'}
              </span>
            </div>
            <button
              onClick={() => ttsService.speak(activeWord.word, lang)}
              className="text-sm text-indigo-600 mb-3"
            >
              🔊 Aussprechen
            </button>
            <input
              value={activeWord.translation || ''}
              onChange={(e) => setActiveWord((w) => ({ ...w, translation: e.target.value }))}
              placeholder="Bedeutung (optional)"
              className="w-full p-2 rounded-xl border border-gray-200 mb-3 text-sm"
            />
            {activeWord.mined ? (
              <div className="text-center text-green-600 font-semibold py-2">
                ✓ Zur Karte hinzugefügt
              </div>
            ) : (
              <button
                onClick={() => mineWord(activeWord.word, activeWord.translation)}
                disabled={mining}
                className="btn-primary w-full py-2.5 disabled:opacity-50"
              >
                {mining ? '…' : '➕ Als Karte lernen'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Rendert ein Segment mit klickbaren Wörtern. Bekannte Wörter grün,
 * unbekannte mit Unterstreichung.
 */
function renderSegment(segment, onWordClick) {
  const rawTokens = segment.body.split(/\s+/);
  return rawTokens.map((raw, i) => {
    const clean = raw.toLowerCase().replace(/[.,!?;:"'’()…«»]/g, '');
    const status = segment.words.find((w) => w.word === clean);
    const known = status ? status.known : false;
    return (
      <span
        key={i}
        onClick={() => onWordClick({ word: clean, known, translation: '', mined: false })}
        className={`cursor-pointer ${
          known
            ? 'text-green-700'
            : 'text-gray-800 hover:bg-yellow-100 rounded underline decoration-dotted'
        }`}
      >
        {raw}{' '}
      </span>
    );
  });
}

function CoverageBar({ coverage }) {
  const pct = Math.round((coverage || 0) * 100);
  const color = pct >= 95 ? 'bg-green-500' : pct >= 70 ? 'bg-indigo-500' : 'bg-orange-500';
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card rounded-3xl p-8 text-center text-gray-500">{text}</div>
    </div>
  );
}

export default ReaderModule;
