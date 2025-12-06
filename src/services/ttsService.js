/**
 * Text-to-Speech Service
 * Unterstützt Web Speech API (Browser) und ElevenLabs API
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Vordefinierte Stimmen für verschiedene Sprachen
// Diese werden verwendet, falls keine benutzerdefinierte Voice-ID gesetzt ist
const DEFAULT_VOICES = {
  en: 'EXAVITQu4vr4xnSDxMaL', // Rachel - weiblich, amerikanisches Englisch
  de: 'pFZP5JQG7iQjIQuC4Bku', // Lily - weiblich, deutsch
};

// Benutzerdefinierte Voice-ID aus Umgebungsvariablen (hat Vorrang)
const CUSTOM_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

// Funktion um die richtige Voice-ID zu ermitteln
function getVoiceId(language) {
  // Wenn eine benutzerdefinierte Voice-ID gesetzt ist, verwende diese für alle Sprachen
  if (CUSTOM_VOICE_ID) {
    return CUSTOM_VOICE_ID;
  }
  // Ansonsten verwende die Standard-Stimme für die Sprache
  return DEFAULT_VOICES[language] || DEFAULT_VOICES.en;
}

class TTSService {
  constructor() {
    this.audioCache = new Map();
    this.currentAudio = null;
    this.isBrowserSpeaking = false;
    
    // Load TTS provider preference from localStorage
    this.provider = localStorage.getItem('tts_provider') || 'elevenlabs';
    
    // Check browser support for Web Speech API
    this.isBrowserTTSSupported = 'speechSynthesis' in window;
  }

  /**
   * Setzt den TTS-Provider
   * @param {string} provider - 'browser' oder 'elevenlabs'
   */
  setProvider(provider) {
    if (provider !== 'browser' && provider !== 'elevenlabs') {
      throw new Error('Invalid provider. Use "browser" or "elevenlabs"');
    }
    this.provider = provider;
    localStorage.setItem('tts_provider', provider);
  }

  /**
   * Gibt den aktuellen Provider zurück
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Prüft ob ElevenLabs verfügbar ist
   */
  isElevenLabsAvailable() {
    return !!ELEVENLABS_API_KEY;
  }

  /**
   * Prüft ob Browser TTS verfügbar ist
   */
  isBrowserTTSAvailable() {
    return this.isBrowserTTSSupported;
  }

  /**
   * Generiert Audio für einen Text
   * @param {string} text - Der zu sprechende Text
   * @param {string} language - Sprache ('en' oder 'de')
   * @param {Object} options - Zusätzliche Optionen
   * @returns {Promise<Blob>} - Audio-Blob
   */
  async generateAudio(text, language = 'en', options = {}) {
    if (!ELEVENLABS_API_KEY) {
      console.warn('⚠️ ElevenLabs API Key nicht konfiguriert');
      return null;
    }

    const {
      voiceId = getVoiceId(language),
      modelId = 'eleven_monolingual_v1',
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0,
      useSpeakerBoost = true
    } = options;

    const cacheKey = `${text}_${voiceId}`;
    
    // Cache-Check
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
              style,
              use_speaker_boost: useSpeakerBoost
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      
      // Cache speichern (max 50 Einträge)
      if (this.audioCache.size >= 50) {
        const firstKey = this.audioCache.keys().next().value;
        this.audioCache.delete(firstKey);
      }
      this.audioCache.set(cacheKey, audioBlob);

      return audioBlob;
    } catch (error) {
      console.error('❌ TTS Error:', error);
      throw error;
    }
  }

  /**
   * Spricht Text mit Browser Web Speech API
   * @param {string} text - Der zu sprechende Text
   * @param {string} language - Sprache ('en' oder 'de')
   */
  speakWithBrowser(text, language = 'en') {
    return new Promise((resolve, reject) => {
      if (!this.isBrowserTTSSupported) {
        reject(new Error('Browser unterstützt keine Sprachausgabe'));
        return;
      }

      // Stoppe vorherige Ausgabe
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
      utterance.rate = 0.9; // Etwas langsamer für besseres Verständnis
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        this.isBrowserSpeaking = false;
        resolve();
      };

      utterance.onerror = (event) => {
        this.isBrowserSpeaking = false;
        reject(new Error(`Browser TTS Error: ${event.error}`));
      };

      this.isBrowserSpeaking = true;
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Spielt einen Text ab
   * @param {string} text - Der zu sprechende Text
   * @param {string} language - Sprache ('en' oder 'de')
   * @param {Object} options - Zusätzliche Optionen
   */
  async speak(text, language = 'en', options = {}) {
    try {
      // Stoppe aktuelles Audio
      this.stop();

      // Browser TTS
      if (this.provider === 'browser') {
        return await this.speakWithBrowser(text, language);
      }

      // ElevenLabs API
      const audioBlob = await this.generateAudio(text, language, options);
      if (!audioBlob) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      
      // Cleanup nach Abspielen
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      await this.currentAudio.play();
    } catch (error) {
      console.error('❌ Speak Error:', error);
      throw error;
    }
  }

  /**
   * Stoppt die aktuelle Wiedergabe
   */
  stop() {
    // Stoppe Browser TTS
    if (this.isBrowserSpeaking && this.isBrowserTTSSupported) {
      window.speechSynthesis.cancel();
      this.isBrowserSpeaking = false;
    }
    
    // Stoppe ElevenLabs Audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Prüft, ob Audio gerade abgespielt wird
   * @returns {boolean}
   */
  isPlaying() {
    if (this.provider === 'browser') {
      return this.isBrowserSpeaking;
    }
    return this.currentAudio && !this.currentAudio.paused;
  }

  /**
   * Löscht den Audio-Cache
   */
  clearCache() {
    this.audioCache.clear();
  }

  /**
   * Holt verfügbare Stimmen von der API
   * @returns {Promise<Array>}
   */
  async getVoices() {
    if (!ELEVENLABS_API_KEY) {
      return [];
    }

    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('❌ Get Voices Error:', error);
      return [];
    }
  }
}

// Singleton-Instanz exportieren
const ttsService = new TTSService();
export default ttsService;

// Named Exports für einzelne Funktionen
export const speak = (text, language, options) => ttsService.speak(text, language, options);
export const stop = () => ttsService.stop();
export const isPlaying = () => ttsService.isPlaying();
export const getVoices = () => ttsService.getVoices();
