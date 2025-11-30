import { useState } from 'react';
import { evaluateTranslation } from '../services/llmService';

const sampleSentences = [
  { id: 1, de: "Der Hund spielt im Garten.", en: "The dog plays in the garden." },
  { id: 2, de: "Ich gehe jeden Tag zur Arbeit.", en: "I go to work every day." },
  { id: 3, de: "Das Wetter ist heute sehr schön.", en: "The weather is very nice today." },
  { id: 4, de: "Sie lernt seit drei Jahren Englisch.", en: "She has been learning English for three years." },
  { id: 5, de: "Wir haben gestern einen Film gesehen.", en: "We watched a movie yesterday." },
  { id: 6, de: "Kannst du mir bitte helfen?", en: "Can you please help me?" },
  { id: 7, de: "Er möchte ein neues Auto kaufen.", en: "He wants to buy a new car." },
  { id: 8, de: "Die Kinder spielen im Park.", en: "The children are playing in the park." },
];

function TranslationModule() {
  const [currentSentence, setCurrentSentence] = useState(sampleSentences[0]);
  const [userTranslation, setUserTranslation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userTranslation.trim()) return;

    setIsLoading(true);
    try {
      const result = await evaluateTranslation(
        currentSentence.de,
        userTranslation,
        currentSentence.en
      );
      setFeedback(result);
      setTotalAttempts(totalAttempts + 1);
      if (result.score >= 7) {
        setScore(score + 1);
      }
    } catch (error) {
      setFeedback({
        score: 0,
        feedback: 'Fehler bei der Bewertung. Bitte stelle sicher, dass die LLM-API konfiguriert ist.',
        improvements: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextSentence = () => {
    const nextIndex = (sampleSentences.indexOf(currentSentence) + 1) % sampleSentences.length;
    setCurrentSentence(sampleSentences[nextIndex]);
    setUserTranslation('');
    setFeedback(null);
  };

  const randomSentence = () => {
    const randomIndex = Math.floor(Math.random() * sampleSentences.length);
    setCurrentSentence(sampleSentences[randomIndex]);
    setUserTranslation('');
    setFeedback(null);
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="glass-card rounded-3xl shadow-2xl p-8 md:p-10">
        {/* Header with Score */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-4xl font-bold gradient-text">Übersetzungsübung</h2>
            <div className="text-right bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl px-6 py-3 shadow-lg">
              <p className="text-xs opacity-90 mb-1">Punktzahl</p>
              <p className="text-3xl font-bold">
                {score} / {totalAttempts}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: totalAttempts > 0 ? `${(score / totalAttempts) * 100}%` : '0%' }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* German Sentence Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSentence.id}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 shadow-lg border border-blue-100"
            initial={{ opacity: 0, scale: 0.95, rotateX: -10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.95, rotateX: 10 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-sm text-indigo-600 font-semibold mb-3 uppercase tracking-wide">Zu übersetzen:</p>
            <p className="text-3xl font-bold text-gray-800 leading-relaxed">
              {currentSentence.de}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Translation Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
            Deine Übersetzung:
          </label>
          <motion.textarea
            value={userTranslation}
            onChange={(e) => setUserTranslation(e.target.value)}
            className="input-modern resize-none text-lg"
            rows="4"
            placeholder="Gib hier deine englische Übersetzung ein..."
            disabled={isLoading}
            whileFocus={{ scale: 1.01 }}
          />
          <div className="flex gap-4 mt-6">
            <motion.button
              type="submit"
              disabled={isLoading || !userTranslation.trim()}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Bewerte...
                </span>
              ) : '✨ Bewerten'}
            </motion.button>
            <motion.button
              type="button"
              onClick={randomSentence}
              className="px-8 py-3 border-2 border-indigo-300 hover:border-indigo-500 bg-white/50 text-indigo-700 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🎲 Zufällig
            </motion.button>
          </div>
        </form>

        {/* Feedback Section */}
        <AnimatePresence>
          {feedback && (
            <motion.div 
              className="glass-card rounded-3xl p-8 mb-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="mr-3 text-3xl">🤖</span>
                  KI-Bewertung
                </h3>
                <motion.div 
                  className="flex items-center bg-white rounded-2xl px-6 py-3 shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <span className="text-4xl font-bold gradient-text mr-2">{feedback.score}</span>
                  <span className="text-gray-600 text-xl">/10</span>
                </motion.div>
              </div>
              
              <motion.div 
                className="mb-6 bg-white/70 rounded-xl p-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm font-bold text-purple-700 mb-2 uppercase tracking-wide">Feedback:</p>
                <p className="text-gray-800 text-lg leading-relaxed">{feedback.feedback}</p>
              </motion.div>

              {feedback.improvements && feedback.improvements.length > 0 && (
                <motion.div 
                  className="mb-6 bg-white/70 rounded-xl p-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-sm font-bold text-purple-700 mb-3 uppercase tracking-wide flex items-center">
                    <span className="mr-2">💡</span>
                    Verbesserungsvorschläge:
                  </p>
                  <ul className="space-y-2">
                    {feedback.improvements.map((improvement, index) => (
                      <motion.li 
                        key={index} 
                        className="flex items-start text-gray-700"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <span className="text-purple-500 mr-3 mt-1">▸</span>
                        <span>{improvement}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {feedback.correctTranslation && (
                <motion.div 
                  className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-sm font-bold text-green-700 mb-2 uppercase tracking-wide flex items-center">
                    <span className="mr-2">✅</span>
                    Musterlösung:
                  </p>
                  <p className="text-gray-800 font-semibold text-lg">{feedback.correctTranslation}</p>
                </motion.div>
              )}

              <motion.button
                onClick={nextSentence}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 hover:from-purple-700 hover:via-pink-700 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl text-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Nächste Übung →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default TranslationModule;
