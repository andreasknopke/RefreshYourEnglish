import { useState, useEffect, useRef } from 'react';
import { generateVocabularyChallenge } from '../services/llmService';
import { loadVocabulary, getRandomVocabulary } from '../utils/vocabularyLoader';
import { updateProgress, startSession, completeSession } from '../services/apiService';
import VocabularyEditor from './VocabularyEditor';

function ActionModule({ user }) {
  const [timeLimit, setTimeLimit] = useState(10);
  const [isActive, setIsActive] = useState(false);
  const [currentWord, setCurrentWord] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [difficulty, setDifficulty] = useState('normal');
  const [wordsPerRound, setWordsPerRound] = useState(20);
  const [currentRound, setCurrentRound] = useState([]);
  const [roundProgress, setRoundProgress] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [floatingTranslation, setFloatingTranslation] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slideAnimation, setSlideAnimation] = useState(null);
  const [editingWordId, setEditingWordId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const inputRef = useRef(null);

  // Lade Vokabeln beim Start
  useEffect(() => {
    const initVocabulary = async () => {
      setIsLoading(true);
      const vocab = await loadVocabulary();
      setVocabulary(vocab);
      setIsLoading(false);
    };
    initVocabulary();
  }, []);

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

  useEffect(() => {
    if (floatingTranslation) {
      const timer = setTimeout(() => setFloatingTranslation(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [floatingTranslation]);

  const startGame = async () => {
    setGameStarted(true);
    setCurrentRound([]);
    setRoundProgress(0);
    setScore(0);
    setStreak(0);
    setTotalAnswers(0);
    setShowFeedback(false);
    
    // Start session tracking if user is logged in
    if (user) {
      try {
        const session = await startSession('action');
        setSessionId(session.id);
        setSessionStartTime(Date.now());
      } catch (err) {
        console.error('Failed to start session:', err);
      }
    }
    
    startRound();
  };

  const startRound = () => {
    if (vocabulary.length === 0) return;
    const randomWord = vocabulary[Math.floor(Math.random() * vocabulary.length)];
    setCurrentWord(randomWord);
    setTimeLeft(timeLimit);
    setIsActive(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleTimeout = () => {
    setSlideAnimation('right');
    
    const answer = {
      word: currentWord,
      correct: false,
      timedOut: true
    };
    
    setCurrentRound([...currentRound, answer]);
    setStreak(0);
    setTotalAnswers(totalAnswers + 1);
    
    // Update progress if user is logged in
    if (user && currentWord.id) {
      updateProgress(currentWord.id, false).catch(err => console.error('Failed to update progress:', err));
    }
    
    // Show floating translation
    setFloatingTranslation({ text: currentWord.en, correct: false });
    
    // Check if round is complete
    if (roundProgress + 1 >= wordsPerRound) {
      setTimeout(() => {
        setIsActive(false);
        setSlideAnimation(null);
        setShowFeedback(true);
        
        // Complete session tracking if user is logged in
        if (user && sessionId && sessionStartTime) {
          const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
          const correctCount = currentRound.filter(a => a.correct).length + (answer.correct ? 1 : 0);
          const details = [...currentRound, answer].map(a => ({
            vocabularyId: a.word.id,
            wasCorrect: a.correct,
            responseTimeMs: 0
          }));
          
          completeSession(sessionId, {
            score,
            correctAnswers: correctCount,
            totalAnswers: wordsPerRound,
            durationSeconds,
            details
          }).catch(err => console.error('Failed to complete session:', err));
        }
      }, 600);
    } else {
      setRoundProgress(roundProgress + 1);
      setTimeout(() => {
        setSlideAnimation(null);
        startRound();
      }, 600);
    }
  };

  const handleKnow = () => {
    setIsActive(false);
    setSlideAnimation('left');
    
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
    
    // Update progress if user is logged in
    if (user && currentWord.id) {
      updateProgress(currentWord.id, true).catch(err => console.error('Failed to update progress:', err));
    }
    
    // Show floating translation
    setFloatingTranslation({ text: currentWord.en, correct: true });
    
    // Check if round is complete
    if (roundProgress + 1 >= wordsPerRound) {
      setTimeout(() => {
        setSlideAnimation(null);
        setShowFeedback(true);
        
        // Complete session tracking if user is logged in
        if (user && sessionId && sessionStartTime) {
          const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
          const correctCount = currentRound.filter(a => a.correct).length + 1;
          const details = [...currentRound, answer].map(a => ({
            vocabularyId: a.word.id,
            wasCorrect: a.correct,
            responseTimeMs: 0
          }));
          
          completeSession(sessionId, {
            score: score + points,
            correctAnswers: correctCount,
            totalAnswers: wordsPerRound,
            durationSeconds,
            details
          }).catch(err => console.error('Failed to complete session:', err));
        }
      }, 600);
    } else {
      setRoundProgress(roundProgress + 1);
      setTimeout(() => {
        setSlideAnimation(null);
        startRound();
      }, 600);
    }
  };

  const handleForgot = () => {
    setIsActive(false);
    setSlideAnimation('right');
    
    const answer = {
      word: currentWord,
      correct: false,
      forgot: true
    };
    
    setCurrentRound([...currentRound, answer]);
    setStreak(0);
    setTotalAnswers(totalAnswers + 1);
    
    // Update progress if user is logged in
    if (user && currentWord.id) {
      updateProgress(currentWord.id, false).catch(err => console.error('Failed to update progress:', err));
    }
    
    // Show floating translation
    setFloatingTranslation({ text: currentWord.en, correct: false });
    
    // Check if round is complete
    if (roundProgress + 1 >= wordsPerRound) {
      setTimeout(() => {
        setSlideAnimation(null);
        setShowFeedback(true);
        
        // Complete session tracking if user is logged in
        if (user && sessionId && sessionStartTime) {
          const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
          const correctCount = currentRound.filter(a => a.correct).length;
          const details = [...currentRound, answer].map(a => ({
            vocabularyId: a.word.id,
            wasCorrect: a.correct,
            responseTimeMs: 0
          }));
          
          completeSession(sessionId, {
            score,
            correctAnswers: correctCount,
            totalAnswers: wordsPerRound,
            durationSeconds,
            details
          }).catch(err => console.error('Failed to complete session:', err));
        }
      }, 600);
    } else {
      setRoundProgress(roundProgress + 1);
      setTimeout(() => {
        setSlideAnimation(null);
        startRound();
      }, 600);
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

  const handleVocabularyUpdate = (updatedVocab) => {
    // Update in vocabulary list
    setVocabulary(prev => 
      prev.map(v => v.id === updatedVocab.id ? { ...v, en: updatedVocab.english, de: updatedVocab.german, level: updatedVocab.level } : v)
    );
    
    // Update in current round if present
    setCurrentRound(prev => 
      prev.map(answer => 
        answer.word.id === updatedVocab.id 
          ? { ...answer, word: { ...answer.word, en: updatedVocab.english, de: updatedVocab.german, level: updatedVocab.level } }
          : answer
      )
    );
    
    setEditingWordId(null);
  };

  const handleVocabularyDelete = (deletedId) => {
    // Remove from vocabulary list
    setVocabulary(prev => prev.filter(v => v.id !== deletedId));
    
    // Remove from current round if present
    setCurrentRound(prev => prev.filter(answer => answer.word.id !== deletedId));
    
    setEditingWordId(null);
  };

  const getProgressColor = () => {
    const percentage = (timeLeft / timeLimit) * 100;
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="glass-card rounded-3xl shadow-2xl p-4 md:p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-3">⚡ Action Modus</h2>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3">
            <div className="glass-card bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-3 text-center border border-indigo-100">
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Punkte</p>
              <p className="text-2xl md:text-3xl font-bold gradient-text">{score}</p>
            </div>
            <div className="glass-card bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 text-center border border-green-100">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Serie</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">{streak} 🔥</p>
            </div>
            <div className="glass-card bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 text-center border border-purple-100">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">Genauigkeit</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-600">
                {totalAnswers > 0 ? Math.round((currentRound.filter(a => a.correct).length / totalAnswers) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Difficulty Selector */}
          <div className="flex gap-2">
            {['easy', 'normal', 'hard'].map((level) => (
              <button
                key={level}
                onClick={() => adjustDifficulty(level)}
                className={`flex-1 py-2 px-2 text-xs md:text-sm rounded-lg font-bold transition-all duration-200 ${
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
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-600">Lade Vokabeln...</p>
          </div>
        ) : !gameStarted ? (
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
            <p className="text-base text-gray-600 mb-2 max-w-md mx-auto">
              Teste so viele Wörter wie möglich bevor die Zeit abläuft!
            </p>
            <p className="text-sm text-gray-500 mb-4">
              📚 {vocabulary.length} Vokabeln geladen
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
                <option value={20}>20 Wörter (Standard)</option>
                <option value={30}>30 Wörter</option>
                <option value={50}>50 Wörter</option>
              </select>
            </div>
            
            <button
              onClick={startGame}
              className="btn-secondary text-lg py-3 px-8"
            >
              🚀 Start
            </button>
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
            <div className="glass-card bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-6 mb-4 text-center border-2 border-indigo-300">
              <p className="text-sm text-indigo-700 font-bold mb-2">GESAMT-PUNKTE</p>
              <p className="text-5xl font-bold gradient-text">{score}</p>
            </div>
            
            {/* Detailed Results */}
            <div className="glass-card rounded-2xl p-4 mb-4 max-h-96 overflow-y-auto">
              {/* Falsch beantwortete Wörter */}
              <h4 className="text-lg font-bold text-gray-800 mb-3">❌ Falsch beantwortete Wörter ({currentRound.filter(a => !a.correct).length})</h4>
              {currentRound.filter(a => !a.correct).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🎉</p>
                  <p className="text-green-600 font-bold">Perfekt! Alle Wörter gewusst!</p>
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {currentRound.filter(a => !a.correct).map((answer, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-red-50 border border-red-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">❌</span>
                          {answer.timedOut && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">⏱️ Zeit abgelaufen</span>
                          )}
                        </div>
                      </div>
                      <VocabularyEditor
                        vocabulary={answer.word}
                        onUpdate={handleVocabularyUpdate}
                        onDelete={handleVocabularyDelete}
                        onClose={() => setEditingWordId(null)}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Richtig beantwortete Wörter */}
              {currentRound.filter(a => a.correct).length > 0 && (
                <>
                  <h4 className="text-lg font-bold text-gray-800 mb-3 mt-4">✅ Gewusste Wörter ({currentRound.filter(a => a.correct).length})</h4>
                  <div className="space-y-2">
                    {currentRound.filter(a => a.correct).map((answer, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl bg-green-50 border border-green-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">✅</span>
                          </div>
                          {answer.points && (
                            <span className="font-bold text-green-700">+{answer.points}</span>
                          )}
                        </div>
                        <VocabularyEditor
                          vocabulary={answer.word}
                          onUpdate={handleVocabularyUpdate}
                          onDelete={handleVocabularyDelete}
                          onClose={() => setEditingWordId(null)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={() => {
                setGameStarted(false);
                setShowFeedback(false);
                setCurrentWord(null);
                setCurrentRound([]);
                setRoundProgress(0);
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

            {/* Floating Translation Animation */}
            {floatingTranslation && (
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-float-up pointer-events-none">
                <div className={`text-4xl md:text-6xl font-bold px-8 py-4 rounded-2xl shadow-2xl ${
                  floatingTranslation.correct 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {floatingTranslation.text}
                </div>
              </div>
            )}

            {/* Word to translate */}
            <div className={`glass-card bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 mb-4 text-center border-2 shadow-xl transition-all duration-600 ${
              slideAnimation === 'left' 
                ? 'animate-slide-left bg-green-500 border-green-600' 
                : slideAnimation === 'right' 
                ? 'animate-slide-right bg-red-500 border-red-600' 
                : 'border-green-200'
            }`}>
              <p className={`text-xs font-bold mb-2 uppercase tracking-wide transition-colors ${
                slideAnimation ? 'text-white' : 'text-green-700'
              }`}>
                🇩🇪 Deutsche Vokabel 🇬🇧
              </p>
              <p className={`text-3xl md:text-4xl font-bold mb-4 transition-colors ${
                slideAnimation ? 'text-white' : 'text-gray-800'
              }`}>
                {currentWord?.de}
              </p>
              
              {/* Buttons */}
              {isActive && (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleKnow}
                    className="flex-1 max-w-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl text-lg md:text-xl transition-all shadow-lg hover:scale-105"
                  >
                    ✓ I know
                  </button>
                  <button
                    onClick={handleForgot}
                    className="flex-1 max-w-xs bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl text-lg md:text-xl transition-all shadow-lg hover:scale-105"
                  >
                    ✗ Forgot
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActionModule;
