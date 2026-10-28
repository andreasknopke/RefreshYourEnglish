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

const ITEM_HINT = {
  reading: 'Text lesen, anhören und die Verständnisfragen beantworten.',
  listening: 'Genau hinhören und die Verständnisfragen beantworten.',
  grammar: 'Alle Grammatikübungen zu diesem Punkt beantworten.',
  writing: 'Den Schreibimpuls beantworten und abschicken.',
  speaking: 'Den Dialog (oder Shadowing) mindestens einmal durchspielen.',
  cando: 'Kreuze an, was du heute schon kannst.'
};

/**
 * Tages-Sitzung (Session Composer).
 *
 * Der Composer baut aus dem Curriculum automatisch eine Sitzung nach dem
 * Prinzip Input → Fokus → Output → Check. Die Stufen sind gesperrt und
 * werden erst freigeschaltet, wenn die vorherige abgeschlossen ist.
 * "Stufe abschließen" prüft serverseitig, ob wirklich alles erledigt wurde.
 */
function DailySession({ onOpenModule }) {
  const { activeUserLanguage } = useLanguage();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [stageErrors, setStageErrors] = useState({});
  const [curatorInsight, setCuratorInsight] = useState(null);
  const [curating, setCurating] = useState(false);

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

  // Beim Zurückkehren in die Sitzung Erledigt-Status neu laden
  useEffect(() => {
    const onFocus = () => {
      if (!document.hidden && activeUserLanguage) {
        v2Client
          .getTodaySession(activeUserLanguage.id)
          .then((data) => !data.error && setSession(data))
          .catch(() => {});
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [activeUserLanguage]);

  const completed = new Set(session?.completed || []);

  const completeStage = async (stageKey) => {
    if (!activeUserLanguage) return;
    setBusy(stageKey);
    setStageErrors((prev) => ({ ...prev, [stageKey]: null }));
    try {
      const res = await v2Client.completeSessionStage(activeUserLanguage.id, stageKey);
      if (res.error) {
        setStageErrors((prev) => ({ ...prev, [stageKey]: res.error }));
        return;
      }
      // Live-Status neu laden (done-Flags)
      const fresh = await v2Client.getTodaySession(activeUserLanguage.id);
      setSession(fresh);
    } catch (err) {
      setStageErrors((prev) => ({ ...prev, [stageKey]: err.message }));
    } finally {
      setBusy(null);
    }
  };

  const confirmCando = async (candoId) => {
    if (!activeUserLanguage) return;
    try {
      await v2Client.confirmSessionCando(activeUserLanguage.id, candoId);
      const fresh = await v2Client.getTodaySession(activeUserLanguage.id);
      setSession(fresh);
    } catch (err) {
      setError(err.message);
    }
  };

  // KI-Kurator: personalisierten Plan anfragen (asynchron, LLM)
  const runCurator = async () => {
    if (!activeUserLanguage) return;
    setCurating(true);
    try {
      const res = await v2Client.curateSession(activeUserLanguage.id);
      if (res.error) throw new Error(res.error);
      if (res.insight) setCuratorInsight(res.insight);
      // Frischen Plan laden
      const fresh = await v2Client.getTodaySession(activeUserLanguage.id);
      if (!fresh.error) setSession(fresh);
    } catch (err) {
      // Kurator ist optional – Fehler nicht hart anzeigen
      setCuratorInsight(null);
    } finally {
      setCurating(false);
    }
  };

  const openItem = (item) => {
    const mod = moduleForKind(item.kind);
    if (mod && onOpenModule) onOpenModule(mod, item);
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
        <p className="text-xs text-gray-400 mt-2">
          Arbeite die Stufen der Reihe nach ab. Eine Stufe lässt sich erst abschließen,
          wenn alle Aufgaben wirklich erledigt sind.
        </p>
      </div>

      {/* KI-Kurator */}
      <div className="glass-card rounded-2xl p-5 border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-sm font-bold text-indigo-700">Dein KI-Lehrer</p>
              {curatorInsight ? (
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">{curatorInsight}</p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  {curating
                    ? 'Analysiere deinen Fortschritt und baue deinen personalisierten Plan…'
                    : 'Ich überwache deinen Fortschritt und passe deine Übungen an. Lass mich deinen heutigen Plan personalisieren.'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={runCurator}
            disabled={curating}
            className="btn-primary text-xs px-3 py-2 shrink-0 disabled:opacity-50"
          >
            {curating ? '…' : curatorInsight ? 'Neu planen' : 'Personalisieren'}
          </button>
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
        const isLocked = !isDone && stage.locked;
        return (
          <div
            key={stage.key}
            className={`glass-card rounded-2xl p-5 shadow-lg transition-opacity ${
              isDone ? 'opacity-60' : isLocked ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-lg shadow`}>
                  {isLocked ? '🔒' : meta.icon}
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
                    {item.done && (
                      <span className="inline-block text-[10px] font-bold text-emerald-600 mr-1" title="Erledigt">
                        ✓
                      </span>
                    )}
                    <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-800'} truncate`}>
                      {item.title || item.prompt || item.text}
                    </span>
                    <div className="text-[11px] text-gray-400 mt-0.5">{ITEM_HINT[item.kind]}</div>
                  </div>
                  {item.kind === 'cando' ? (
                    <button
                      onClick={() => confirmCando(item.id)}
                      disabled={item.done || isLocked}
                      className={`text-xs font-semibold shrink-0 px-2 py-1 rounded ${
                        item.done
                          ? 'text-emerald-600'
                          : isLocked
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-indigo-600 hover:text-indigo-800'
                      }`}
                    >
                      {item.done ? '✓ kann ich' : 'Kann ich ✓'}
                    </button>
                  ) : (
                    onOpenModule && (
                      <button
                        onClick={() => openItem(item)}
                        disabled={isLocked}
                        className={`text-xs font-semibold shrink-0 ${
                          isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'
                        }`}
                      >
                        {item.done ? 'Nochmal öffnen →' : 'Öffnen →'}
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>

            {stageErrors[stage.key] && (
              <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {stageErrors[stage.key]}
              </div>
            )}

            <button
              onClick={() => completeStage(stage.key)}
              disabled={isDone || isLocked || busy === stage.key}
              className={`w-full text-sm py-2 rounded-lg font-semibold transition-colors ${
                isDone || isLocked
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'btn-primary'
              }`}
            >
              {isDone
                ? 'Abgeschlossen'
                : isLocked
                  ? '🔒 Gesperrt – zuerst vorherige Stufe abschließen'
                  : busy === stage.key
                    ? '…'
                    : 'Stufe abschließen'}
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
