import { useState, useEffect, useCallback } from 'react';
import v2Client from '../../core/api/v2Client';
import { useLanguage } from '../../core/language/LanguageContext';

const STAGE_META = {
  input: { icon: '📖', color: 'from-teal-500 to-cyan-600', label: 'Input' },
  fokus: { icon: '🧩', color: 'from-indigo-500 to-violet-600', label: 'Fokus' },
  output: { icon: '✍️', color: 'from-amber-500 to-orange-600', label: 'Output' },
  check: { icon: '✅', color: 'from-emerald-500 to-green-600', label: 'Check' }
};

const ITEM_LABEL = {
  reading: 'Lesetext',
  listening: 'Hörtext',
  grammar: 'Grammatik',
  writing: 'Schreiben',
  speaking: 'Sprechen',
  cando: 'Can-do'
};

/**
 * Tages-Sitzung (Session Composer, Phase 6).
 *
 * Der Composer baut aus dem Curriculum automatisch eine Sitzung nach dem
 * Prinzip Input → Fokus → Output → Check. Der Lernende wählt keine Module
 * mehr selbst – er arbeitet die Stufen der Reihe nach ab und schließt sie ab.
 */
function DailySession({ onOpenModule }) {
  const { activeUserLanguage } = useLanguage();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    if (!activeUserLanguage) return;
    setLoading(true);
    setError(null);
    try {
      const data = await v2Client.getTodaySession(activeUserLanguage.id);
      if (data.error) throw new Error(data.error);
      setSession(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeUserLanguage]);

  useEffect(() => {
    load();
  }, [load]);

  const completed = new Set(session?.completed || []);

  const completeStage = async (stageKey) => {
    if (!activeUserLanguage) return;
    setBusy(stageKey);
    try {
      const res = await v2Client.completeSessionStage(activeUserLanguage.id, stageKey);
      setSession((prev) => ({ ...prev, completed: res.completed || [] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (!activeUserLanguage) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-gray-600">Bitte wähle zuerst eine Sprache im Onboarding.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-gray-500 animate-pulse">Deine Sitzung wird zusammengestellt…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center space-y-3">
        <p className="text-red-600">{error}</p>
        <button onClick={load} className="btn-secondary text-sm px-4 py-2">
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!session || !session.stages) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-gray-600">Für heute ist noch keine Sitzung verfügbar.</p>
      </div>
    );
  }

  const stages = session.stages;
  const doneCount = stages.filter((s) => completed.has(s.key)).length;
  const pct = Math.round((doneCount / stages.length) * 100);
  const allDone = doneCount === stages.length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Kopf */}
      <div className="glass-card rounded-2xl p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                Einheit {session.unit?.id} · {session.level}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{session.theme}</h2>
            <p className="text-sm text-gray-600 mt-1">{session.goal}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-gray-800">{session.minutes}′</div>
            <div className="text-xs text-gray-500">geschätzt</div>
          </div>
        </div>

        {/* Fortschritt */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{doneCount} von {stages.length} Stufen</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {allDone && (
        <div className="glass-card rounded-2xl p-5 text-center bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200">
          <p className="text-lg font-bold text-emerald-700">🎉 Sitzung abgeschlossen!</p>
          <p className="text-sm text-gray-600 mt-1">
            Komm morgen wieder – dann geht es mit der nächsten Einheit weiter.
          </p>
        </div>
      )}

      {/* Stufen */}
      {stages.map((stage, i) => {
        const meta = STAGE_META[stage.type] || STAGE_META.input;
        const isDone = completed.has(stage.key);
        return (
          <div
            key={stage.key}
            className={`glass-card rounded-2xl p-5 shadow-lg transition-opacity ${isDone ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-lg shadow`}>
                  {meta.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase">
                    Schritt {i + 1} · {meta.label} · {stage.minutes}′
                  </div>
                  <h3 className="font-bold text-gray-800">{stage.title}</h3>
                </div>
              </div>
              {isDone && <span className="text-emerald-600 text-2xl">✓</span>}
            </div>

            {/* Items */}
            <ul className="space-y-2 mb-4">
              {stage.items.length === 0 && (
                <li className="text-sm text-gray-400 italic">Keine Inhalte für diese Stufe.</li>
              )}
              {stage.items.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between gap-3 bg-white/50 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] font-bold uppercase text-gray-400 mr-2">
                      {ITEM_LABEL[item.kind] || item.kind}
                    </span>
                    <span className="text-sm text-gray-800 truncate">
                      {item.title || item.prompt || item.text}
                    </span>
                  </div>
                  {onOpenModule && item.kind !== 'cando' && (
                    <button
                      onClick={() => onOpenModule(moduleForKind(item.kind))}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold shrink-0"
                    >
                      Öffnen →
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <button
              onClick={() => completeStage(stage.key)}
              disabled={isDone || busy === stage.key}
              className={`w-full text-sm py-2 rounded-lg font-semibold transition-colors ${
                isDone
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'btn-primary'
              }`}
            >
              {isDone ? 'Abgeschlossen' : busy === stage.key ? '…' : 'Stufe abschließen'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function moduleForKind(kind) {
  switch (kind) {
    case 'reading':
    case 'listening':
      return 'reader';
    case 'grammar':
      return 'grammar';
    case 'writing':
      return 'writing';
    case 'speaking':
      return 'speaking';
    default:
      return null;
  }
}

export default DailySession;
