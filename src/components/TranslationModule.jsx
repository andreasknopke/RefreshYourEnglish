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
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="glass-card rounded-3xl shadow-2xl p-4 md:p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
        {/* Header with Score */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl md:text-3xl font-bold gradient-text">Übersetzungsübung</h2>
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
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 md:p-6 mb-4 shadow-lg border border-blue-100">
          <p className="text-xs text-indigo-600 font-semibold mb-2 uppercase tracking-wide">Zu übersetzen:</p>
          <p className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">
            {currentSentence.de}
          </p>
        </div>

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
              disabled={isLoading || !userTranslation.trim()}
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
              className="px-6 py-2 border-2 border-indigo-300 hover:border-indigo-500 bg-white/50 text-indigo-700 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 text-base"
            >
              🎲
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
