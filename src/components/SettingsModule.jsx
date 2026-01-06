import { useState, useEffect } from 'react';
import sttService from '../services/sttService';
import ttsService from '../services/ttsService';
import * as llmService from '../services/llmService';
import DiagnosticsPanel from './DiagnosticsPanel';

function SettingsModule() {
  const [sttProvider, setSttProvider] = useState('browser');
  const [ttsProvider, setTtsProvider] = useState('elevenlabs');
  const [llmProvider, setLLMProvider] = useState('openai');
  const [elevenLabsAvailable, setElevenLabsAvailable] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableLLMs, setAvailableLLMs] = useState([]);

  useEffect(() => {
    // Load current settings
    setSttProvider(sttService.getProvider());
    setTtsProvider(ttsService.getProvider());
    setElevenLabsAvailable(sttService.isElevenLabsAvailable());
    setLLMProvider(llmService.getLLMProvider());
    setAvailableLLMs(llmService.getAvailableLLMProviders());
    
    // Load available voices
    const loadVoices = () => {
      const voices = ttsService.getAvailableVoices();
      setAvailableVoices(voices);
      
      // Load preferred voice
      const preferred = ttsService.getPreferredVoice();
      setSelectedVoice(preferred);
    };
    
    loadVoices();
    
    // Voices might load asynchronously
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleSttProviderChange = (provider) => {
    try {
      sttService.setProvider(provider);
      setSttProvider(provider);
      
      // Show confirmation
      const providerName = provider === 'elevenlabs' ? 'ElevenLabs' : 'Browser';
      alert(`✅ Speech-to-Text Provider auf ${providerName} geändert`);
    } catch (error) {
      console.error('Failed to change STT provider:', error);
      alert('❌ Fehler beim Ändern des Providers: ' + error.message);
    }
  };

  const handleTtsProviderChange = (provider) => {
    try {
      ttsService.setProvider(provider);
      setTtsProvider(provider);
      
      // Show confirmation
      const providerName = provider === 'elevenlabs' ? 'ElevenLabs' : 'Browser';
      alert(`✅ Text-to-Speech Provider auf ${providerName} geändert`);
    } catch (error) {
      console.error('Failed to change TTS provider:', error);
      alert('❌ Fehler beim Ändern des Providers: ' + error.message);
    }
  };

  const handleVoiceChange = (voiceName) => {
    try {
      ttsService.setPreferredVoice(voiceName);
      setSelectedVoice(voiceName);
    } catch (error) {
      console.error('Failed to change voice:', error);
      alert('❌ Fehler beim Ändern der Stimme: ' + error.message);
    }
  };

  const handleLLMProviderChange = (provider) => {
    try {
      llmService.setLLMProvider(provider);
      setLLMProvider(provider);
      
      // Show confirmation
      const providerName = provider === 'mistral' ? 'Mistral Large' : 'OpenAI';
      alert(`✅ LLM Provider auf ${providerName} geändert`);
    } catch (error) {
      console.error('Failed to change LLM provider:', error);
      alert('❌ Fehler beim Ändern des LLM Providers: ' + error.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass-card rounded-3xl p-6 mb-6">
          <h1 className="text-4xl font-bold gradient-text mb-4">⚙️ Einstellungen</h1>
          <p className="text-gray-600">
            Passe die App nach deinen Wünschen an.
          </p>
        </div>

        {/* Speech-to-Text Settings */}
        <div className="glass-card rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-3">🎤</span>
            Speech-to-Text (Spracheingabe)
          </h2>
          
          <div className="space-y-4">
            {/* Browser Option */}
            <div
              onClick={() => handleSttProviderChange('browser')}
              className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                sttProvider === 'browser'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      sttProvider === 'browser'
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300'
                    }`}>
                      {sttProvider === 'browser' && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">Browser Web Speech API</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                      KOSTENLOS
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-8">
                    Nutzt die integrierte Spracherkennung des Browsers (Google Speech Recognition).
                  </p>
                  <div className="ml-8 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Kostenlos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Echtzeit-Transkription</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Geringe Latenz</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-orange-600">⚠</span>
                      <span className="text-gray-700">Funktioniert nicht in Firefox</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ElevenLabs Option */}
            <div
              onClick={() => elevenLabsAvailable && handleSttProviderChange('elevenlabs')}
              className={`p-4 rounded-xl border-2 transition-all ${
                !elevenLabsAvailable
                  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                  : sttProvider === 'elevenlabs'
                  ? 'cursor-pointer border-purple-500 bg-purple-50'
                  : 'cursor-pointer border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      sttProvider === 'elevenlabs'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {sttProvider === 'elevenlabs' && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">ElevenLabs API</h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                      PREMIUM
                    </span>
                    {!elevenLabsAvailable && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                        NICHT VERFÜGBAR
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-8">
                    Professionelle Spracherkennung mit ElevenLabs AI.
                  </p>
                  {elevenLabsAvailable ? (
                    <div className="ml-8 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-700">Hohe Genauigkeit</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-700">Funktioniert in allen Browsern</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-700">Mehrsprachig optimiert</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-orange-600">⚠</span>
                        <span className="text-gray-700">Benötigt API-Key (bereits konfiguriert)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-8">
                      <p className="text-sm text-red-600">
                        ⚠️ ElevenLabs API-Key nicht konfiguriert. Bitte VITE_ELEVENLABS_API_KEY in den Umgebungsvariablen setzen.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-bold text-blue-800 mb-1">Hinweis</p>
                <p className="text-sm text-blue-700">
                  Die Spracheingabe ist verfügbar in den Modulen "Dialog" und "Übersetzung". 
                  Klicke auf das Mikrofon-Symbol 🎤 neben dem Eingabefeld, um Spracheingabe zu nutzen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Text-to-Speech Settings */}
        <div className="glass-card rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-3">🔊</span>
            Text-to-Speech (Sprachausgabe)
          </h2>
          
          <div className="space-y-4">
            {/* ElevenLabs Option */}
            <div
              onClick={() => elevenLabsAvailable && handleTtsProviderChange('elevenlabs')}
              className={`p-4 rounded-xl border-2 transition-all ${
                !elevenLabsAvailable
                  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                  : ttsProvider === 'elevenlabs'
                  ? 'cursor-pointer border-purple-500 bg-purple-50'
                  : 'cursor-pointer border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      ttsProvider === 'elevenlabs'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {ttsProvider === 'elevenlabs' && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">ElevenLabs API</h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                      PREMIUM
                    </span>
                    {!elevenLabsAvailable && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                        NICHT VERFÜGBAR
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-8">
                    Hochwertige, natürlich klingende Stimmen mit ElevenLabs AI.
                  </p>
                  {elevenLabsAvailable ? (
                    <div className="ml-8 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-700">Professionelle Stimmen</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-700">Sehr natürlicher Klang</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-700">Anpassbare Stimme (Voice-ID)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-orange-600">⚠</span>
                        <span className="text-gray-700">Benötigt API-Key (bereits konfiguriert)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-8">
                      <p className="text-sm text-red-600">
                        ⚠️ ElevenLabs API-Key nicht konfiguriert. Bitte VITE_ELEVENLABS_API_KEY in den Umgebungsvariablen setzen.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Browser Option */}
            <div
              onClick={() => handleTtsProviderChange('browser')}
              className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                ttsProvider === 'browser'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      ttsProvider === 'browser'
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300'
                    }`}>
                      {ttsProvider === 'browser' && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">Browser Web Speech API</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                      KOSTENLOS
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-8">
                    Nutzt die integrierte Sprachausgabe des Browsers.
                  </p>
                  <div className="ml-8 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Kostenlos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Sofortige Wiedergabe</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Funktioniert in allen Browsern</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-orange-600">⚠</span>
                      <span className="text-gray-700">Robotischer Klang</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Selection for Browser TTS */}
            {ttsProvider === 'browser' && availableVoices.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🎙️</span>
                  Stimme auswählen
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableVoices
                    .filter(voice => voice.lang.startsWith('en'))
                    .map((voice) => (
                      <div
                        key={voice.name}
                        onClick={() => handleVoiceChange(voice.name)}
                        className={`cursor-pointer p-3 rounded-lg border transition-all ${
                          selectedVoice === voice.name
                            ? 'border-indigo-500 bg-indigo-100'
                            : 'border-gray-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedVoice === voice.name
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedVoice === voice.name && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800 text-sm">
                              {voice.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {voice.lang} · {voice.localService ? 'Lokal' : 'Online'}
                              {voice.name.includes('Natural') && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                                  NATURAL
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                {availableVoices.filter(v => v.lang.startsWith('en')).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Keine englischen Stimmen verfügbar
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-bold text-blue-800 mb-1">Hinweis</p>
                <p className="text-sm text-blue-700">
                  Die Sprachausgabe ist verfügbar über den 🔊-Button in allen Modulen. 
                  Klicke auf das Lautsprecher-Symbol, um englische Texte vorlesen zu lassen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Settings (Placeholder for future) */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-3">🧠</span>
            KI-Modell (LLM) auswählen
          </h2>
          
          <div className="space-y-4">
            {/* OpenAI Option */}
            <div
              onClick={() => handleLLMProviderChange('openai')}
              className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                llmProvider === 'openai'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      llmProvider === 'openai'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {llmProvider === 'openai' && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">OpenAI (GPT-3.5)</h3>
                    {availableLLMs.find(l => l.id === 'openai')?.available ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                        VERFÜGBAR
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                        NICHT VERFÜGBAR
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-8">
                    Hochwertiges KI-Modell für Übersetzungsbewertung und Dialog-Training.
                  </p>
                  <div className="ml-8 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Zuverlässig und ausgereift</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Gute Genauigkeit bei Bewertungen</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Standardmodell</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mistral Large Option */}
            <div
              onClick={() => handleLLMProviderChange('mistral')}
              className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                llmProvider === 'mistral'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      llmProvider === 'mistral'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {llmProvider === 'mistral' && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">Mistral Large</h3>
                    {availableLLMs.find(l => l.id === 'mistral')?.available ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                        VERFÜGBAR
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                        NICHT KONFIGURIERT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-8">
                    Fortgeschrittenes europäisches KI-Modell für hochwertige Bewertungen.
                  </p>
                  <div className="ml-8 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Hochleistungs-KI-Modell</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Europäischer Anbieter</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Kann bessere Ergebnisse liefern</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-orange-600">⚠</span>
                      <span className="text-gray-700">Benötigt API-Key (noch nicht konfiguriert)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-bold text-blue-800 mb-1">Hinweis</p>
                <p className="text-sm text-blue-700 mb-2">
                  Das ausgewählte KI-Modell wird für folgende Funktionen verwendet:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4">
                  <li>📝 Generierung von Übersetzungssätzen</li>
                  <li>⭐ Bewertung von Übersetzungen</li>
                  <li>🎤 Dialog-Training und Szenario-Generierung</li>
                  <li>📊 Dialog-Performance-Bewertung</li>
                </ul>
              </div>
            </div>
          </div>

          {/* LLM Diagnostic Info */}
          <div className="mt-6 bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔍</span>
              <div className="flex-1">
                <p className="font-bold text-purple-800 mb-2">Diagnose-Information (für Entwickler)</p>
                <div className="text-sm space-y-1">
                  <p className="text-purple-700">
                    <span className="font-semibold">Aktueller LLM Provider (localStorage):</span>{' '}
                    <code className="bg-purple-100 px-2 py-1 rounded">{llmProvider}</code>
                  </p>
                  <p className="text-purple-700">
                    <span className="font-semibold">Verfügbare Provider:</span>{' '}
                    {availableLLMs.map(llm => (
                      <span key={llm.id} className="inline-flex items-center gap-1">
                        <code className="bg-purple-100 px-2 py-1 rounded">{llm.id}</code>
                        {llm.available ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                        {' '}
                      </span>
                    ))}
                  </p>
                  <p className="text-xs text-purple-600 mt-2">
                    ℹ️ Wenn die KI-Bewertung nicht funktioniert, prüfe ob der ausgewählte Provider verfügbar ist (grünes ✓).
                    Das Backend nutzt automatisch einen verfügbaren Provider, wenn der ausgewählte keinen API-Key hat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostics Panel */}
        <DiagnosticsPanel />
      </div>
    </div>
  );
}

export default SettingsModule;
