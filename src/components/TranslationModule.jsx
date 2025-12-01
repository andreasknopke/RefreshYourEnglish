import { useState, useEffect } from 'react';
import { evaluateTranslation, generateTranslationSentence } from '../services/llmService';
import apiService from '../services/apiService';

function TranslationModule({ user }) {
  const [currentSentence, setCurrentSentence] = useState(null);
  const [userTranslation, setUserTranslation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [level, setLevel] = useState('B2');
  const [isGeneratingSentence, setIsGeneratingSentence] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Debug: Prüfe API-Key beim Laden
  console.log('🎯 TranslationModule loaded');
  console.log('🔑 API Key exists:', !!import.meta.env.VITE_OPENAI_API_KEY);
  console.log('🔑 API Key length:', import.meta.env.VITE_OPENAI_API_KEY?.length || 0);
  console.log('🔑 All OPENAI env vars:', Object.keys(import.meta.env).filter(k => k.includes('OPENAI')));
  console.log('🔑 Full check:', {
    exists: !!import.meta.env.VITE_OPENAI_API_KEY,
    length: import.meta.env.VITE_OPENAI_API_KEY?.length || 0,
    prefix: import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 10) || 'none'
  });

  // Lade ersten Satz beim Start
  useEffect(() => {
    setSessionStartTime(Date.now());
    loadNewSentence();
  }, []);

  const loadNewSentence = async () => {
    setIsGeneratingSentence(true);
    setUserTranslation('');
    setFeedback(null);
    try {
      const sentence = await generateTranslationSentence(level);
      setCurrentSentence(sentence);
    } catch (error) {
      console.error('Failed to generate sentence:', error);
    } finally {
      setIsGeneratingSentence(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userTranslation.trim()) return;

    setIsLoading(true);
    try {
      console.log('Evaluating translation:', { 
        german: currentSentence.de, 
        user: userTranslation, 
        correct: currentSentence.en 
      });
      
      const result = await evaluateTranslation(
        currentSentence.de,
        userTranslation,
        currentSentence.en
      );
      
      console.log('Evaluation result:', result);
      setFeedback(result);
      setTotalAttempts(totalAttempts + 1);
      if (result.score >= 7) {
        setScore(score + 1);
      }

      // Track activity für Gamification
      if (user && sessionStartTime) {
        const minutesPracticed = Math.round((Date.now() - sessionStartTime) / 60000);
        if (minutesPracticed > 0) {
          try {
            await apiService.trackActivity(minutesPracticed);
            setSessionStartTime(Date.now()); // Reset für nächste Messung
          } catch (error) {
            console.error('Failed to track activity:', error);
          }
        }
      }
    } catch (error) {
      console.error('Translation evaluation error:', error);
      setFeedback({
        score: 0,
        feedback: `Fehler bei der Bewertung: ${error.message}. Die Simulation sollte trotzdem funktionieren.`,
        improvements: ['Überprüfe die Browser-Konsole für weitere Details'],
        correctTranslation: currentSentence.en
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

  if (!currentSentence) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="glass-card rounded-3xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generiere Übungssatz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="glass-card rounded-2xl shadow-xl p-3 md:p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
        {/* Header with Score */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl md:text-2xl font-bold gradient-text">Übersetzung</h2>
            <div className="text-right bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg px-3 py-1.5 shadow-lg">
              <p className="text-[10px] opacity-90">Punkte</p>
              <p className="text-lg font-bold">
                {score} / {totalAttempts}
              </p>
            </div>
          </div>
          
          {/* Level Selector */}
          <div className="mb-2 flex gap-1">
            {['B2', 'C1', 'C2'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setLevel(lvl);
                  loadNewSentence();
                }}
                className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                  level === lvl
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          
          {/* Progress Bar */}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: totalAttempts > 0 ? `${(score / totalAttempts) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* German Sentence Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 md:p-4 mb-3 shadow-lg border border-blue-100">
          <p className="text-[10px] text-indigo-600 font-semibold mb-1 uppercase tracking-wide">Zu übersetzen:</p>
          <p className="text-base md:text-lg font-bold text-gray-800 leading-relaxed">
            {currentSentence.de}
          </p>
        </div>

        {/* Translation Form */}
        <form onSubmit={handleSubmit} className="mb-3">
          <label className="block text-[10px] font-bold text-gray-700 mb-1 uppercase tracking-wide">
            Deine Übersetzung:
          </label>
          <textarea
            value={userTranslation}
            onChange={(e) => setUserTranslation(e.target.value)}
            className="input-modern resize-none text-sm"
            rows="2"
            placeholder="Englische Übersetzung..."
            disabled={isLoading}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={isLoading || !userTranslation.trim()}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
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
              disabled={isGeneratingSentence}
              className="px-4 py-2 border-2 border-indigo-300 hover:border-indigo-500 bg-white/50 text-indigo-700 font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 text-sm disabled:opacity-50"
            >
              {isGeneratingSentence ? '⏳' : '🎲'}
            </button>
          </div>
        </form>

        {/* Feedback Section */}
        {feedback && (
          <div className="glass-card rounded-xl p-3 mb-3 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center">
                <span className="mr-1 text-xl">🤖</span>
                KI-Bewertung
              </h3>
              <div className="flex items-center bg-white rounded-lg px-3 py-1 shadow-lg">
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
