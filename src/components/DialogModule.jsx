import { useState, useRef, useEffect } from 'react';
import { generateDialogScenario, generateDialogResponse, generateDialogHint, evaluateDialogPerformance } from '../services/llmService';
import apiService from '../services/apiService';
import TTSButton from './TTSButton';
import STTButton from './STTButton';
import ttsService from '../services/ttsService';

function DialogModule({ user }) {
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState('');
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [level, setLevel] = useState('B2');
  const [topic, setTopic] = useState('Alltag');
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS] = useState(() => {
    const saved = localStorage.getItem('dialogModule_autoPlayTTS');
    return saved === 'true';
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Themenbereiche
  const topics = [
    'Politik',
    'Sport', 
    'Literatur',
    'Film, Musik, Kunst',
    'Alltag',
    'Persönliche Gespräche'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Save autoPlayTTS preference to localStorage
  useEffect(() => {
    localStorage.setItem('dialogModule_autoPlayTTS', autoPlayTTS);
  }, [autoPlayTTS]);

  useEffect(() => {
    scrollToBottom();
    
    // Auto-play last assistant message if auto-play is enabled
    if (autoPlayTTS && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !lastMessage.isError) {
        ttsService.speak(lastMessage.content, 'en').catch(err => 
          console.error('Auto-play TTS failed:', err)
        );
      }
    }
  }, [messages, autoPlayTTS]);

  const startNewDialog = async () => {
    setIsLoading(true);
    setMessages([]);
    setShowHint(false);
    setCurrentHint('');
    setUserMessageCount(0);
    setEvaluation(null);
    
    try {
      const newScenario = await generateDialogScenario(level, topic);
      setScenario(newScenario);
      
      // Füge die erste Nachricht der LLM hinzu
      setMessages([{
        role: 'assistant',
        content: newScenario.firstMessage,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to start dialog:', error);
      alert('Fehler beim Starten des Dialogs: ' + error.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: userInput.trim(),
      timestamp: new Date()
    };

    const newUserMessageCount = userMessageCount + 1;
    setUserMessageCount(newUserMessageCount);
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setShowHint(false);
    setCurrentHint('');
    setIsLoading(true);

    try {
      // Erstelle Konversationshistorie für die LLM
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      conversationHistory.push({
        role: 'user',
        content: userInput.trim()
      });

      // Prüfe ob das Gespräch nach dieser Nachricht beendet werden soll
      if (newUserMessageCount >= 5) {
        // Letzte Antwort der LLM, dann Bewertung
        const response = await generateDialogResponse(scenario, conversationHistory, level);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }]);
        
        // Starte Bewertung
        setIsEvaluating(true);
        const evalResult = await evaluateDialogPerformance(
          scenario,
          conversationHistory.concat([{ role: 'assistant', content: response }]),
          level
        );
        setEvaluation(evalResult);
        setIsEvaluating(false);
        
        // Zeitgutschrift bei guter Performance (Gesamtpunktzahl >= 7/10)
        if (user && evalResult.overallScore >= 7) {
          try {
            const minutesToAdd = 5; // 5 Minuten Zeitgutschrift
            console.log('🎮 Tracking activity (DialogModule):', { 
              overallScore: evalResult.overallScore,
              minutesToAdd, 
              user: user.username 
            });
            const result = await apiService.trackActivity(minutesToAdd);
            console.log('✅ Activity tracked - 5 minutes bonus:', result);
          } catch (error) {
            console.error('❌ Failed to track activity:', error);
          }
        } else if (user) {
          console.log('⏭️ No time credit (score < 7/10):', { 
            overallScore: evalResult.overallScore
          });
        }
      } else {
        const response = await generateDialogResponse(scenario, conversationHistory, level);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to get response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble understanding. Could you try again?',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleGetHint = async () => {
    if (isLoadingHint) return;
    
    setIsLoadingHint(true);
    setShowHint(true);
    
    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const hint = await generateDialogHint(scenario, conversationHistory);
      setCurrentHint(hint);
    } catch (error) {
      console.error('Failed to get hint:', error);
      setCurrentHint('Fehler beim Laden des Tipps. Bitte versuche es erneut.');
    } finally {
      setIsLoadingHint(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-2 sm:mb-3 md:mb-6 lg:mb-3">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-2xl font-bold gradient-text mb-1 sm:mb-2 lg:mb-1">💬 Dialog Trainer</h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-sm text-gray-600">Übe Englisch in realistischen Gesprächssituationen</p>
        </div>

        {!scenario ? (
          // Start Screen
          <div className="glass-card rounded-3xl p-8 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              Starte ein neues Gespräch
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Die KI erstellt ein realistisches Gesprächsszenario und unterhält sich mit dir auf Englisch. 
              Du kannst jederzeit einen Tipp bekommen!
            </p>
            
            {/* Level Selector */}
            <div className="mb-6 max-w-md mx-auto">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                📊 Sprachniveau wählen:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`py-2 px-4 rounded-xl font-bold transition-all ${
                      level === lvl
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Selector */}
            <div className="mb-8 max-w-md mx-auto">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                📚 Themenbereich wählen:
              </label>
              <div className="grid grid-cols-2 gap-2">
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
            
            <button
              onClick={startNewDialog}
              disabled={isLoading}
              className="btn-primary text-lg py-3 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="inline-block animate-spin w-5 h-5 border-3 border-white border-t-transparent rounded-full mr-2"></div>
                  Erstelle Szenario...
                </>
              ) : (
                '🚀 Dialog starten'
              )}
            </button>
          </div>
        ) : (
          // Dialog Screen
          <div className="glass-card rounded-3xl p-3 sm:p-4 md:p-6 lg:p-4 mb-20">
            {/* Scenario Description */}
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-2 sm:p-3 md:p-4 lg:p-3 mb-2 sm:mb-3 md:mb-4 lg:mb-2 border-2 border-blue-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-sm sm:text-base lg:text-sm text-gray-800 mb-1 sm:mb-2 lg:mb-1">📍 Szenario:</h3>
                  
                  {/* Role Information */}
                  {scenario.studentRole && scenario.partnerRole && (
                    <div className="mb-2 bg-white/50 rounded-lg p-2">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-blue-700">👤 Du:</span>
                          <span className="text-gray-700">{scenario.studentRole}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-purple-700">💬 Partner:</span>
                          <span className="text-gray-700">{scenario.partnerRole}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs sm:text-sm md:text-base lg:text-sm text-gray-700">{scenario.description}</p>
                </div>
                <button
                  onClick={() => setAutoPlayTTS(!autoPlayTTS)}
                  className={`ml-4 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    autoPlayTTS 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {autoPlayTTS ? '🔊 Auto' : '🔇 Auto'}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-2 mb-2 sm:mb-3 lg:mb-2 max-h-48 sm:max-h-56 md:max-h-80 lg:max-h-64 overflow-y-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] lg:max-w-[75%] rounded-2xl p-2 sm:p-3 lg:p-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                        : msg.isError
                        ? 'bg-red-100 text-red-800 border-2 border-red-300'
                        : 'bg-white text-gray-800 border-2 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-1 sm:gap-2">
                      <p className="whitespace-pre-wrap flex-1 text-xs sm:text-sm lg:text-xs">{msg.content}</p>
                      {msg.role === 'assistant' && !msg.isError && (
                        <TTSButton text={msg.content} language="en" className="scale-75" />
                      )}
                    </div>
                    <p className={`text-[9px] sm:text-[10px] mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border-2 border-gray-200 rounded-2xl p-3 sm:p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Hint Section */}
            {showHint && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-2 sm:p-4 mb-2 sm:mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl sm:text-2xl">💡</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 mb-1 text-sm sm:text-base">Tipp:</p>
                    {isLoadingHint ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                        <span className="text-gray-600">Lade Tipp...</span>
                      </div>
                    ) : (
                      <p className="text-gray-700">{currentHint}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Evaluation Section */}
            {evaluation && (
              <div className="glass-card rounded-2xl p-3 sm:p-4 md:p-6 mb-2 sm:mb-3 md:mb-4 border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                  📊 Ausführliche Bewertung
                </h3>
                
                {/* Overall Score - Prominently Displayed */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 sm:p-6 mb-4 text-center text-white shadow-xl">
                  <p className="text-sm sm:text-base font-semibold mb-2">Gesamtwertung</p>
                  <p className="text-5xl sm:text-6xl md:text-7xl font-bold">{evaluation.overallScore}/10</p>
                  <p className="text-sm sm:text-base mt-2 opacity-90">Niveau: {evaluation.languageLevel}</p>
                </div>
                
                {/* Detailed Scores Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                  <div className="bg-white rounded-xl p-2 sm:p-3 text-center border-2 border-blue-200">
                    <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Grammatik</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600">{evaluation.grammar}/10</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-2 sm:p-3 text-center border-2 border-purple-200">
                    <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Wortschatz</p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600">{evaluation.vocabulary}/10</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-2 sm:p-3 text-center border-2 border-green-200">
                    <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Flüssigkeit</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600">{evaluation.fluency}/10</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-2 sm:p-3 text-center border-2 border-orange-200">
                    <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Angemessenheit</p>
                    <p className="text-2xl sm:text-3xl font-bold text-orange-600">{evaluation.appropriateness}/10</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-2 sm:p-3 text-center border-2 border-teal-200">
                    <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Kontext</p>
                    <p className="text-2xl sm:text-3xl font-bold text-teal-600">{evaluation.contextResponse}/10</p>
                  </div>
                </div>
                
                {/* Detailed Feedback */}
                <div className="bg-blue-50 rounded-xl p-3 sm:p-4 mb-3 border-2 border-blue-200">
                  <p className="font-bold text-gray-800 mb-2 text-sm sm:text-base">📝 Detailliertes Feedback:</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{evaluation.detailedFeedback}</p>
                </div>
                
                {/* Error Analysis */}
                {evaluation.errors && evaluation.errors.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-3 sm:p-4 mb-3 border-2 border-red-200">
                    <p className="font-bold text-gray-800 mb-3 text-sm sm:text-base">❌ Sprachliche Fehler:</p>
                    <div className="space-y-3">
                      {evaluation.errors.map((error, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-red-200">
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 font-semibold mb-1">Deine Formulierung:</p>
                            <p className="text-sm text-red-700 line-through">"{error.original}"</p>
                          </div>
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 font-semibold mb-1">Korrekt wäre:</p>
                            <p className="text-sm text-green-700 font-semibold">"{error.correction}"</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Erklärung:</p>
                            <p className="text-xs text-gray-700">{error.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Strengths */}
                {evaluation.strengths && evaluation.strengths.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-3 sm:p-4 mb-3 border-2 border-green-200">
                    <p className="font-bold text-gray-800 mb-2 text-sm sm:text-base">✅ Stärken:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluation.strengths.map((strength, index) => (
                        <li key={index} className="text-gray-700 text-sm">{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Improvements */}
                {evaluation.improvements && evaluation.improvements.length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-3 sm:p-4 mb-3 border-2 border-orange-200">
                    <p className="font-bold text-gray-800 mb-2 text-sm sm:text-base">📈 Verbesserungspotenzial:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluation.improvements.map((improvement, index) => (
                        <li key={index} className="text-gray-700 text-sm">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Tips */}
                {evaluation.tips && evaluation.tips.length > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 border-2 border-yellow-200">
                    <p className="font-bold text-gray-800 mb-2 text-sm sm:text-base">💡 Praktische Tipps:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluation.tips.map((tip, index) => (
                        <li key={index} className="text-gray-700 text-sm">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Zeitgutschrift Anzeige */}
                {user && evaluation.overallScore >= 7 && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 sm:p-4 border-2 border-indigo-300 mt-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-2xl sm:text-3xl">🎉</span>
                      <div>
                        <p className="font-bold text-indigo-800 text-sm sm:text-base">Belohnung erhalten!</p>
                        <p className="text-xs sm:text-sm text-indigo-700">
                          +5 Minuten Zeitgutschrift für deine gute Performance!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {isEvaluating && (
              <div className="glass-card rounded-2xl p-3 sm:p-4 md:p-6 mb-2 sm:mb-3 md:mb-4 text-center">
                <div className="animate-spin w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2 sm:mb-3"></div>
                <p className="text-gray-700 font-bold text-sm sm:text-base">Bewerte deine Antworten...</p>
              </div>
            )}

            {/* Input Area */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Antworte auf Englisch..."
                  disabled={isLoading || evaluation !== null}
                  className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 border-gray-300 focus:border-indigo-500 focus:outline-none resize-none text-sm"
                  rows={2}
                />
                <STTButton
                  onTranscript={(text) => setUserInput(prev => prev + (prev ? ' ' : '') + text)}
                  language="en"
                  disabled={isLoading || evaluation !== null}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading || evaluation !== null}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  📤 Senden {userMessageCount < 5 && `(${userMessageCount}/5)`}
                </button>
                
                <button
                  onClick={handleGetHint}
                  disabled={isLoading || isLoadingHint || messages.length === 0 || evaluation !== null}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  title="Tipp bekommen"
                >
                  💡 Tipp
                </button>
                
                <button
                  onClick={startNewDialog}
                  disabled={isLoading}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  title="Neues Gespräch"
                >
                  🔄
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DialogModule;
