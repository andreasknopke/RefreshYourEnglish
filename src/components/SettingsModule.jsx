import { useState, useEffect } from 'react';
import ttsService from '../services/ttsService';
import * as llmService from '../services/llmService';
import DiagnosticsPanel from './DiagnosticsPanel';

function SettingsModule() {
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [llmInfo, setLLMInfo] = useState(null);

  useEffect(() => {
    // LLM-Konfiguration kommt aus dem Backend (LLM_BASE_URL / LLM_API_KEY / LLM_MODEL)
    let cancelled = false;
    llmService.getLLMInfo().then((info) => {
      if (!cancelled) setLLMInfo(info);
    });

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

    return () => {
      cancelled = true;
    };
  }, []);

  const handleVoiceChange = (voiceName) => {
    try {
      ttsService.setPreferredVoice(voiceName);
      setSelectedVoice(voiceName);
    } catch (error) {
      console.error('Failed to change voice:', error);
      alert('❌ Fehler beim Ändern der Stimme: ' + error.message);
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
            {/* Browser Option (einziger Anbieter) */}
            <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-indigo-500 bg-indigo-500">
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
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
            {/* Browser Option (einziger Anbieter) */}
            <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-indigo-500 bg-indigo-500">
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
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
            {availableVoices.length > 0 && (
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
            KI-Modell (LLM)
          </h2>
          
          <div className="space-y-4">
            {/* OpenAI-kompatible Schnittstelle (über ENV konfiguriert) */}
            <div className="p-4 rounded-xl border-2 border-purple-500 bg-purple-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-purple-500 bg-purple-500">
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">
                      OpenAI-kompatible API (frei konfigurierbar)
                    </h3>
                    {llmInfo?.hasApiKey ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                        KONFIGURIERT
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                        NICHT KONFIGURIERT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-8">
                    Base URL, API-Key und Modellname werden per Umgebungsvariablen gesetzt –
                    dadurch sind Mistral, OpenAI oder ein lokales Modell (z. B. Ollama) möglich.
                  </p>
                  <div className="ml-8 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Base URL:</span>
                      <code className="bg-white px-2 py-0.5 rounded border border-purple-200">{llmInfo?.baseUrl || '(nicht gesetzt)'}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Modell:</span>
                      <code className="bg-white px-2 py-0.5 rounded border border-purple-200">{llmInfo?.model || '(nicht gesetzt)'}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={llmInfo?.hasApiKey ? 'text-green-600' : 'text-orange-600'}>
                        {llmInfo?.hasApiKey ? '✓' : '⚠'}
                      </span>
                      <span className="text-gray-700">
                        API-Key: {llmInfo?.hasApiKey ? 'gesetzt' : 'nicht gesetzt – die App nutzt dann Fallback-Bewertungen'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-8 mt-3 text-xs text-gray-500 space-y-1">
                    <p>Backend (Coolify/Railway): <code>LLM_BASE_URL</code>, <code>LLM_API_KEY</code>, <code>LLM_MODEL</code></p>
                    <p>Frontend-Build (nur für direkte Browser-Aufrufe): <code>VITE_LLM_BASE_URL</code>, <code>VITE_LLM_API_KEY</code>, <code>VITE_LLM_MODEL</code></p>
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
                  Das konfigurierte KI-Modell wird für folgende Funktionen verwendet:
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
        </div>

        {/* Diagnostics Panel */}
        <DiagnosticsPanel />
      </div>
    </div>
  );
}

export default SettingsModule;
