import { useState, useEffect, useRef } from 'react';
import { generateVocabularyChallenge } from '../services/llmService';
import apiService from '../services/apiService';
import VocabularyEditor from './VocabularyEditor';
import TTSButton from './TTSButton';
import ttsService from '../services/ttsService';

function ActionModule({ user }) {
  const [timeLimit, setTimeLimit] = useState(10);
  const [isActive, setIsActive] = useState(false);
  const [currentWord, setCurrentWord] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [difficulty, setDifficulty] = useState('normal');
  const [wordsPerRound, setWordsPerRound] = useState(20);
  const [currentRound, setCurrentRound] = useState([]);
  const [roundProgress, setRoundProgress] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [vocabulary, setVocabulary] = useState([]);
  const [isLoadingVocabulary, setIsLoadingVocabulary] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedVocab, setSelectedVocab] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [addedToTrainer, setAddedToTrainer] = useState(new Set());
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [autoPlayTTS, setAutoPlayTTS] = useState(() => {
    const saved = localStorage.getItem('actionModule_autoPlayTTS');
    return saved === 'true';
  });
  const inputRef = useRef(null);

  // Funktion zum Hinzufügen einer Vokabel zum Trainer mit visueller Rückmeldung
  const handleAddToTrainer = async (vocabId) => {
    try {
      await apiService.addToFlashcardDeck(vocabId);
      setAddedToTrainer(prev => new Set([...prev, vocabId]));
      setTimeout(() => {
        setAddedToTrainer(prev => {
          const newSet = new Set(prev);
          newSet.delete(vocabId);
          return newSet;
        });
      }, 3000);
    } catch (err) {
      if (err.message.includes('already in flashcard deck')) {
        alert('Diese Vokabel ist bereits im Trainer!');
      } else {
        alert('Fehler beim Hinzufügen: ' + err.message);
      }
    }
  };

  // Funktion zum Hinzufügen mehrerer Vokabeln zum Trainer
  const handleAddMultipleToTrainer = async (words) => {
    try {
      const results = await Promise.allSettled(
        words.map(word => apiService.addToFlashcardDeck(word.id))
      );
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      if (successCount > 0) {
        alert(`${successCount} Vokabel${successCount > 1 ? 'n' : ''} zum Trainer hinzugefügt!`);
      }
      if (failCount > 0) {
        console.error(`${failCount} Vokabeln konnten nicht hinzugefügt werden`);
      }
    } catch (error) {
      console.error('Failed to add to trainer:', error);
      alert('Fehler beim Hinzufügen zum Trainer');
    }
  };

  // Lade Vokabeln von der API
  useEffect(() => {
    const loadVocabulary = async () => {
      try {
        setIsLoadingVocabulary(true);
        setLoadError(null);
        const data = await apiService.getVocabulary();
        console.log('Loaded vocabulary from API:', data);
        
        // API gibt { count: number, vocabulary: array } zurück
        const vocabArray = data.vocabulary || data;
        
        if (!Array.isArray(vocabArray)) {
          throw new Error('API response is not an array');
        }
        
        console.log('Processing', vocabArray.length, 'vocabulary items');
        
        // Konvertiere API-Format zu Component-Format
        const formattedVocab = vocabArray.map(v => ({
          id: v.id,
          de: v.german,
          en: v.english,
          level: v.level
        }));
        setVocabulary(formattedVocab);
      } catch (error) {
        console.error('Failed to load vocabulary:', error);
        setLoadError(error.message || 'Unbekannter Fehler beim Laden der Vokabeln');
        setVocabulary([]);
      } finally {
        setIsLoadingVocabulary(false);
      }
    };
    loadVocabulary();
  }, []);

  // Save autoPlayTTS preference to localStorage
  useEffect(() => {
    localStorage.setItem('actionModule_autoPlayTTS', autoPlayTTS);
  }, [autoPlayTTS]);

  // Auto-play TTS when card is flipped to English
  useEffect(() => {
    if (autoPlayTTS && isFlipped && currentWord) {
      ttsService.speak(currentWord.en, 'en').catch(err => 
        console.error('Auto-play TTS failed:', err)
      );
    }
  }, [isFlipped, autoPlayTTS, currentWord]);

  useEffect(() => {
    let timer;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimeout();
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft]);



  const startGame = () => {
    setGameStarted(true);
    setCurrentRound([]);
    setRoundProgress(0);
    setScore(0);
    setStreak(0);
    setTotalAnswers(0);
    setCorrectAnswers(0);
    setShowFeedback(false);
    setSessionStartTime(Date.now());
    startRound();
  };

  const startRound = () => {
    if (vocabulary.length === 0) {
      console.error('No vocabulary available');
      return;
    }
    const randomWord = vocabulary[Math.floor(Math.random() * vocabulary.length)];
    setCurrentWord(randomWord);
    setTimeLeft(timeLimit);
    setIsActive(true);
    setIsFlipped(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBuzzer = () => {
    setIsActive(false);
    setIsFlipped(true);
  };

  const handleTimeout = async () => {
    const answer = {
      word: currentWord,
      correct: false,
      timedOut: true
    };
    
    setCurrentRound([...currentRound, answer]);
    setStreak(0);
    setTotalAnswers(totalAnswers + 1);
    
    // Speichere Fortschritt in der API (Timeout = falsche Antwort)
    if (currentWord.id) {
      try {
        await apiService.updateProgress(currentWord.id, false);
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }

    // Keine Zeitgutschrift für Timeouts
    
    // Check if round is complete
    if (roundProgress + 1 >= wordsPerRound) {
      setIsActive(false);
      setShowFeedback(true);
    } else {
      setRoundProgress(roundProgress + 1);
      setIsFlipped(false);
      startRound();
    }
  };

  const handleKnow = async () => {
    const timeBonus = Math.floor(timeLeft / 2);
    const streakBonus = streak >= 5 ? 5 : 0;
    const points = 10 + timeBonus + streakBonus;
    
    const answer = {
      word: currentWord,
      correct: true,
      points: points,
      timeBonus: timeBonus,
      streakBonus: streakBonus
    };
    
    setCurrentRound([...currentRound, answer]);
    setScore(score + points);
    setStreak(streak + 1);
    setTotalAnswers(totalAnswers + 1);
    setCorrectAnswers(correctAnswers + 1);
    
    // Speichere Fortschritt in der API
    if (currentWord.id) {
      try {
        await apiService.updateProgress(currentWord.id, true);
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }

    // Track activity für Gamification (10 Sekunden pro Karte)
    if (user) {
      try {
        const secondsToAdd = 10 / 60; // 10 Sekunden als Minuten
        console.log('🎮 Tracking activity (ActionModule - Know):', { secondsToAdd, user: user.username });
        const result = await apiService.trackActivity(secondsToAdd);
        console.log('✅ Activity tracked:', result);
      } catch (error) {
        console.error('❌ Failed to track activity:', error);
      }
    }
    
    // Check if round is complete
    if (roundProgress + 1 >= wordsPerRound) {
      setShowFeedback(true);
    } else {
      setRoundProgress(roundProgress + 1);
      setIsFlipped(false);
      startRound();
    }
  };

  const handleForgot = async () => {
    const answer = {
      word: currentWord,
      correct: false,
      forgot: true
    };
    
    setCurrentRound([...currentRound, answer]);
    setStreak(0);
    setTotalAnswers(totalAnswers + 1);
    
    // Speichere Fortschrift in der API (falsche Antwort)
    if (currentWord.id) {
      try {
        await apiService.updateProgress(currentWord.id, false);
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }

    // Keine Zeitgutschrift für falsche Antworten
    
    // Check if round is complete
    if (roundProgress + 1 >= wordsPerRound) {
      setShowFeedback(true);
    } else {
      setRoundProgress(roundProgress + 1);
      setIsFlipped(false);
      startRound();
    }
  };

  const adjustDifficulty = (newDifficulty) => {
    setDifficulty(newDifficulty);
    switch(newDifficulty) {
      case 'easy':
        setTimeLimit(15);
        break;
      case 'normal':
        setTimeLimit(10);
        break;
      case 'hard':
        setTimeLimit(5);
        break;
      default:
        setTimeLimit(10);
    }
  };

  const getProgressColor = () => {
    const percentage = (timeLeft / timeLimit) * 100;
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="glass-card rounded-2xl shadow-xl p-3 md:p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
        {/* Header */}
        <div className="mb-3">
          <h2 className="text-xl md:text-2xl font-bold gradient-text mb-2">⚡ Action Modus</h2>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="glass-card bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-2 text-center border border-indigo-100">
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Punkte</p>
              <p className="text-xl md:text-2xl font-bold gradient-text">{score}</p>
            </div>
            <div className="glass-card bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 text-center border border-green-100">
              <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Serie</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">{streak} 🔥</p>
            </div>
            <div className="glass-card bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2 text-center border border-purple-100">
              <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">%</p>
              <p className="text-xl md:text-2xl font-bold text-purple-600">
                {totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Difficulty Selector */}
          <div className="flex gap-1">
            {['easy', 'normal', 'hard'].map((level) => (
              <button
                key={level}
                onClick={() => adjustDifficulty(level)}
                className={`flex-1 py-1.5 px-1 text-[10px] md:text-xs rounded-lg font-bold transition-all duration-200 ${
                  difficulty === level
                    ? level === 'easy' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                      : level === 'normal'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="hidden md:inline">{level === 'easy' ? '🟢 Einfach (15s)' : level === 'normal' ? '🟡 Normal (10s)' : '🔴 Schwer (5s)'}</span>
                <span className="md:hidden">{level === 'easy' ? '🟢 15s' : level === 'normal' ? '🟡 10s' : '🔴 5s'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game Area */}
        {!gameStarted ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">
              Bereit für den Action Modus?
            </h3>
            <p className="text-base text-gray-600 mb-4 max-w-md mx-auto">
              Teste so viele Wörter wie möglich bevor die Zeit abläuft!
            </p>
            
            {isLoadingVocabulary ? (
              <div className="mb-6">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-3 text-gray-600">Lade Vokabeln...</p>
              </div>
            ) : loadError ? (
              <div className="mb-6">
                <p className="text-red-600 font-bold">⚠️ Fehler beim Laden der Vokabeln</p>
                <p className="text-gray-600 text-sm mt-2">{loadError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  Neu laden
                </button>
              </div>
            ) : vocabulary.length === 0 ? (
              <div className="mb-6">
                <p className="text-red-600 font-bold">⚠️ Keine Vokabeln verfügbar</p>
                <p className="text-gray-600 text-sm mt-2">Die API hat keine Vokabeln zurückgegeben</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  {vocabulary.length} Vokabeln geladen
                </p>
                
                {/* Words per round selector */}
                <div className="mb-6 max-w-xs mx-auto">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Anzahl der Wörter pro Runde:
                  </label>
                  <select
                    value={wordsPerRound}
                    onChange={(e) => setWordsPerRound(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none bg-white font-bold text-gray-800"
                  >
                    <option value={5}>5 Wörter</option>
                    <option value={10}>10 Wörter</option>
                    <option value={15}>15 Wörter</option>
                    <option value={20}>20 Wörter</option>
                    <option value={30}>30 Wörter</option>
                    <option value={50}>50 Wörter</option>
                  </select>
                </div>
                
                <button
                  onClick={startGame}
                  disabled={isLoadingVocabulary || vocabulary.length === 0}
                  className="btn-secondary text-lg py-3 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 Start
                </button>
              </>
            )}
          </div>
        ) : showFeedback ? (
          // Final Results Screen
          <div className="py-4">
            <div className="text-center mb-6">
              <h3 className="text-2xl md:text-3xl font-bold gradient-text mb-2">🎉 Runde abgeschlossen!</h3>
              <p className="text-lg text-gray-700">
                Du hast <span className="font-bold text-indigo-600">{currentRound.filter(a => a.correct).length}</span> von <span className="font-bold">{wordsPerRound}</span> Wörtern gewusst!
              </p>
            </div>
            
            {/* Final Score */}
            <div className="glass-card bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-6 mb-4 border-2 border-indigo-300">
              <p className="text-sm text-indigo-700 font-bold mb-2">GESAMT-PUNKTE</p>
              <p className="text-5xl font-bold gradient-text">{score}</p>
            </div>
            
            {/* Detailed Results */}
            <div className="glass-card rounded-2xl p-4 mb-4 max-h-64 overflow-y-auto">
              <h4 className="text-lg font-bold text-gray-800 mb-3">📊 Detaillierte Auswertung</h4>
              <div className="space-y-2">
                {currentRound.map((answer, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      answer.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">{answer.correct ? '✅' : '❌'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{answer.word.de}</p>
                        <p className="text-sm text-gray-600 truncate">{answer.word.en}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {answer.correct && answer.points && (
                        <span className="font-bold text-green-700 mr-2">+{answer.points}</span>
                      )}
                      <button
                        onClick={() => handleAddToTrainer(answer.word.id)}
                        className={`px-2 py-1 text-sm rounded-lg transition-all ${
                          addedToTrainer.has(answer.word.id)
                            ? 'bg-green-500 text-white scale-110'
                            : 'bg-purple-500 hover:bg-purple-600 text-white'
                        }`}
                        title="Zum Vokabeltrainer hinzufügen"
                      >
                        📚
                      </button>
                      <button
                        onClick={() => setSelectedVocab(answer.word)}
                        className="px-2 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                        title="Vokabel bearbeiten"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => {
                setGameStarted(false);
                setShowFeedback(false);
                setCurrentWord(null);
                setCurrentRound([]);
                setRoundProgress(0);
                setScore(0);
                setStreak(0);
                setTotalAnswers(0);
                setCorrectAnswers(0);
              }}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl text-base md:text-lg transition-all shadow-lg hover:scale-105"
            >
              Neue Runde starten →
            </button>
          </div>
        ) : (
          <div>
            {/* Progress Indicator */}
            <div className="mb-4 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-600 uppercase">Fortschritt</span>
              <span className="text-sm font-bold text-indigo-600">{roundProgress + 1} / {wordsPerRound}</span>
            </div>
            
            {/* Timer */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">⏱️ Zeit übrig</span>
                <span className={`text-2xl font-bold text-gray-800 ${timeLeft <= 3 ? 'animate-pulse text-red-600' : ''}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                />
              </div>
            </div>

            {/* Flashcard */}
            <div className="relative h-64 sm:h-80 md:h-96">
              <div 
                className={`absolute w-full h-full transition-all duration-500 transform-style-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Vorderseite (Deutsch) */}
                <div className="absolute w-full h-full backface-hidden">
                  <div className="glass-card h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 border-2 border-green-200">
                    <div className="text-xs sm:text-sm text-green-700 font-bold mb-2 sm:mb-4">🇩🇪 Deutsche Vokabel</div>
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-2 sm:mb-4 text-center">
                      {currentWord?.de}
                    </div>
                    <div className="mt-2 sm:mt-4 px-2 sm:px-3 py-0.5 sm:py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs sm:text-sm font-semibold">
                      {currentWord?.level}
                    </div>
                  </div>
                </div>

                {/* Rückseite (Englisch) */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180">
                  <div className="glass-card h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-indigo-50 to-purple-50">
                    {isFlipped ? (
                      <>
                        <div className="text-xs sm:text-sm text-indigo-700 font-bold mb-2 sm:mb-4">🇬🇧 Englisch</div>
                        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8">
                          <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-indigo-700 text-center animate-slide-in">
                            {currentWord?.en}
                          </div>
                          <TTSButton text={currentWord?.en} language="en" />
                        </div>
                        
                        {/* Bewertungs-Buttons */}
                        <div className="flex gap-2 sm:gap-4 justify-center w-full max-w-lg animate-slide-in">
                          <button
                            onClick={handleKnow}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6 rounded-xl text-base sm:text-lg md:text-xl transition-all shadow-lg hover:scale-105"
                          >
                            ✓ Know
                          </button>
                          <button
                            onClick={handleForgot}
                            className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-2 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6 rounded-xl text-base sm:text-lg md:text-xl transition-all shadow-lg hover:scale-105"
                          >
                            ✗ Forgot
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-400">Drücke den Buzzer...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Buzzer Button */}
            {isActive && !isFlipped && (
              <div className="text-center mt-2 sm:mt-4">
                {/* Auto-Play Toggle */}
                <div className="mb-2 sm:mb-3">
                  <button
                    onClick={() => setAutoPlayTTS(!autoPlayTTS)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      autoPlayTTS 
                        ? 'bg-green-500 text-white shadow-lg' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {autoPlayTTS ? '🔊 Auto-Play: AN' : '🔇 Auto-Play: AUS'}
                  </button>
                </div>
                
                <button
                  onClick={handleBuzzer}
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-3 sm:py-4 md:py-6 px-6 sm:px-8 md:px-12 rounded-full text-xl sm:text-2xl md:text-3xl transition-all shadow-lg hover:scale-110 animate-pulse"
                >
                  ⚡ BUZZER
                </button>
                <p className="text-sm text-gray-500 mt-3">Drücke den Buzzer, wenn du bereit bist!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vocabulary Editor Modal */}
      {selectedVocab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Vokabel bearbeiten</h3>
            <VocabularyEditor
              vocabulary={selectedVocab}
              onUpdate={(updated) => {
                // Update vocabulary in list
                setVocabulary(vocab => 
                  vocab.map(v => v.id === updated.id ? {
                    ...v,
                    en: updated.english,
                    de: updated.german,
                    level: updated.level
                  } : v)
                );
                // Update in currentRound if exists
                setCurrentRound(round =>
                  round.map(answer => 
                    answer.word.id === updated.id ? {
                      ...answer,
                      word: {
                        ...answer.word,
                        en: updated.english,
                        de: updated.german,
                        level: updated.level
                      }
                    } : answer
                  )
                );
                // Update currentWord if it's the selected one
                if (currentWord?.id === updated.id) {
                  setCurrentWord({
                    ...currentWord,
                    en: updated.english,
                    de: updated.german,
                    level: updated.level
                  });
                }
                setSelectedVocab(null);
              }}
              onDelete={(id) => {
                setVocabulary(vocab => vocab.filter(v => v.id !== id));
                setSelectedVocab(null);
              }}
              onClose={() => setSelectedVocab(null)}
              onAddedToTrainer={(id) => {
                setAddedToTrainer(prev => new Set([...prev, id]));
                setTimeout(() => {
                  setAddedToTrainer(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                  });
                }, 3000);
              }}
            />
            <button
              onClick={() => setSelectedVocab(null)}
              className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              ✕ Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionModule;
