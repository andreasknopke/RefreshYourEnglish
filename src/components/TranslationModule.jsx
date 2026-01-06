import { useState, useEffect } from 'react';
import { checkVocabularyUsage } from '../services/llmService';
import apiService from '../services/apiService';
import TTSButton from './TTSButton';
import STTButton from './STTButton';

function TranslationModule({ user }) {
  const [currentSentence, setCurrentSentence] = useState(null);
  const [userTranslation, setUserTranslation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [level, setLevel] = useState('B2');
  const [topic, setTopic] = useState('Alltag');
  const [isGeneratingSentence, setIsGeneratingSentence] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [trainerVocabulary, setTrainerVocabulary] = useState([]);
  const [vocabMode, setVocabMode] = useState('classic'); // 'classic', 'level', 'trainer'
  const [vocabBonusCount, setVocabBonusCount] = useState(0);

  // Themenbereiche
  const topics = [
    'Politik',
    'Sport', 
    'Literatur',
    'Film, Musik, Kunst',
    'Alltag',
    'Persönliche Gespräche'
  ];

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

  // Session Start initialisieren und Vokabeln laden
  useEffect(() => {
    setSessionStartTime(Date.now());
    loadVocabulary();
    loadTrainerVocabulary();
  }, []);

  // Trainer-Vokabeln neu laden wenn User sich ändert
  useEffect(() => {
    loadTrainerVocabulary();
  }, [user]);

  // Vokabeln aus der Bibliothek laden
  const loadVocabulary = async () => {
    try {
      const data = await apiService.getVocabulary();
      const vocabArray = data.vocabulary || data;
      setVocabulary(vocabArray);
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
    }
  };

  // Vokabeln aus dem Trainer laden
  const loadTrainerVocabulary = async () => {
    if (!user) return;
    try {
      const data = await apiService.getDueFlashcards();
      const flashcards = data.flashcards || [];
      // Konvertiere Flashcards zu Vokabeln-Format
      const vocabArray = flashcards.map(fc => ({
        id: fc.vocab_id || fc.id,
        english: fc.english,
        german: fc.german,
        level: fc.level || 'B2'
      }));
      setTrainerVocabulary(vocabArray);
    } catch (error) {
      console.error('Failed to load trainer vocabulary:', error);
    }
  };

  // Zufällige Vokabel des ausgewählten Levels holen (aus Bibliothek)
  const getRandomVocabForLevel = () => {
    const levelVocabs = vocabulary.filter(v => v.level === level);
    if (levelVocabs.length === 0) return null;
    return levelVocabs[Math.floor(Math.random() * levelVocabs.length)];
  };

  // Zufällige Vokabel aus dem Trainer holen
  const getRandomVocabFromTrainer = () => {
    if (trainerVocabulary.length === 0) return null;
    return trainerVocabulary[Math.floor(Math.random() * trainerVocabulary.length)];
  };

  const loadNewSentence = async () => {
    setIsGeneratingSentence(true);
    setUserTranslation('');
    setFeedback(null);
    try {
      let targetVocab = null;
      let useTopic = topic;

      // Je nach Modus die richtige Vokabel und Topic-Einstellung wählen
      if (vocabMode === 'level') {
        // Modus 2: Nur Level-basiert
        targetVocab = getRandomVocabForLevel();
        useTopic = null; // Kein spezifisches Thema
      } else if (vocabMode === 'trainer') {
        // Modus 3: Trainer-basiert
        targetVocab = getRandomVocabFromTrainer();
        useTopic = null; // Kein spezifisches Thema
      }
      // Modus 1 (classic): targetVocab bleibt null, useTopic wird verwendet

      console.log('📝 Requesting sentence generation:', {
        level,
        topic: useTopic,
        vocabMode,
        targetVocab: targetVocab ? `${targetVocab.german}/${targetVocab.english}` : null
      });

      const sentence = await apiService.generateTranslationSentence(level, useTopic, targetVocab);
      
      console.log('✅ Sentence received:', {
        german: sentence.de,
        english: sentence.en,
        source: sentence.source,
        message: sentence.message
      });
      
      setCurrentSentence(sentence);
    } catch (error) {
      console.error('Failed to generate sentence:', {
        error: error.message,
        level,
        topic,
        vocabMode
      });
    } finally {
      setIsGeneratingSentence(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userTranslation.trim()) return;

    setIsLoading(true);
    try {
      console.log('📊 Evaluating translation:', { 
        german: currentSentence.de, 
        user: userTranslation, 
        correct: currentSentence.en,
        targetVocab: currentSentence.targetVocab
      });
      
      const result = await apiService.evaluateTranslation(
        currentSentence.de,
        userTranslation,
        currentSentence.en,
        currentSentence.targetVocab // Übergebe Zielwort an Backend
      );
      
      // Konvertiere Backend-Response zu Frontend-Format
      const evaluationResult = {
        score: result.score,
        feedback: result.feedback,
        improvements: result.improvements || [],
        spellingNotes: result.spellingNotes || [],
        correctTranslation: currentSentence.en,
        source: result.source,
        message: result.message
      };
      
      // Prüfe, ob die Ziel-Vokabel korrekt verwendet wurde
      let vocabUsedCorrectly = false;
      if (currentSentence.targetVocab && evaluationResult.score >= 7) {
        vocabUsedCorrectly = checkVocabularyUsage(userTranslation, currentSentence.targetVocab);
        if (vocabUsedCorrectly) {
          evaluationResult.vocabBonus = true;
          evaluationResult.targetVocab = currentSentence.targetVocab;
          setVocabBonusCount(prev => prev + 1);
        }
      }

      // Update Flashcard Status wenn im Vokabeltrainer-Modus
      if (user && vocabMode === 'trainer' && currentSentence.targetVocab) {
        try {
          const vocabularyId = currentSentence.targetVocab.id;
          console.log('🎯 [Flashcard Update] Updating flashcard from vocab trainer:', {
            vocabularyId,
            vocabUsedCorrectly,
            score: evaluationResult.score,
            vocab: `${currentSentence.targetVocab.german} → ${currentSentence.targetVocab.english}`
          });

          const updateResult = await apiService.updateFlashcardByVocabulary(
            vocabularyId,
            vocabUsedCorrectly
          );

          if (updateResult.updated) {
            console.log('✅ [Flashcard Update] Successfully updated:', updateResult.nextReview);
          } else {
            console.log('ℹ️ [Flashcard Update] No flashcard found for this vocabulary');
          }
        } catch (error) {
          console.error('❌ [Flashcard Update] Failed to update flashcard:', error);
        }
      }
      
      console.log('📋 Evaluation result:', evaluationResult, 'Vocab used correctly:', vocabUsedCorrectly);
      setFeedback(evaluationResult);
      setTotalAttempts(totalAttempts + 1);
      if (evaluationResult.score >= 7) {
        setScore(score + 1);
      }

      // Track activity für Gamification (nur bei score >= 8/10)
      if (user && evaluationResult.score >= 8) {
        try {
          // Basis: 45 Sekunden
          const baseSeconds = 45;
          // Bonus: 30 Sekunden wenn Vokabel korrekt verwendet wurde
          const vocabBonusSeconds = vocabUsedCorrectly ? 30 : 0;
          const totalSeconds = baseSeconds + vocabBonusSeconds;
          const minutesToAdd = totalSeconds / 60;
          
          console.log('🎮 Tracking activity (TranslationModule):', { 
            score: evaluationResult.score, 
            baseSeconds,
            vocabBonusSeconds,
            totalSeconds,
            vocabMode,
            user: user.username 
          });
          const apiResult = await apiService.trackActivity(minutesToAdd);
          console.log('✅ Activity tracked:', apiResult);
        } catch (error) {
          console.error('❌ Failed to track activity:', error);
        }
      } else if (user) {
        console.log('⏭️ No time credit (score < 8):', { score: evaluationResult.score });
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

  // Startbildschirm wenn noch kein Satz generiert wurde
  if (!currentSentence) {
    // Zähle Vokabeln pro Level
    const vocabCountByLevel = {
      A1: vocabulary.filter(v => v.level === 'A1').length,
      A2: vocabulary.filter(v => v.level === 'A2').length,
      B1: vocabulary.filter(v => v.level === 'B1').length,
      B2: vocabulary.filter(v => v.level === 'B2').length,
      C1: vocabulary.filter(v => v.level === 'C1').length,
      C2: vocabulary.filter(v => v.level === 'C2').length,
    };

    const currentLevelVocabCount = vocabCountByLevel[level] || 0;
    
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="glass-card rounded-2xl shadow-xl p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-6 text-center">
            Übersetzungstrainer
          </h2>
          
          {/* Level Selector */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              📊 Sprachniveau wählen:
            </label>
            <div className="flex gap-2 flex-wrap">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    level === lvl
                      ? 'bg-indigo-600 text-white shadow-lg scale-105'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {lvl}
                  {vocabMode !== 'classic' && (
                    <span className="ml-1 text-xs opacity-75">
                      ({vocabMode === 'trainer' ? trainerVocabulary.length : vocabCountByLevel[lvl]})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              🎯 Übungsmodus wählen:
            </label>
            <div className="grid grid-cols-1 gap-3">
              {/* Modus 1: Klassisch - Thema + Level */}
              <button
                onClick={() => setVocabMode('classic')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  vocabMode === 'classic'
                    ? 'border-purple-500 bg-purple-50 shadow-lg scale-[1.02]'
                    : 'border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📚</span>
                      <h3 className="font-bold text-gray-800">Klassischer Modus</h3>
                      {vocabMode === 'classic' && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                          Aktiv
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Wähle Themenbereich und Sprachniveau. Sätze werden zu deinem gewählten Thema generiert.
                    </p>
                  </div>
                </div>
              </button>

              {/* Modus 2: Level-basiert - Vokabeln des Levels */}
              <button
                onClick={() => setVocabMode('level')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  vocabMode === 'level'
                    ? 'border-amber-500 bg-amber-50 shadow-lg scale-[1.02]'
                    : 'border-gray-300 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🎯</span>
                      <h3 className="font-bold text-gray-800">Level-Vokabeln</h3>
                      {vocabMode === 'level' && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                          Aktiv
                        </span>
                      )}
                      <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">
                        +30s Bonus
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Sätze basieren auf Vokabeln deines gewählten Levels. 
                      <span className="font-semibold text-amber-700"> Verfügbar: {currentLevelVocabCount} Vokabeln</span>
                    </p>
                    {currentLevelVocabCount === 0 && (
                      <p className="text-xs text-red-600 mt-1 font-semibold">
                        ⚠️ Keine Vokabeln für Level {level} verfügbar!
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {/* Modus 3: Trainer-basiert */}
              <button
                onClick={() => setVocabMode('trainer')}
                disabled={!user || trainerVocabulary.length === 0}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  vocabMode === 'trainer'
                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]'
                    : trainerVocabulary.length === 0 || !user
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📖</span>
                      <h3 className="font-bold text-gray-800">Vokabeltrainer-Modus</h3>
                      {vocabMode === 'trainer' && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          Aktiv
                        </span>
                      )}
                      <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">
                        +30s Bonus
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Sätze basieren auf Vokabeln aus deinem persönlichen Vokabeltrainer.
                      <span className="font-semibold text-blue-700"> Verfügbar: {trainerVocabulary.length} Vokabeln</span>
                    </p>
                    {!user && (
                      <p className="text-xs text-orange-600 mt-1 font-semibold">
                        ⚠️ Login erforderlich
                      </p>
                    )}
                    {user && trainerVocabulary.length === 0 && (
                      <p className="text-xs text-orange-600 mt-1 font-semibold">
                        ⚠️ Keine Vokabeln im Trainer! Füge welche hinzu in der Vokabelbibliothek.
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Topic Selector - nur im klassischen Modus */}
          {vocabMode === 'classic' && (
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                📚 Themenbereich wählen:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                      topic === t
                        ? 'bg-purple-600 text-white shadow-lg scale-105'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bonus Info Box */}
          {vocabMode !== 'classic' && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎁</span>
                <div>
                  <p className="text-sm font-bold text-green-800">
                    Vokabel-Bonus aktiv!
                  </p>
                  <p className="text-xs text-green-700">
                    Bei korrekter Verwendung der Ziel-Vokabel erhältst du 30 Sekunden extra für dein Tagesziel!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={loadNewSentence}
            disabled={isGeneratingSentence || (vocabMode === 'level' && currentLevelVocabCount === 0) || (vocabMode === 'trainer' && trainerVocabulary.length === 0)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isGeneratingSentence ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generiere Übungssatz...
              </span>
            ) : (
              '🚀 Übung starten'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in px-2 sm:px-4">
      <div className="glass-card rounded-2xl shadow-xl p-2 sm:p-3 md:p-4 lg:p-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
        {/* Header with Score */}
        <div className="mb-2 sm:mb-3 lg:mb-2">
          <div className="flex justify-between items-center mb-1 sm:mb-2 lg:mb-1">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-xl font-bold gradient-text">Übersetzung</h2>
            <div className="text-right bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg">
              <p className="text-[9px] sm:text-[10px] opacity-90">Punkte</p>
              <p className="text-sm sm:text-lg font-bold">
                {score} / {totalAttempts}
              </p>
            </div>
          </div>
          
          {/* Level Selector */}
          <div className="mb-2 flex gap-1 flex-wrap">
            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`px-2 py-1 rounded-lg font-semibold text-xs transition-all ${
                  level === lvl
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Topic Selector */}
          <div className="mb-2">
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-xs font-semibold"
            >
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 sm:p-3 md:p-4 mb-2 sm:mb-3 shadow-lg border border-blue-100">
          <p className="text-[9px] sm:text-[10px] text-indigo-600 font-semibold mb-1 uppercase tracking-wide">Zu übersetzen:</p>
          <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 leading-relaxed">
            {currentSentence.de}
          </p>
          {currentSentence.targetVocab && (
            <div className="mt-2 pt-2 border-t border-indigo-200">
              <p className="text-[9px] sm:text-[10px] text-amber-600 font-semibold uppercase tracking-wide flex items-center">
                🎯 Ziel-Vokabel: 
                <span className="ml-1 px-2 py-0.5 bg-amber-100 rounded text-amber-800 normal-case font-bold">
                  {currentSentence.targetVocab.german}
                </span>
                <span className="ml-2 text-amber-500 text-[8px]">(+30s Bonus bei korrekter Nutzung)</span>
              </p>
            </div>
          )}
        </div>

        {/* Translation Form */}
        <form onSubmit={handleSubmit} className="mb-2 sm:mb-3">
          <label className="block text-[9px] sm:text-[10px] font-bold text-gray-700 mb-1 uppercase tracking-wide">
            Deine Übersetzung:
          </label>
          <div className="flex gap-2 mb-2">
            <textarea
              value={userTranslation}
              onChange={(e) => setUserTranslation(e.target.value)}
              className="flex-1 input-modern resize-none text-sm"
              rows="2"
              placeholder="Englische Übersetzung..."
              disabled={isLoading}
            />
            <STTButton
              onTranscript={(text) => setUserTranslation(prev => prev + (prev ? ' ' : '') + text)}
              language="en"
              disabled={isLoading}
            />
          </div>
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
              onClick={loadNewSentence}
              disabled={isGeneratingSentence}
              className="px-4 py-2 border-2 border-purple-300 hover:border-purple-500 bg-white/50 text-purple-700 font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 text-sm disabled:opacity-50"
              title="Neuen Satz generieren"
            >
              {isGeneratingSentence ? '⏳' : '🔄 Neu'}
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
              <div className="flex items-center gap-2">
                {feedback.vocabBonus && (
                  <div className="bg-amber-100 text-amber-800 rounded-lg px-2 py-1 text-xs font-bold border border-amber-300 animate-pulse">
                    +30s Bonus! 🎯
                  </div>
                )}
                <div className="flex items-center bg-white rounded-lg px-3 py-1 shadow-lg">
                  <span className="text-2xl md:text-3xl font-bold gradient-text mr-2">{feedback.score}</span>
                  <span className="text-gray-600 text-lg">/10</span>
                </div>
              </div>
            </div>

            {/* Vocabulary Bonus Feedback */}
            {feedback.targetVocab && (
              <div className={`mb-3 rounded-lg p-3 border ${
                feedback.vocabBonus 
                  ? 'bg-green-50/70 border-green-200' 
                  : 'bg-amber-50/70 border-amber-200'
              }`}>
                <p className={`text-xs font-bold mb-1 uppercase tracking-wide ${
                  feedback.vocabBonus ? 'text-green-700' : 'text-amber-700'
                }`}>
                  {feedback.vocabBonus ? '✅ Ziel-Vokabel korrekt verwendet!' : '📖 Ziel-Vokabel:'}
                </p>
                <p className="text-gray-800 text-sm">
                  <span className="font-bold">{feedback.targetVocab.german}</span> → <span className="font-bold">{feedback.targetVocab.english}</span>
                </p>
                {feedback.vocabBonus && (
                  <p className="text-green-600 text-xs mt-1 font-semibold">
                    🎁 Du erhältst 30 Sekunden Bonus für dein Tagesziel!
                  </p>
                )}
              </div>
            )}
            
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

            {feedback.spellingNotes && feedback.spellingNotes.length > 0 && (
              <div className="mb-3 bg-blue-50/70 rounded-lg p-3 border border-blue-200">
                <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide flex items-center">
                  <span className="mr-2">✏️</span>
                  Rechtschreibhinweise (kein Punktabzug):
                </p>
                <ul className="space-y-1">
                  {feedback.spellingNotes.map((note, index) => (
                    <li key={index} className="flex items-start text-gray-700 text-sm">
                      <span className="text-blue-500 mr-2 mt-0.5">▸</span>
                      <span>{note}</span>
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
