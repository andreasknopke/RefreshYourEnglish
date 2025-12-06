/**
 * ElevenLabs Text-to-Speech Service
 * Dokumentation: https://elevenlabs.io/docs/api-reference/text-to-speech
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Vordefinierte Stimmen für verschiedene Sprachen
const VOICES = {
  en: 'EXAVITQu4vr4xnSDxMaL', // Rachel - weiblich, amerikanisches Englisch
  de: 'pFZP5JQG7iQjIQuC4Bku', // Lily - weiblich, deutsch
  // Weitere Stimmen können hier hinzugefügt werden
};

class TTSService {
  constructor() {
    this.audioCache = new Map();
    this.currentAudio = null;
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
      voiceId = VOICES[language] || VOICES.en,
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
   * Spielt einen Text ab
   * @param {string} text - Der zu sprechende Text
   * @param {string} language - Sprache ('en' oder 'de')
   * @param {Object} options - Zusätzliche Optionen
   */
  async speak(text, language = 'en', options = {}) {
    try {
      // Stoppe aktuelles Audio
      this.stop();

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
