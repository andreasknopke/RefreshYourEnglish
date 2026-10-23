import { useState, useEffect, useCallback } from 'react';
import v2Client from '../../core/api/v2Client';
import { useLanguage } from '../../core/language/LanguageContext';

const LEVELS = ['A1', 'A2', 'B1', 'B2'];

/**
 * Grammatik-Modul (Phase 4). Wählt Grammatikpunkte, zeigt Erklärung +
 * Beispiele und stellt 8 Übungen (Multiple-Choice / Lückentext). Falsche
 * Antworten werden mit Fehler-Tag im Fehlerprofil gesammelt.
 */
function GrammarModule({ focus = null, onBackToSession = null }) {
  const { activeUserLanguage } = useLanguage();
  const [view, setView] = useState('points'); // points | exercise | profile
  const [level, setLevel] = useState('');
  const [points, setPoints] = useState([]);
  const [point, setPoint] = useState(null);
  const [exIdx, setExIdx] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPoints = useCallback(async () => {
    if (!activeUserLanguage) return;
    setLoading(true);
    setError(null);
    try {
      const data = await v2Client.getGrammarPoints(activeUserLanguage.id, level || undefined);
      setPoints(data.points || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeUserLanguage, level]);

  useEffect(() => {
    setView('points');
    setPoint(null);
    loadPoints();
  }, [loadPoints]);

  // Deep-Link aus der Tages-Sitzung: Grammatikpunkt direkt öffnen
  useEffect(() => {
    if (focus && focus.module === 'grammar' && focus.id && activeUserLanguage) {
      openPoint(focus.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserLanguage, focus?.id]);

  if (!activeUserLanguage) {
    return <Empty text="Bitte wähle zuerst eine Zielsprache." />;
  }

  const openPoint = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const data = await v2Client.getGrammarPoint(activeUserLanguage.id, id);
      setPoint(data.point);
      setExIdx(0);
      setAnswer(null);
      setFeedback(null);
      setView('exercise');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (answer == null || answer === '') return;
    setLoading(true);
    try {
      const res = await v2Client.answerGrammar(activeUserLanguage.id, {
        pointId: point.id,
        exerciseIndex: exIdx,
        answer
      });
      setFeedback(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setFeedback(null);
    setAnswer(null);
    if (exIdx + 1 < point.exercises.length) {
      setExIdx(exIdx + 1);
    } else if (focus?.module === 'grammar' && onBackToSession) {
      // Aus der Tages-Sitzung: nach der letzten Übung direkt zurück
      onBackToSession();
    } else {
      setView('points');
      setPoint(null);
    }
  };

  const openProfile = async () => {
    setLoading(true);
    try {
      const data = await v2Client.getGrammarStats(activeUserLanguage.id);
      setProfile(data);
      setView('profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card rounded-3xl p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadPoints} className="btn-primary px-5 py-2">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (view === 'points') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Grammatik</h2>
          <button onClick={openProfile} className="btn-secondary px-4 py-2 text-sm">
            Fehlerprofil
          </button>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <LevelChip active={level === ''} onClick={() => setLevel('')} label="Alle" />
          {LEVELS.map((l) => (
            <LevelChip key={l} active={level === l} onClick={() => setLevel(l)} label={l} />
          ))}
        </div>
        {loading ? (
          <Empty text="Lade Grammatik…" />
        ) : points.length === 0 ? (
          <Empty text="Keine Grammatikpunkte verfügbar." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {points.map((p) => (
              <button
                key={p.id}
                onClick={() => openPoint(p.id)}
                className="glass-card rounded-2xl p-4 text-left hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-indigo-600">{p.level}</span>
                  <span className="text-xs text-gray-400">{p.exerciseCount} Übungen</span>
                </div>
                <div className="font-semibold text-gray-800">{p.title}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'exercise' && point) {
    const ex = point.exercises[exIdx];
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => (focus?.module === 'grammar' && onBackToSession ? onBackToSession() : setView('points'))}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {focus?.module === 'grammar' && onBackToSession ? '← Zurück zur Tages-Sitzung' : '← Zurück'}
          </button>
          <span className="text-sm text-gray-400">
            Übung {exIdx + 1} / {point.exercises.length}
          </span>
        </div>

        <div className="glass-card rounded-3xl p-6 mb-4">
          <div className="text-xs font-semibold text-indigo-600 mb-1">{point.level}</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{point.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{point.explanation}</p>
          {point.examples?.length > 0 && (
            <ul className="text-sm text-gray-500 list-disc pl-5 mb-2">
              {point.examples.slice(0, 3).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card rounded-3xl p-6">
          <p className="text-lg text-gray-800 mb-4">{ex.s}</p>

          {ex.type === 'mc' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {ex.o.map((opt, i) => (
                <button
                  key={i}
                  disabled={!!feedback}
                  onClick={() => setAnswer(i)}
                  className={`rounded-xl px-4 py-3 border transition ${
                    answer === i
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={answer ?? ''}
              disabled={!!feedback}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !feedback && submit()}
              placeholder="Antwort eingeben…"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:border-indigo-400"
            />
          )}

          {feedback ? (
            <div className="mt-4">
              <div
                className={`rounded-xl p-4 mb-3 ${
                  feedback.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                <div className="font-semibold mb-1">
                  {feedback.correct ? 'Richtig! ✓' : `Leider falsch – richtig: ${feedback.expected}`}
                </div>
                {!feedback.correct && feedback.errorTag && (
                  <div className="text-xs mt-1">
                    Fehlertyp: <span className="font-semibold">{feedback.errorTag}</span>
                  </div>
                )}
                {feedback.explanation && (
                  <p className="text-xs text-gray-600 mt-2">{feedback.explanation}</p>
                )}
              </div>
              <button onClick={next} className="btn-primary w-full py-2">
                {exIdx + 1 < point.exercises.length ? 'Weiter →' : 'Fertig'}
              </button>
            </div>
          ) : (
            <button
              onClick={submit}
              disabled={loading || answer == null || answer === ''}
              className="btn-primary w-full mt-4 py-2 disabled:opacity-50"
            >
              Prüfen
            </button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setView('points')} className="text-sm text-gray-500 hover:text-gray-700 mb-3">
          ← Zurück
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Dein Fehlerprofil</h2>
        {loading ? (
          <Empty text="Lade…" />
        ) : !profile || profile.errorProfile.length === 0 ? (
          <Empty text="Noch keine Fehler erfasst – übe los!" />
        ) : (
          <>
            {profile.accuracy != null && (
              <p className="text-sm text-gray-500 mb-4">
                Genauigkeit: {Math.round(profile.accuracy * 100)} % bei {profile.total} Versuchen
              </p>
            )}
            <div className="space-y-2">
              {profile.errorProfile.map((e) => (
                <div key={e.category} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                  <span className="font-medium text-gray-700">{e.category}</span>
                  <span className="text-sm text-gray-500">{e.count}×</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

function LevelChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm border transition ${
        active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function Empty({ text }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card rounded-3xl p-8 text-center text-gray-500">{text}</div>
    </div>
  );
}

export default GrammarModule;
