import { useState, useRef, useEffect } from 'react';
import { generateDialogScenario, generateDialogResponse, generateDialogHint, evaluateDialogPerformance } from '../services/llmService';
import apiService from '../services/apiService';

function DialogModule({ user }) {
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState('');
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [level, setLevel] = useState('B2');
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startNewDialog = async () => {
    setIsLoading(true);
    setMessages([]);
    setShowHint(false);
    setCurrentHint('');
    setUserMessageCount(0);
    setEvaluation(null);
    
    try {
      const newScenario = await generateDialogScenario(level);
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
        
        // Zeitgutschrift bei guter Performance (mindestens 7/10 in correctness oder appropriateness)
        if (user && (evalResult.correctness >= 7 || evalResult.appropriateness >= 7)) {
          try {
            const minutesToAdd = 5; // 5 Minuten Zeitgutschrift
            console.log('🎮 Tracking activity (DialogModule):', { 
              correctness: evalResult.correctness, 
              appropriateness: evalResult.appropriateness,
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
            correctness: evalResult.correctness, 
            appropriateness: evalResult.appropriateness 
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold gradient-text mb-2">💬 Dialog Trainer</h2>
          <p className="text-gray-600">Übe Englisch in realistischen Gesprächssituationen</p>
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
                Wähle dein Sprachniveau:
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
          <div className="glass-card rounded-3xl p-6 mb-20">
            {/* Scenario Description */}
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-4 mb-4 border-2 border-blue-300">
              <h3 className="font-bold text-gray-800 mb-2">📍 Szenario:</h3>
              <p className="text-gray-700">{scenario.description}</p>
            </div>

            {/* Messages */}
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                        : msg.isError
                        ? 'bg-red-100 text-red-800 border-2 border-red-300'
                        : 'bg-white text-gray-800 border-2 border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border-2 border-gray-200 rounded-2xl p-4">
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
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 mb-1">Tipp:</p>
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
              <div className="glass-card rounded-2xl p-6 mb-4 border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📊 Bewertung deiner Performance
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
                    <p className="text-xs font-bold text-gray-500 mb-1">KORREKTHEIT</p>
                    <p className="text-3xl font-bold text-blue-600">{evaluation.correctness}/10</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
                    <p className="text-xs font-bold text-gray-500 mb-1">ANGEMESSENHEIT</p>
                    <p className="text-3xl font-bold text-purple-600">{evaluation.appropriateness}/10</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border-2 border-indigo-200">
                    <p className="text-xs font-bold text-gray-500 mb-1">SPRACHNIVEAU</p>
                    <p className="text-3xl font-bold text-indigo-600">{evaluation.languageLevel}</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 mb-4">
                  <p className="font-bold text-gray-800 mb-2">💬 Feedback:</p>
                  <p className="text-gray-700">{evaluation.feedback}</p>
                </div>
                
                {evaluation.tips && evaluation.tips.length > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                    <p className="font-bold text-gray-800 mb-2">💡 Tipps für das nächste Mal:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluation.tips.map((tip, index) => (
                        <li key={index} className="text-gray-700">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Zeitgutschrift Anzeige */}
                {user && (evaluation.correctness >= 7 || evaluation.appropriateness >= 7) && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-300 mt-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎉</span>
                      <div>
                        <p className="font-bold text-indigo-800">Belohnung erhalten!</p>
                        <p className="text-sm text-indigo-700">
                          +5 Minuten Zeitgutschrift für deine gute Performance!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {isEvaluating && (
              <div className="glass-card rounded-2xl p-6 mb-4 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-700 font-bold">Bewerte deine Antworten...</p>
              </div>
            )}

            {/* Input Area */}
            <div className="space-y-3">
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Antworte auf Englisch..."
                disabled={isLoading || evaluation !== null}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-indigo-500 focus:outline-none resize-none"
                rows={3}
              />
              
              <div className="flex gap-2">
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading || evaluation !== null}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📤 Senden {userMessageCount < 5 && `(${userMessageCount}/5)`}
                </button>
                
                <button
                  onClick={handleGetHint}
                  disabled={isLoading || isLoadingHint || messages.length === 0 || evaluation !== null}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Tipp bekommen"
                >
                  💡 Tipp
                </button>
                
                <button
                  onClick={startNewDialog}
                  disabled={isLoading}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
