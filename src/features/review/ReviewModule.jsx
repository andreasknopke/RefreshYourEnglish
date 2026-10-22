import { useState, useEffect, useCallback, useRef } from 'react';
import v2Client from '../../core/api/v2Client';
import { useLanguage } from '../../core/language/LanguageContext';
import TTSButton from '../../components/TTSButton';

const RATINGS = [
  { value: 1, label: 'Nochmal', color: 'bg-red-500 hover:bg-red-600' },
  { value: 2, label: 'Schwer', color: 'bg-orange-500 hover:bg-orange-600' },
  { value: 3, label: 'Gut', color: 'bg-green-500 hover:bg-green-600' },
  { value: 4, label: 'Leicht', color: 'bg-blue-500 hover:bg-blue-600' }
];

/**
 * SRS-Review-Modul (Phase 2). Zeigt die fälligen Karten der aktiven Sprache.
 * Karten-Typen: recognize (Lemma→Bedeutung), produce (Bedeutung→Lemma),
 * audio (Hören→Bedeutung), cloze (Lücke im Beispielsatz).
 */
function ReviewModule() {
  const { activeUserLanguage, activePack } = useLanguage();
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [typed, setTyped] = useState('');
  const shownAt = useRef(Date.now());

  const lang = activeUserLanguage?.targetLang;

  const load = useCallback(async () => {
    if (!activeUserLanguage) return;
    setLoading(true);
    setError(null);
    try {
      const [q, s] = await Promise.all([
        v2Client.getReviewQueue(activeUserLanguage.id, 20),
        v2Client.getVocabStats(activeUserLanguage.id)
      ]);
      setQueue(q.cards || []);
      setStats(s);
      setIdx(0);
      setRevealed(false);
      setTyped('');
      shownAt.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeUserLanguage]);

  useEffect(() => {
    load();
  }, [load]);

  const card = queue[idx];

  const rate = async (rating) => {
    if (!card) return;
    const elapsedMs = Date.now() - shownAt.current;
    try {
      await v2Client.submitReview(activeUserLanguage.id, card.userVocabId, rating, elapsedMs);
      next();
    } catch (err) {
      setError(err.message);
    }
  };

  const next = () => {
    setRevealed(false);
    setTyped('');
    shownAt.current = Date.now();
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
    } else {
      load();
    }
  };

  if (!activeUserLanguage) {
    return <Empty text="Bitte wähle zuerst eine Zielsprache." />;
  }

  if (loading) {
    return <Empty text="Lade Karten…" />;
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="glass-card rounded-3xl p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={load} className="btn-primary px-5 py-2">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="glass-card rounded-3xl p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Alles erledigt!</h3>
          <p className="text-sm text-gray-500 mb-4">
            Keine Karten fällig. {stats?.review ?? 0} Karten im Langzeitgedächtnis.
          </p>
          <button onClick={load} className="btn-primary px-5 py-2">
            Neu prüfen
          </button>
        </div>
      </div>
    );
  }

  const cardType = getCardType(card, idx);
  const sense = card.senses?.[0] || {};
  const translation = sense.translation || '';
  const example = sense.example || '';

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
        <span>
          {idx + 1} / {queue.length}
        </span>
        <span className="uppercase tracking-wide">{cardType}</span>
      </div>

      <div className="glass-card rounded-3xl p-6 shadow-xl min-h-[280px] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {cardType === 'recognize' && (
            <>
              <div className="text-3xl font-bold text-gray-800 mb-1">{card.lemma}</div>
              {card.pos && <div className="text-xs text-gray-400 italic">{card.pos}</div>}
              {card.ipa && <div className="text-sm text-gray-400">/{card.ipa}/</div>}
              <div className="mt-3">
                <TTSButton text={card.lemma} language={lang} />
              </div>
            </>
          )}

          {cardType === 'produce' && (
            <>
              <div className="text-2xl font-semibold text-gray-700 mb-2">{translation}</div>
              <div className="text-xs text-gray-400">
                Wie heißt das auf {activePack?.name || lang}?
              </div>
              {!revealed && (
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setRevealed(true)}
                  placeholder="Eingeben…"
                  className="mt-4 w-full p-3 rounded-xl border border-gray-200 text-center text-lg"
                  autoFocus
                />
              )}
            </>
          )}

          {cardType === 'audio' && (
            <>
              <div className="text-5xl mb-3">🔊</div>
              <TTSButton text={card.lemma} language={lang} />
              <div className="text-xs text-gray-400 mt-2">Hör zu und erinnere dich</div>
            </>
          )}

          {cardType === 'cloze' && (
            <p className="text-xl text-gray-800 leading-relaxed">
              {renderCloze(example, card.lemma)}
            </p>
          )}
        </div>

        {revealed ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="text-center mb-4">
              {cardType === 'recognize' || cardType === 'audio' ? (
                <div className="text-lg font-semibold text-gray-800">{translation}</div>
              ) : (
                <div className="text-lg font-semibold text-gray-800">
                  {card.lemma}
                  {card.pos && (
                    <span className="text-xs text-gray-400 italic ml-1">{card.pos}</span>
                  )}
                </div>
              )}
              {example && <p className="text-sm text-gray-500 mt-1 italic">{example}</p>}
              {cardType === 'produce' && typed && (
                <p className="text-xs mt-2">
                  <span className="text-gray-400">Deine Eingabe:</span>{' '}
                  <span
                    className={
                      normalize(typed) === normalize(card.lemma)
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }
                  >
                    {typed}
                  </span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => rate(r.value)}
                  className={`${r.color} text-white font-semibold py-2.5 rounded-xl text-sm transition-all`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="mt-4 w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600"
          >
            Antwort zeigen
          </button>
        )}
      </div>
    </div>
  );
}

function getCardType(card, idx) {
  if (!card) return 'recognize';
  const hasExample = !!card.senses?.[0]?.example;
  const hasTranslation = !!card.senses?.[0]?.translation;
  const candidates = ['recognize'];
  if (hasTranslation) candidates.push('produce');
  candidates.push('audio');
  if (hasExample) candidates.push('cloze');
  return candidates[idx % candidates.length];
}

function renderCloze(example, lemma) {
  if (!example) return '—';
  const stem = lemma.slice(0, Math.max(3, Math.ceil(lemma.length * 0.7)));
  const re = new RegExp(`\\b${escapeRegex(stem)}\\w*`, 'i');
  if (!re.test(example)) return example;
  const parts = example.split(re);
  return (
    <>
      {parts[0]}
      <span className="inline-block min-w-[80px] border-b-2 border-indigo-400 mx-1 align-bottom" />
      {parts[1]}
    </>
  );
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalize(s) {
  return (s || '').toLowerCase().trim().replace(/[.,!?]/g, '');
}

function Empty({ text }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="glass-card rounded-3xl p-8 text-center text-gray-500">{text}</div>
    </div>
  );
}

export default ReviewModule;
