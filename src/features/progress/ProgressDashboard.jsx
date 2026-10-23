import { useState, useEffect, useCallback } from 'react';
import v2Client from '../../core/api/v2Client';
import { useLanguage } from '../../core/language/LanguageContext';
import PlacementTest from '../placement/PlacementTest';

const BAND_STYLE = {
  stark: { bar: 'bg-emerald-500', text: 'text-emerald-700', label: 'stark' },
  mittel: { bar: 'bg-amber-500', text: 'text-amber-700', label: 'mittel' },
  schwach: { bar: 'bg-rose-500', text: 'text-rose-700', label: 'schwach' },
  unbekannt: { bar: 'bg-slate-300', text: 'text-slate-500', label: '–' }
};

/**
 * Progress Dashboard (Phase 7).
 *
 * Zeigt Skill-Profil, Fehlerprofil, Can-do-Report, Curriculum-Fortschritt,
 * Vokabelstatistik und Aktivität. Export als JSON.
 */
function ProgressDashboard() {
  const { activeUserLanguage } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [retaking, setRetaking] = useState(false);

  const load = useCallback(async () => {
    if (!activeUserLanguage) return;
    setLoading(true);
    setError(null);
    try {
      const res = await v2Client.getProgress(activeUserLanguage.id);
      if (res.error) throw new Error(res.error);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeUserLanguage]);

  useEffect(() => {
    load();
  }, [load]);

  const doExport = async () => {
    if (!activeUserLanguage) return;
    setExporting(true);
    try {
      await v2Client.exportProgress(activeUserLanguage.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (!activeUserLanguage) {
    return (
      <div className="p-6 text-slate-500">Bitte zuerst eine Zielsprache auswählen.</div>
    );
  }
  if (loading) {
    return <div className="p-6 text-slate-500">Lade Fortschritt …</div>;
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
        <button
          onClick={load}
          className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Fortschritt</h2>
          <p className="text-sm text-slate-500">
            {data.targetLang?.toUpperCase()} · {data.startCefr} → {data.targetCefr}
            {data.goalType ? ` · Ziel: ${data.goalType}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRetaking(true)}
            className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            📋 Test wiederholen
          </button>
          <button
            onClick={doExport}
            disabled={exporting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? 'Exportiere …' : '⬇️ Export (JSON)'}
          </button>
        </div>
      </div>

      {retaking && (
        <div className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
          <PlacementTest
            userLanguage={activeUserLanguage}
            lang={activeUserLanguage.targetLang}
            onComplete={() => {
              setRetaking(false);
              load();
            }}
            onSkip={() => setRetaking(false)}
          />
        </div>
      )}

      {/* Gesamtfortschritt */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Gesamtfortschritt</h3>
          <span className="text-sm font-medium text-indigo-600">{data.overall?.percent ?? 0}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all"
            style={{ width: `${data.overall?.percent ?? 0}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {data.overall?.completedUnits ?? 0} von {data.overall?.totalUnits ?? 0} Einheiten ·{' '}
          {(data.overall?.levels || []).join('–')}
        </p>
      </div>

      {/* Skills */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-800">Skill-Profil</h3>
        <div className="space-y-3">
          {(data.skills || []).map((s) => {
            const style = BAND_STYLE[s.band] || BAND_STYLE.unbekannt;
            const pct = s.score ?? 0;
            return (
              <div key={s.skill}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{s.label}</span>
                  <span className={`font-medium ${style.text}`}>
                    {s.score == null ? 'keine Daten' : `${s.score}`}
                    {s.cefrBand ? ` · ${s.cefrBand}` : ''}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fehlerprofil */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-800">Fehlerprofil</h3>
        {(data.errorProfile || []).length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Fehler erfasst – übe Grammatik und Schreiben.</p>
        ) : (
          <div className="space-y-3">
            {data.errorProfile.map((e) => (
              <div key={e.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{e.label}</span>
                  <span className="text-slate-500">{e.count}×</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-rose-400"
                    style={{ width: `${Math.round(e.share * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curriculum je Level */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-800">Curriculum</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(data.curriculum || {}).map(([level, c]) => (
            <div key={level} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-500">{level}</div>
              <div className="mt-1 text-lg font-bold text-slate-800">
                {c.completed}/{c.total}
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Can-do-Report */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-800">Can-do-Report</h3>
        {(data.candoReport || []).length === 0 ? (
          <p className="text-sm text-slate-500">
            Noch keine Can-do-Ziele erreicht. Schließe Einheiten ab, um hier Ziele zu sehen.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.candoReport.slice(0, 30).map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span className="text-slate-700">
                  <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                    {c.level}
                  </span>
                  {c.cando}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Vokabeln + Aktivität */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Wortschatz</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Gesamt" value={data.vocab?.total ?? 0} />
            <Stat label="Fällig" value={data.vocab?.due ?? 0} />
            <Stat label="Lernend" value={data.vocab?.learning ?? 0} />
            <Stat label="Gefestigt" value={data.vocab?.review ?? 0} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Aktivität</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Sitzungen" value={data.activity?.sessions ?? 0} />
            <Stat label="Minuten" value={data.activity?.minutes ?? 0} />
            <Stat label="Versuche" value={data.activity?.attempts ?? 0} />
            <Stat
              label="Grammatik-Genauigkeit"
              value={
                data.grammarAccuracy?.accuracy != null
                  ? `${Math.round(data.grammarAccuracy.accuracy * 100)}%`
                  : '–'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}

export default ProgressDashboard;
