import { useState, useEffect, useCallback } from 'react';
import v2Client from '../../core/api/v2Client';
import { useLanguage } from '../../core/language/LanguageContext';
import ttsService from '../../services/ttsService';

/**
 * Reader-Modul (Phase 3). Listet Lesetexte mit Coverage, zeigt sie mit
 * klickbaren Wörtern (bekannt/unbekannt), Glossar-Popup, Satz-Mining und
 * Segment-Audio (Browser-TTS).
 */
function ReaderModule() {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      </div>

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
