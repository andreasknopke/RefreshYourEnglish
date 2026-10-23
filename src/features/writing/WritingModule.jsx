import { useState, useEffect, useCallback } from 'react';
import v2Client from '../../core/api/v2Client';
import { useLanguage } from '../../core/language/LanguageContext';
import TTSButton from '../../components/TTSButton';

/**
 * Schreib-/Übersetzungsmodul (Phase 4). Erzeugt eine Übersetzungsaufgabe,
 * lässt den Lernenden produzieren und zeigt LLM-Feedback mit Fehlerkategorien.
 * Fehler fließen ins Fehlerprofil.
 */
function WritingModule({ focus = null, onBackToSession = null }) {
  const { activeUserLanguage } = useLanguage();
  const [view, setView] = useState('task'); // task | feedback | profile
  const [task, setTask] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lang = activeUserLanguage?.targetLang;

  const newTask = useCallback(async () => {
    if (!activeUserLanguage) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswer('');
    try {
      const data = await v2Client.getWritingTask(activeUserLanguage.id);
      setTask(data);
      setView('task');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeUserLanguage]);

  useEffect(() => {
    // Deep-Link aus der Tages-Sitzung: vorgegebenen Schreibimpuls verwenden
    if (focus && focus.module === 'writing' && focus.prompt) {
      setTask({ prompt: focus.prompt, topic: focus.topic || null });
      setAnswer('');
      setResult(null);
      setLoading(false);
      setView('task');
      return;
    }
    newTask();
  }, [newTask, focus]);

  if (!activeUserLanguage) {
    return <Empty text="Bitte wähle zuerst eine Zielsprache." />;
  }

  const submit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await v2Client.evaluateWriting(activeUserLanguage.id, {
        prompt: task?.prompt,
        answer,
        topic: task?.topic
      });
      setResult(res);
      setView('feedback');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openProfile = async () => {
    setLoading(true);
    try {
      const data = await v2Client.getWritingStats(activeUserLanguage.id);
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
          <button onClick={newTask} className="btn-primary px-5 py-2">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (view === 'task') {
    return (
      <div className="max-w-2xl mx-auto">
        {focus?.module === 'writing' && onBackToSession && (
          <button
            onClick={onBackToSession}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold mb-2"
          >
            ← Zurück zur Tages-Sitzung
          </button>
        )}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Schreiben</h2>
          <button onClick={openProfile} className="btn-secondary px-4 py-2 text-sm">
            Fehlerprofil
          </button>
        </div>

        {loading && !task ? (
          <Empty text="Erstelle Aufgabe…" />
        ) : !task ? (
          <Empty text="Keine Aufgabe verfügbar." />
        ) : (
          <div className="glass-card rounded-3xl p-6">
            <div className="text-xs text-gray-400 mb-1">
              Übersetze ins {lang?.toUpperCase()}
              {task.level ? ` · Niveau ${task.level}` : ''}
            </div>
            <p className="text-xl text-gray-800 mb-4">„{task.prompt}“</p>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Deine Antwort…"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:border-indigo-400 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={submit}
                disabled={loading || !answer.trim()}
                className="btn-primary flex-1 py-2 disabled:opacity-50"
              >
                {loading ? 'Bewerte…' : 'Bewerten'}
              </button>
              <button onClick={newTask} className="btn-secondary px-4 py-2">
                Neue Aufgabe
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'feedback' && result) {
    return (
      <div className="max-w-2xl mx-auto">
        {focus?.module === 'writing' && onBackToSession ? (
          <button
            onClick={onBackToSession}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold mb-3"
          >
            ← Zurück zur Tages-Sitzung
          </button>
        ) : (
          <button onClick={() => setView('task')} className="text-sm text-gray-500 hover:text-gray-700 mb-3">
            ← Neue Aufgabe
          </button>
        )}
        <div className="glass-card rounded-3xl p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Bewertung</span>
            <span className="text-2xl font-bold text-indigo-600">{result.score}/10</span>
          </div>
          {result.cefrEstimate && (
            <span className="inline-block text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">
              ca. {result.cefrEstimate}
            </span>
          )}
          {result.source === 'fallback' && (
            <p className="text-xs text-amber-600 mt-2">
              Offline-Bewertung (kein LLM konfiguriert).
            </p>
          )}
        </div>

        {result.corrected && (
          <div className="glass-card rounded-3xl p-6 mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-1">Verbesserte Version</div>
            <p className="text-gray-800">{result.corrected}</p>
            <div className="mt-2">
              <TTSButton text={result.corrected} language={lang} />
            </div>
          </div>
        )}

        {result.errors?.length > 0 && (
          <div className="glass-card rounded-3xl p-6 mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">Fehler</div>
            <div className="space-y-3">
              {result.errors.map((e, i) => (
                <div key={i} className="border-l-4 border-red-300 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-red-50 text-red-600 rounded px-2 py-0.5">
                      {e.type}
                    </span>
                    {e.span && <span className="text-sm text-gray-500 line-through">{e.span}</span>}
                    {e.suggestion && <span className="text-sm text-green-600">{e.suggestion}</span>}
                  </div>
                  {e.explanation && <p className="text-xs text-gray-500 mt-1">{e.explanation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {result.strengths?.length > 0 && (
          <div className="glass-card rounded-3xl p-6 mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Stärken</div>
            <ul className="text-sm text-gray-600 list-disc pl-5">
              {result.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {result.nextFocus && (
          <div className="glass-card rounded-3xl p-6">
            <div className="text-sm font-semibold text-gray-700 mb-1">Als Nächstes</div>
            <p className="text-sm text-gray-600">{result.nextFocus}</p>
          </div>
        )}
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setView('task')} className="text-sm text-gray-500 hover:text-gray-700 mb-3">
          ← Zurück
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Dein Fehlerprofil</h2>
        {loading ? (
          <Empty text="Lade…" />
        ) : !profile || profile.errorProfile.length === 0 ? (
          <Empty text="Noch keine Fehler erfasst – schreib los!" />
        ) : (
          <>
            {profile.average != null && (
              <p className="text-sm text-gray-500 mb-4">
                Ø Bewertung: {Math.round(profile.average * 100)} % bei {profile.total} Texten
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

function Empty({ text }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card rounded-3xl p-8 text-center text-gray-500">{text}</div>
    </div>
  );
}

export default WritingModule;
