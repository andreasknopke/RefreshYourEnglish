import { useState, useEffect } from 'react';
import v2Client from '../../core/api/v2Client';
import { useLanguage } from '../../core/language/LanguageContext';
import TTSButton from '../../components/TTSButton';
import STTButton from '../../components/STTButton';

/**
 * Sprechmodul (Phase 5): Dialog mit LLM-Partner + Shadowing mit Stufe-1-
 * Aussprachebewertung. STT/TTS-Locale kommen aus dem Language Pack
 * (activePack.sttLocale / ttsLocale) – nichts ist hartkodiert.
 */
function SpeakingModule({ focus = null, onBackToSession = null }) {
  const { activeUserLanguage, activePack } = useLanguage();
  const [tab, setTab] = useState('dialog'); // dialog | shadowing

  if (!activeUserLanguage) {
    return <Empty text="Bitte wähle zuerst eine Zielsprache." />;
  }

  const sttLocale = activePack?.sttLocale || activeUserLanguage.targetLang;
  const ttsLocale = activePack?.ttsLocale || activeUserLanguage.targetLang;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Sprechen</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <TabButton active={tab === 'dialog'} onClick={() => setTab('dialog')}>
            Dialog
          </TabButton>
          <TabButton active={tab === 'shadowing'} onClick={() => setTab('shadowing')}>
            Shadowing
          </TabButton>
        </div>
      </div>
      {tab === 'dialog' ? (
        <DialogTab id={activeUserLanguage.id} sttLocale={sttLocale} ttsLocale={ttsLocale} focus={focus} onBackToSession={onBackToSession} />
      ) : (
        <ShadowingTab id={activeUserLanguage.id} sttLocale={sttLocale} ttsLocale={ttsLocale} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------
function DialogTab({ id, sttLocale, ttsLocale, focus = null, onBackToSession = null }) {
  const [scenarios, setScenarios] = useState(null);
  const [active, setActive] = useState(null);
  const [turns, setTurns] = useState([]);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [replyDone, setReplyDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    v2Client
      .getSpeakingScenarios(id)
      .then((d) => alive && setScenarios(d.scenarios))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  // Deep-Link aus der Tages-Sitzung: Szenario direkt öffnen
  useEffect(() => {
    if (focus && focus.module === 'speaking' && focus.id) {
      openScenario(focus.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, focus?.id]);

  const openScenario = async (sid) => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    setReplyDone(false);
    setInput('');
    try {
      const d = await v2Client.getSpeakingScenario(id, sid);
      setActive(d.scenario);
      setTurns(d.history.length ? d.history : [{ role: 'partner', text: d.scenario.opening }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim() || !active) return;
    const text = input.trim();
    setInput('');
    setTurns((t) => [...t, { role: 'learner', text }]);
    setLoading(true);
    try {
      const res = await v2Client.sendSpeakingTurn(id, { scenarioId: active.id, text });
      setTurns((t) => [...t, { role: 'partner', text: res.reply }]);
      setFeedback(res.feedback);
      setReplyDone(res.replyDone);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="glass-card rounded-3xl p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => openScenario(active?.id)} className="btn-primary px-5 py-2">
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!active) {
    return loading && !scenarios ? (
      <Empty text="Lade Szenarien…" />
    ) : !scenarios || scenarios.length === 0 ? (
      <Empty text="Keine Szenarien verfügbar." />
    ) : (
      <div className="space-y-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => openScenario(s.id)}
            className="w-full glass-card rounded-2xl p-4 text-left hover:ring-2 hover:ring-indigo-200 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">{s.title}</span>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">
                {s.level}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{s.goal}</p>
            {s.roles && (
              <p className="text-xs text-gray-400 mt-1">
                Du: {s.roles.learner} · Partner: {s.roles.partner}
              </p>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      {focus?.module === 'speaking' && onBackToSession ? (
        <button
          onClick={onBackToSession}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold mb-3"
        >
          ← Zurück zur Tages-Sitzung
        </button>
      ) : (
        <button
          onClick={() => {
            setActive(null);
            setTurns([]);
            setFeedback(null);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          ← Andere Szene
        </button>
      )}

      <div className="glass-card rounded-3xl p-4 mb-3">
        <div className="text-sm font-semibold text-gray-700">{active.title}</div>
        <p className="text-xs text-gray-500 mt-0.5">{active.situation}</p>
      </div>

      <div className="space-y-2 mb-3 max-h-[45vh] overflow-y-auto">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === 'learner' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                t.role === 'learner' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm">{t.text}</p>
              {t.role === 'partner' && (
                <div className="flex justify-end mt-1">
                  <TTSButton text={t.text} language={ttsLocale} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-xs text-gray-400 text-center">Partner schreibt…</p>}
      </div>

      {feedback && (
        <div className="glass-card rounded-2xl p-3 mb-3 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-500">Feedback</span>
            <span className="text-xs font-bold text-indigo-600">{feedback.score}/10</span>
          </div>
          {feedback.errors?.length > 0 && (
            <ul className="space-y-1 mb-1">
              {feedback.errors.map((e, i) => (
                <li key={i} className="text-xs text-gray-600">
                  <span className="font-semibold text-red-500">{e.type}</span>
                  {e.span && <span className="line-through mx-1">{e.span}</span>}
                  {e.suggestion && <span className="text-green-600">{e.suggestion}</span>}
                  {e.explanation && <span className="text-gray-400"> — {e.explanation}</span>}
                </li>
              ))}
            </ul>
          )}
          {feedback.hint && <p className="text-xs text-gray-500">💡 {feedback.hint}</p>}
        </div>
      )}

      {replyDone ? (
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">Gespräch abgeschlossen. 🎉</p>
          <button onClick={() => openScenario(active.id)} className="btn-secondary px-4 py-2 text-sm">
            Nochmal spielen
          </button>
        </div>
      ) : (
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder={`Antworte als ${active.roles?.learner || 'du'}…`}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none"
          />
          <div className="flex flex-col gap-1">
            <STTButton
              onTranscript={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))}
              language={sttLocale}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="btn-primary px-3 py-1 text-sm disabled:opacity-50"
            >
              Senden
            </button>
          </div>
        </div>
      )}

      {active.redemittel?.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">Redemittel</div>
          <div className="flex flex-wrap gap-1">
            {active.redemittel.map((r, i) => (
              <button
                key={i}
                onClick={() => setInput(r)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full px-2 py-1"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shadowing
// ---------------------------------------------------------------------------
function ShadowingTab({ id, sttLocale, ttsLocale }) {
  const [phrases, setPhrases] = useState(null);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    v2Client
      .getShadowing(id)
      .then((d) => alive && setPhrases(d.phrases))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const current = phrases && phrases.length ? phrases[idx % phrases.length] : null;

  const onTranscript = async (transcript) => {
    if (!current) return;
    const durationMs = startedAt ? Date.now() - startedAt : null;
    setLoading(true);
    try {
      const res = await v2Client.scoreSpeaking(id, {
        reference: current.reference,
        transcript,
        durationMs,
        scenarioId: current.scenarioId
      });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="glass-card rounded-3xl p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
      </div>
    );
  }

  if (loading && !phrases) return <Empty text="Lade Sätze…" />;
  if (!phrases || phrases.length === 0) return <Empty text="Keine Shadowing-Sätze verfügbar." />;

  return (
    <div>
      <div className="glass-card rounded-3xl p-6 mb-3 text-center">
        <div className="text-xs text-gray-400 mb-2">
          Satz {(idx % phrases.length) + 1} von {phrases.length} · {current.level}
        </div>
        <p className="text-xl text-gray-800 mb-3">„{current.reference}“</p>
        <div className="flex justify-center gap-2 items-center">
          <TTSButton text={current.reference} language={ttsLocale} />
          <span className="text-xs text-gray-400">erst anhören, dann nachsprechen</span>
        </div>
      </div>

      <div className="flex justify-center mb-1">
        <STTButton onTranscript={onTranscript} onStart={() => setStartedAt(Date.now())} language={sttLocale} disabled={loading} />
      </div>
      <p className="text-center text-xs text-gray-400 mb-4">🎤 tippen, sprechen, erneut tippen</p>

      {result && (
        <div className="glass-card rounded-2xl p-5 mb-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl font-bold text-indigo-600">{result.score}</span>
            <span className="text-sm text-gray-500">/ 100 · {result.level}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Metric label="Worttreffer" value={result.wordAccuracy} />
            <Metric label="Tempo" value={result.durationScore} />
            <Metric label="Fluss" value={result.fluency} />
          </div>
          {result.missing?.length > 0 && (
            <p className="text-xs text-gray-500 text-center mt-3">
              Verstanden fehlen: <span className="text-red-500">{result.missing.join(', ')}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setIdx((i) => Math.max(0, i - 1));
            setResult(null);
          }}
          disabled={idx === 0}
          className="btn-secondary flex-1 py-2 disabled:opacity-40"
        >
          ← Zurück
        </button>
        <button
          onClick={() => {
            setIdx((i) => i + 1);
            setResult(null);
          }}
          className="btn-primary flex-1 py-2"
        >
          Weiter →
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="bg-gray-50 rounded-xl py-2">
      <div className={`text-lg font-bold ${color}`}>{pct}%</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="glass-card rounded-3xl p-8 text-center text-gray-500">{text}</div>;
}

export default SpeakingModule;
