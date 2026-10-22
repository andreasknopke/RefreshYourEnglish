import { useState, useEffect, useCallback } from 'react';
import v2Client from '../../core/api/v2Client';
import TTSButton from '../../components/TTSButton';
import STTButton from '../../components/STTButton';

const SKILL_LABELS = {
  reading: 'Lesen',
  listening: 'Hören',
  grammar: 'Grammatik',
  vocabulary: 'Wortschatz',
  writing: 'Schreiben',
  speaking: 'Sprechen'
};

/**
 * Adaptiver Einstufungstest. Treibt die start/answer-Schleife gegen die v2-API.
 * Rendert Multiple-Choice, Hör- (mit TTS) und Produktionsaufgaben (Text/Sprache).
 */
function PlacementTest({ userLanguage, lang, onComplete, onSkip }) {
  const [phase, setPhase] = useState('intro'); // intro | running | done
  const [sessionId, setSessionId] = useState(null);
  const [item, setItem] = useState(null);
  const [progress, setProgress] = useState({ answered: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Antwort-Zustand je Item
  const [choice, setChoice] = useState('');
  const [freeText, setFreeText] = useState('');

  const resetAnswer = () => {
    setChoice('');
    setFreeText('');
  };

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await v2Client.startPlacement(userLanguage.id);
      setSessionId(res.sessionId);
      setItem(res.item);
      setProgress(res.progress || { answered: 0 });
      resetAnswer();
      setPhase('running');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [userLanguage.id]);

  const submit = useCallback(async () => {
    if (!item || busy) return;
    const response = item.type === 'produce' ? freeText : choice;
    if (!response) return;
    setBusy(true);
    setError(null);
    try {
      const res = await v2Client.answerPlacement(sessionId, userLanguage.id, item.id, response);
      if (res.done) {
        setResult(res.result);
        setPhase('done');
      } else {
        setItem(res.item);
        setProgress(res.progress || { answered: progress.answered + 1 });
        resetAnswer();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [item, busy, freeText, choice, sessionId, userLanguage.id, progress.answered]);

  // Enter zum Absenden bei Texteingabe
  useEffect(() => {
    if (phase !== 'running' || !item || item.type !== 'produce') return;
    const onKey = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, item, submit]);

  if (phase === 'intro') {
    return (
      <Shell>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Dein Einstufungstest</h2>
        <p className="text-sm text-gray-500 mb-6">
          Beantworte ca. 10–20 Aufgaben. Der Test passt sich deinem Niveau an und findet
          heraus, wo du stehst. Das Ergebnis bestimmt deinen Startpunkt.
        </p>
        {error && <ErrorBox msg={error} />}
        <div className="flex gap-3">
          <button onClick={onSkip} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100">
            Überspringen
          </button>
          <button onClick={start} disabled={busy} className="btn-primary px-6 py-2.5 disabled:opacity-50">
            {busy ? 'Starte…' : 'Test starten'}
          </button>
        </div>
      </Shell>
    );
  }

  if (phase === 'done') {
    return (
      <Shell>
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🎯</div>
          <h2 className="text-xl font-bold text-gray-800">Dein Niveau</h2>
          <div className="text-4xl font-extrabold text-indigo-600 my-2">{result?.overall || 'A1'}</div>
          <p className="text-sm text-gray-500">Wir starten genau hier mit deinem Lernpfad.</p>
        </div>
        <div className="space-y-2 mb-6">
          {result?.skills &&
            Object.entries(result.skills).map(([skill, s]) => (
              <div key={skill} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm font-medium text-gray-700">{SKILL_LABELS[skill] || skill}</span>
                <span className="text-sm font-bold text-indigo-600">{s.cefr_band}</span>
              </div>
            ))}
        </div>
        <button onClick={() => onComplete(result)} className="btn-primary w-full py-3">
          Los geht’s
        </button>
      </Shell>
    );
  }

  // running
  return (
    <Shell>
      <div className="flex items-center justify-between mb-4 text-xs text-gray-400">
        <span>{SKILL_LABELS[item.skill] || item.skill}</span>
        <span>Frage {progress.answered + 1}</span>
      </div>

      {item.type === 'listen' && (
        <div className="mb-4 flex items-center gap-3">
          <TTSButton text={item.audioText || item.prompt} language={lang} />
          <span className="text-sm text-gray-500">Hör zu und antworte</span>
        </div>
      )}

      <p className="text-lg font-semibold text-gray-800 mb-4">
        {item.type === 'listen' ? 'Was hast du verstanden?' : item.prompt}
      </p>

      {(item.type === 'mc' || item.type === 'listen') && (
        <div className="space-y-2 mb-4">
          {(item.options || []).map((opt) => (
            <button
              key={opt}
              onClick={() => setChoice(opt)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                choice === opt
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {item.type === 'produce' && (
        <div className="mb-4">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Antworte in der Zielsprache…"
            rows={3}
            className="w-full p-3 rounded-xl border border-gray-200 resize-none"
            autoFocus
          />
          <div className="mt-2">
            <STTButton
              language={lang}
              onTranscript={(text) => setFreeText((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={busy || !(item.type === 'produce' ? freeText : choice)}
          className="btn-primary px-6 py-2.5 disabled:opacity-50"
        >
          {busy ? '…' : 'Antwort →'}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="glass-card rounded-3xl p-6 shadow-xl">{children}</div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{msg}</div>;
}

export default PlacementTest;
