import { useState, useEffect } from 'react';
import { getDueFlashcards, reviewFlashcard, removeFromFlashcardDeck, getFlashcardStats } from '../services/apiService';
import apiService from '../services/apiService';

function VocabularyTrainer({ user }) {
  const [stats, setStats] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  useEffect(() => {
    setSessionStartTime(Date.now());
    loadFlashcards();
    loadStats();
  }, []);

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const data = await getDueFlashcards();
      setFlashcards(data.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Error loading flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getFlashcardStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleReview = async (quality) => {
    if (flashcards.length === 0) return;

    setReviewing(true);
    const currentCard = flashcards[currentIndex];

    try {
      await reviewFlashcard(currentCard.flashcard_id, quality);
      
      // Zeige Erfolg-Animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 500);

      // Nächste Karte oder Ende
      const newFlashcards = flashcards.filter((_, idx) => idx !== currentIndex);
      setFlashcards(newFlashcards);
      setIsFlipped(false);

      // Track activity für Gamification
      if (user && sessionStartTime) {
        const minutesPracticed = Math.round((Date.now() - sessionStartTime) / 60000);
        const secondsPracticed = 10; // 10 Sekunden pro Flashcard
        if (minutesPracticed > 0 || secondsPracticed > 0) {
          try {
            await apiService.trackActivity(Math.max(minutesPracticed, secondsPracticed / 60));
            setSessionStartTime(Date.now()); // Reset für nächste Messung
          } catch (error) {
            console.error('Failed to track activity:', error);
          }
        }
      }

      if (newFlashcards.length === 0) {
        // Alle Karten durch - Stats neu laden
        await loadStats();
      } else if (currentIndex >= newFlashcards.length) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
      alert('Fehler beim Speichern der Bewertung');
    } finally {
      setReviewing(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Möchtest du diese Vokabel aus dem Trainer entfernen?')) return;

    const currentCard = flashcards[currentIndex];
    try {
      await removeFromFlashcardDeck(currentCard.flashcard_id);
      
      const newFlashcards = flashcards.filter((_, idx) => idx !== currentIndex);
      setFlashcards(newFlashcards);
      setIsFlipped(false);

      if (currentIndex >= newFlashcards.length) {
        setCurrentIndex(Math.max(0, newFlashcards.length - 1));
      }

      await loadStats();
    } catch (error) {
      console.error('Error removing flashcard:', error);
      alert('Fehler beim Entfernen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header mit Statistiken */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{stats?.total || 0}</div>
          <div className="text-sm text-gray-600">Gesamt</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{stats?.due || 0}</div>
          <div className="text-sm text-gray-600">Fällig</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">{stats?.learning || 0}</div>
          <div className="text-sm text-gray-600">Lernend</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-green-500">{stats?.mastered || 0}</div>
          <div className="text-sm text-gray-600">Gemeistert</div>
        </div>
      </div>

      {flashcards.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Sehr gut!
          </h2>
          <p className="text-gray-600 mb-6">
            Du hast alle fälligen Vokabeln für heute gelernt!
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Aktualisieren
          </button>
        </div>
      ) : (
        <>
          {/* Fortschrittsanzeige */}
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-600">
              Karte {currentIndex + 1} von {flashcards.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ◀ Zurück
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(flashcards.length - 1, currentIndex + 1))}
                disabled={currentIndex === flashcards.length - 1}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Weiter ▶
              </button>
            </div>
          </div>

          {/* Flashcard */}
          <div 
            className={`relative h-72 md:h-80 cursor-pointer perspective-1000 ${showSuccess ? 'animate-pulse' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div 
              className={`absolute w-full h-full transition-all duration-500 transform-style-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Vorderseite (Deutsch) */}
              <div className="absolute w-full h-full backface-hidden">
                <div className="glass-card h-full flex flex-col items-center justify-center p-4">
                  <div className="text-xs text-gray-500 mb-2">🇩🇪 Deutsch</div>
                  <div className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 text-center">
                    {currentCard.german}
                  </div>
                  <div className="text-xs text-gray-400 mt-4">
                    Klicke zum Umdrehen
                  </div>
                  <div className="mt-3 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                    {currentCard.level}
                  </div>
                </div>
              </div>

              {/* Rückseite (Englisch) */}
              <div className="absolute w-full h-full backface-hidden rotate-y-180">
                <div className="glass-card h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50">
                  <div className="text-xs text-gray-500 mb-2">🇬🇧 Englisch</div>
                  <div className="text-3xl md:text-4xl font-bold text-indigo-700 mb-4 text-center">
                    {currentCard.english}
                  </div>
                  <div className="text-xs text-gray-400">
                    Wie gut kanntest du diese Vokabel?
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bewertungs-Buttons (nur wenn umgedreht) */}
          {isFlipped && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              <button
                onClick={() => handleReview(0)}
                disabled={reviewing}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50"
              >
                <div className="text-xl">😵</div>
                <div className="text-[10px]">Keine</div>
              </button>
              <button
                onClick={() => handleReview(3)}
                disabled={reviewing}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50"
              >
                <div className="text-xl">🤔</div>
                <div className="text-[10px]">Schwer</div>
              </button>
              <button
                onClick={() => handleReview(4)}
                disabled={reviewing}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50"
              >
                <div className="text-xl">😊</div>
                <div className="text-[10px]">Gut</div>
              </button>
              <button
                onClick={() => handleReview(5)}
                disabled={reviewing}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50"
              >
                <div className="text-xl">🎯</div>
                <div className="text-[10px]">Perfekt</div>
              </button>
            </div>
          )}

          {/* Info & Aktionen */}
          <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-semibold">Wiederholungen:</span> {currentCard.repetitions} | 
              <span className="font-semibold ml-2">Intervall:</span> {currentCard.interval_days} Tag(e)
            </div>
            <button
              onClick={handleRemove}
              className="text-red-500 hover:text-red-700 font-semibold"
            >
              🗑️ Aus Trainer entfernen
            </button>
          </div>

          {/* Tastatur-Hinweis */}
          <div className="mt-8 text-center text-sm text-gray-400">
            💡 Tipp: Klicke auf die Karte um sie umzudrehen
          </div>
        </>
      )}
    </div>
  );
}

export default VocabularyTrainer;
