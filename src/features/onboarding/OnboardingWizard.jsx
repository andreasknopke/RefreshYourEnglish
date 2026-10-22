import { useState } from 'react';
import { useLanguage } from '../../core/language/LanguageContext';

const GOALS = [
  { value: 'reisen', label: 'Reisen', emoji: '✈️' },
  { value: 'alltag', label: 'Alltag', emoji: '🏠' },
  { value: 'arbeit', label: 'Arbeit', emoji: '💼' },
  { value: 'studium', label: 'Studium', emoji: '🎓' },
  { value: 'pruefung', label: 'Prüfung', emoji: '📝' },
  { value: 'familie', label: 'Familie/Partner', emoji: '❤️' }
];

const TARGETS = ['A2', 'B1', 'B2', 'C1'];
const TIME_BUDGETS = [15, 30, 45, 60];
const INTERESTS = [
  'Kochen', 'Reisen', 'Fußball', 'Musik', 'Film', 'Geschichte',
  'Kunst', 'Technik', 'Natur', 'Wirtschaft', 'Gesundheit', 'Bücher'
];

const TOTAL_STEPS = 6;

/**
 * Onboarding-Wizard: Zielsprache, Muttersprache, Ziel, Zielniveau, Zeitbudget,
 * Interessen, Einstufungs-Entscheidung. Legt am Ende die Zielsprache an.
 */
function OnboardingWizard({ onComplete, onCancel }) {
  const { packs, createLanguage } = useLanguage();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    targetLang: '',
    nativeLang: 'de',
    goalType: 'alltag',
    targetCefr: 'B1',
    dailyMinutes: 30,
    interests: [],
    wantsPlacement: true
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleInterest = (i) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i].slice(0, 5)
    }));

  const canNext = () => {
    if (step === 0) return !!form.targetLang;
    if (step === 5) return true;
    return true;
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await createLanguage({
        targetLang: form.targetLang,
        nativeLang: form.nativeLang,
        goalType: form.goalType,
        targetCefr: form.targetCefr,
        dailyMinutes: form.dailyMinutes,
        interests: form.interests
      });
      onComplete({ userLanguage: created, wantsPlacement: form.wantsPlacement });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else finish();
  };

  const selectedPack = packs.find((p) => p.code === form.targetLang);

  return (
    <div className="max-w-lg mx-auto">
      <div className="glass-card rounded-3xl p-6 shadow-xl">
        {/* Fortschritt */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
            Abbrechen
          </button>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-all ${
                  i <= step ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {step === 0 && (
          <Step title="Welche Sprache möchtest du lernen?" subtitle="Wähle deine Zielsprache">
            <div className="grid grid-cols-2 gap-3">
              {packs.map((p) => (
                <button
                  key={p.code}
                  onClick={() => set({ targetLang: p.code })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    form.targetLang === p.code
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-gray-800">{p.name}</div>
                  <div className="text-sm text-gray-500">{p.nativeName}</div>
                </button>
              ))}
              {packs.length === 0 && (
                <p className="col-span-2 text-sm text-gray-500">
                  Keine Language Packs verfügbar. Backend prüfen.
                </p>
              )}
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step title="Muttersprache" subtitle="In welcher Sprache sollen wir dir erklären?">
            <select
              value={form.nativeLang}
              onChange={(e) => set({ nativeLang: e.target.value })}
              className="w-full p-3 rounded-xl border border-gray-200"
            >
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
            </select>
          </Step>
        )}

        {step === 2 && (
          <Step title="Was ist dein Ziel?" subtitle="Wofür möchtest du die Sprache nutzen?">
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => set({ goalType: g.value })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    form.goalType === g.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="font-semibold text-gray-800 mt-1">{g.label}</div>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step title="Wohin willst du?" subtitle="Dein angestrebtes Niveau (CEFR)">
            <div className="grid grid-cols-4 gap-2">
              {TARGETS.map((t) => (
                <button
                  key={t}
                  onClick={() => set({ targetCefr: t })}
                  className={`py-4 rounded-2xl border-2 font-bold transition-all ${
                    form.targetCefr === t
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Ehrliche Einschätzung: Von A1 nach B1 brauchst du bei 30 Min/Tag etwa 9–12 Monate
              konsequentem Lernen.
            </p>
          </Step>
        )}

        {step === 4 && (
          <Step title="Wie viel Zeit pro Tag?" subtitle="Dein tägliches Zeitbudget">
            <div className="grid grid-cols-4 gap-2">
              {TIME_BUDGETS.map((m) => (
                <button
                  key={m}
                  onClick={() => set({ dailyMinutes: m })}
                  className={`py-4 rounded-2xl border-2 font-bold transition-all ${
                    form.dailyMinutes === m
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {m}
                  <span className="block text-xs font-normal text-gray-400">Min</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step title="Interessen & Einstieg" subtitle="Themen für deine Lerninhalte (max. 5)">
            <div className="flex flex-wrap gap-2 mb-5">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  onClick={() => toggleInterest(i)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    form.interests.includes(i)
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="placement"
                  checked={form.wantsPlacement}
                  onChange={() => set({ wantsPlacement: true })}
                />
                <div>
                  <div className="font-semibold text-gray-800 text-sm">Einstufungstest machen</div>
                  <div className="text-xs text-gray-500">Dauert ~10 Min, findet dein Niveau</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="placement"
                  checked={!form.wantsPlacement}
                  onChange={() => set({ wantsPlacement: false })}
                />
                <div>
                  <div className="font-semibold text-gray-800 text-sm">Ich fange bei A1 an</div>
                  <div className="text-xs text-gray-500">Direkt loslegen ohne Test</div>
                </div>
              </label>
            </div>

            {selectedPack && (
              <div className="mt-5 p-4 rounded-2xl bg-indigo-50 text-sm text-gray-700">
                <span className="font-semibold">{selectedPack.name}</span> · Ziel {form.targetCefr} ·{' '}
                {form.dailyMinutes} Min/Tag
                {form.interests.length > 0 && <> · {form.interests.slice(0, 3).join(', ')}</>}
              </div>
            )}
          </Step>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
            className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100"
          >
            {step === 0 ? 'Abbrechen' : 'Zurück'}
          </button>
          <button
            onClick={next}
            disabled={!canNext() || saving}
            className="btn-primary px-6 py-2.5 disabled:opacity-50"
          >
            {saving ? 'Speichern…' : step === TOTAL_STEPS - 1 ? 'Los geht’s' : 'Weiter →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

export default OnboardingWizard;
