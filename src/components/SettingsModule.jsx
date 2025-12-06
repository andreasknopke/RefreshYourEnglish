import { useState, useEffect } from 'react';
import sttService from '../services/sttService';

function SettingsModule() {
  const [sttProvider, setSttProvider] = useState('browser');
  const [elevenLabsAvailable, setElevenLabsAvailable] = useState(false);

  useEffect(() => {
    // Load current settings
    setSttProvider(sttService.getProvider());
    setElevenLabsAvailable(sttService.isElevenLabsAvailable());
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

        {/* Additional Settings (Placeholder for future) */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-3">🔧</span>
            Weitere Einstellungen
          </h2>
          <p className="text-gray-600 text-center py-8">
            Weitere Einstellungen werden in zukünftigen Updates hinzugefügt.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsModule;
