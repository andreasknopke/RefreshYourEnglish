import { useState, useEffect } from 'react';
import { evaluateTranslation, generateTranslationSentence } from '../services/llmService';

const hasOpenAIKey = !!import.meta.env.VITE_OPENAI_API_KEY && 
                     import.meta.env.VITE_OPENAI_API_KEY !== 'your_openai_api_key_here';

function TranslationModule() {
  const [currentSentence, setCurrentSentence] = useState(null);
  const [userTranslation, setUserTranslation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  // Lade ersten Satz beim Start
  useEffect(() => {
    loadNewSentence();
  }, []);

  const loadNewSentence = async () => {
    setIsLoadingSentence(true);
    try {
      const sentence = await generateTranslationSentence();
      setCurrentSentence(sentence);
      setUserTranslation('');
      setFeedback(null);
    } catch (error) {
      console.error('Error loading sentence:', error);
    } finally {
      setIsLoadingSentence(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userTranslation.trim() || !currentSentence) return;

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
    loadNewSentence();
  };

  const randomSentence = () => {
    loadNewSentence();
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="glass-card rounded-3xl shadow-2xl p-4 md:p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
        {/* Header with Score */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold gradient-text">Übersetzungsübung</h2>
              {hasOpenAIKey && (
                <p className="text-xs text-green-600 font-semibold mt-1 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  GPT-4o-mini aktiv
                </p>
              )}
              {!hasOpenAIKey && (
                <p className="text-xs text-gray-500 font-semibold mt-1">
                  Demo-Modus (Simuliert)
                </p>
              )}
            </div>
            <div className="text-right bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl px-4 py-2 shadow-lg">
              <p className="text-xs opacity-90 mb-1">Punktzahl</p>
              <p className="text-2xl font-bold">
                {score} / {totalAttempts}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: totalAttempts > 0 ? `${(score / totalAttempts) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* German Sentence Card */}
        {isLoadingSentence ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-4 shadow-lg border border-blue-100 text-center">
            <div className="w-12 h-12 mx-auto mb-3 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-600">Generiere neuen Satz...</p>
          </div>
        ) : currentSentence ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 md:p-6 mb-4 shadow-lg border border-blue-100">
            <p className="text-xs text-indigo-600 font-semibold mb-2 uppercase tracking-wide">Zu übersetzen:</p>
            <p className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">
              {currentSentence.de}
            </p>
          </div>
        ) : null}

        {/* Translation Form */}
        <form onSubmit={handleSubmit} className="mb-4">
          <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
            Deine Übersetzung:
          </label>
          <textarea
            value={userTranslation}
            onChange={(e) => setUserTranslation(e.target.value)}
            className="input-modern resize-none text-base"
            rows="2"
            placeholder="Gib hier deine englische Übersetzung ein..."
            disabled={isLoading}
          />
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={isLoading || !userTranslation.trim() || isLoadingSentence}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-base py-2"
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
            </button>
            <button
              type="button"
              onClick={randomSentence}
              disabled={isLoadingSentence}
              className="px-6 py-2 border-2 border-indigo-300 hover:border-indigo-500 bg-white/50 text-indigo-700 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingSentence ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : '🎲'}
            </button>
          </div>
        </form>

        {/* Feedback Section */}
        {feedback && (
          <div className="glass-card rounded-2xl p-4 mb-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center">
                <span className="mr-2 text-2xl">🤖</span>
                KI-Bewertung
              </h3>
              <div className="flex items-center bg-white rounded-xl px-4 py-2 shadow-lg">
                <span className="text-2xl md:text-3xl font-bold gradient-text mr-2">{feedback.score}</span>
                <span className="text-gray-600 text-lg">/10</span>
              </div>
            </div>
            
            <div className="mb-3 bg-white/70 rounded-lg p-3">
              <p className="text-xs font-bold text-purple-700 mb-1 uppercase tracking-wide">Feedback:</p>
              <p className="text-gray-800 text-sm md:text-base leading-relaxed">{feedback.feedback}</p>
            </div>

            {feedback.improvements && feedback.improvements.length > 0 && (
              <div className="mb-3 bg-white/70 rounded-lg p-3">
                <p className="text-xs font-bold text-purple-700 mb-2 uppercase tracking-wide flex items-center">
                  <span className="mr-2">💡</span>
                  Verbesserungsvorschläge:
                </p>
                <ul className="space-y-1">
                  {feedback.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start text-gray-700 text-sm">
                      <span className="text-purple-500 mr-2 mt-0.5">▸</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.correctTranslation && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 mb-3">
                <p className="text-xs font-bold text-green-700 mb-1 uppercase tracking-wide flex items-center">
                  <span className="mr-2">✅</span>
                  Musterlösung:
                </p>
                <p className="text-gray-800 font-semibold text-sm md:text-base">{feedback.correctTranslation}</p>
              </div>
            )}

            <button
              onClick={nextSentence}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 hover:from-purple-700 hover:via-pink-700 hover:to-red-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg text-base md:text-lg hover:scale-105"
            >
              Nächste Übung →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranslationModule;
