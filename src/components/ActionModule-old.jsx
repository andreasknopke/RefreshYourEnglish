import { useState, useEffect, useRef } from 'react';

const initialVocabulary = [
  { de: 'Haus', en: 'house' },
  { de: 'Auto', en: 'car' },
  { de: 'Baum', en: 'tree' },
  { de: 'Buch', en: 'book' },
  { de: 'Wasser', en: 'water' },
  { de: 'Sonne', en: 'sun' },
  { de: 'Mond', en: 'moon' },
  { de: 'Tisch', en: 'table' },
  { de: 'Stuhl', en: 'chair' },
  { de: 'Fenster', en: 'window' },
  { de: 'Tür', en: 'door' },
  { de: 'Blume', en: 'flower' },
  { de: 'Katze', en: 'cat' },
  { de: 'Hund', en: 'dog' },
  { de: 'Vogel', en: 'bird' },
];

function ActionModule() {
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
  const inputRef = useRef(null);

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

  const startRound = () => {
    const randomWord = initialVocabulary[Math.floor(Math.random() * initialVocabulary.length)];
    setCurrentWord(randomWord);
    setTimeLeft(timeLimit);
    setIsActive(true);
    setShowFeedback(false);
    setUserAnswer('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleTimeout = () => {
    setIsActive(false);
    setShowFeedback(true);
    setIsCorrect(false);
    setStreak(0);
    setTotalAnswers(totalAnswers + 1);
  };

  const checkAnswer = () => {
    if (!userAnswer.trim()) return;

    setIsActive(false);
    const correct = userAnswer.trim().toLowerCase() === currentWord.en.toLowerCase();
    setIsCorrect(correct);
    setShowFeedback(true);
    setTotalAnswers(totalAnswers + 1);

    if (correct) {
      const timeBonus = Math.floor(timeLeft / 2);
      const streakBonus = streak >= 5 ? 5 : 0;
      const points = 10 + timeBonus + streakBonus;
      setScore(score + points);
      setStreak(streak + 1);
    } else {
      setStreak(0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isActive) {
      checkAnswer();
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
    <motion.div 
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="glass-card rounded-3xl shadow-2xl p-8 md:p-10">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-4xl font-bold gradient-text mb-6">⚡ Action Modus</h2>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <motion.div 
              className="glass-card bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 text-center border border-indigo-100"
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2">Punkte</p>
              <p className="text-4xl font-bold gradient-text">{score}</p>
            </motion.div>
            <motion.div 
              className="glass-card bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center border border-green-100"
              whileHover={{ scale: 1.05, rotate: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-2">Serie</p>
              <p className="text-4xl font-bold text-green-600">{streak} 🔥</p>
            </motion.div>
            <motion.div 
              className="glass-card bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 text-center border border-purple-100"
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-2">Genauigkeit</p>
              <p className="text-4xl font-bold text-purple-600">
                {totalAnswers > 0 ? Math.round((score / (totalAnswers * 10)) * 100) : 0}%
              </p>
            </motion.div>
          </div>

          {/* Difficulty Selector */}
          <div className="flex gap-3">
            {['easy', 'normal', 'hard'].map((level) => (
              <motion.button
                key={level}
                onClick={() => adjustDifficulty(level)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-200 ${
                  difficulty === level
                    ? level === 'easy' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                      : level === 'normal'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {level === 'easy' ? '🟢 Einfach (15s)' : level === 'normal' ? '🟡 Normal (10s)' : '🔴 Schwer (5s)'}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Game Area */}
        <AnimatePresence mode="wait">
          {!currentWord && !isActive ? (
            <motion.div 
              key="start"
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div 
                className="mb-8"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </motion.div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                Bereit für den Action Modus?
              </h3>
              <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
                Übersetze so viele Wörter wie möglich bevor die Zeit abläuft!
              </p>
              <motion.button
                onClick={startRound}
                className="btn-secondary text-xl py-5 px-10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                🚀 Start
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Timer */}
              <motion.div 
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">⏱️ Zeit übrig</span>
                  <motion.span 
                    className="text-3xl font-bold text-gray-800"
                    animate={{ scale: timeLeft <= 3 ? [1, 1.2, 1] : 1 }}
                    transition={{ duration: 0.5, repeat: timeLeft <= 3 ? Infinity : 0 }}
                  >
                    {timeLeft}s
                  </motion.span>
                </div>
                <div className="h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    className={`h-full transition-all duration-300 ${getProgressColor()}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>

              {/* Word to translate */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentWord?.de}
                  className="glass-card bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 rounded-3xl p-12 mb-8 text-center border-2 border-green-200 shadow-xl"
                  initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateY: 90, scale: 0.8 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  <p className="text-sm text-green-700 font-bold mb-4 uppercase tracking-wide">
                    🇩🇪 Übersetze ins Englische 🇬🇧
                  </p>
                  <motion.p 
                    className="text-5xl font-bold text-gray-800"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {currentWord?.de}
                  </motion.p>
                </motion.div>
              </AnimatePresence>

              {/* Input */}
              {isActive && (
                <motion.div 
                  className="mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.input
                    ref={inputRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="input-modern text-2xl text-center font-semibold"
                    placeholder="Deine Antwort..."
                    autoFocus
                    whileFocus={{ scale: 1.02 }}
                  />
                  <motion.button
                    onClick={checkAnswer}
                    className="w-full mt-6 btn-secondary text-xl py-4"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ✓ Antworten
                  </motion.button>
                </motion.div>
              )}

              {/* Feedback */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div 
                    className={`glass-card rounded-3xl p-8 border-2 ${
                      isCorrect 
                        ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300' 
                        : 'bg-gradient-to-br from-red-100 to-pink-100 border-red-300'
                    }`}
                    initial={{ opacity: 0, scale: 0.8, rotateX: -20 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div className="text-center mb-6">
                      {isCorrect ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <p className="text-7xl mb-4">✅</p>
                          <p className="text-3xl font-bold text-green-800 mb-2">Richtig!</p>
                          {streak >= 5 && (
                            <motion.p 
                              className="text-xl text-green-700 mt-3 font-bold"
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 0.5, repeat: 3 }}
                            >
                              🔥 Serie-Bonus: +5 Punkte!
                            </motion.p>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <p className="text-7xl mb-4">❌</p>
                          <p className="text-3xl font-bold text-red-800 mb-3">
                            {timeLeft === 0 ? '⏰ Zeit abgelaufen!' : 'Leider falsch'}
                          </p>
                          <div className="bg-white/70 rounded-2xl p-4 mt-4">
                            <p className="text-lg text-red-700">
                              Richtig: <span className="font-bold text-2xl text-red-900">{currentWord?.en}</span>
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <motion.button
                      onClick={startRound}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl text-xl transition-all shadow-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Weiter →
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default ActionModule;
