/**
 * Text-to-Speech Service
 * Nutzt die Web Speech API des Browsers
 */

class TTSService {
  constructor() {
    this.currentAudio = null;
    this.isBrowserSpeaking = false;

    // Sprachausgabe läuft ausschließlich im Browser
    this.provider = 'browser';

    // Check browser support for Web Speech API
    this.isBrowserTTSSupported = 'speechSynthesis' in window;
  }

  /**
   * Gibt den aktuellen Provider zurück
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Prüft ob Browser TTS verfügbar ist
   */
  isBrowserTTSAvailable() {
    return this.isBrowserTTSSupported;
  }

  /**
   * Gibt alle verfügbaren Browser-Stimmen zurück
   */
  getAvailableVoices() {
    if (!this.isBrowserTTSSupported) {
      return [];
    }
    return window.speechSynthesis.getVoices();
  }

  /**
   * Setzt die bevorzugte Browser-Stimme
   * @param {string} voiceName - Name der Stimme
   */
  setPreferredVoice(voiceName) {
    localStorage.setItem('preferred_browser_voice', voiceName);
  }

  /**
   * Gibt die bevorzugte Browser-Stimme zurück
   */
  getPreferredVoice() {
    return localStorage.getItem('preferred_browser_voice') || null;
  }

  /**
   * Wählt die beste verfügbare Stimme aus
   * @param {string} language - Sprache ('en' oder 'de')
   */
  selectBestVoice(language = 'en') {
    const voices = window.speechSynthesis.getVoices();
    
    console.log('🎙️ Verfügbare Stimmen:', voices.map(v => v.name));
    
    // Priorität 0: Benutzerdefinierte Stimme aus Settings
    const preferredVoiceName = this.getPreferredVoice();
    if (preferredVoiceName) {
      const voice = voices.find(v => v.name === preferredVoiceName);
      if (voice) {
        console.log('✅ Using preferred voice:', voice.name);
        return voice;
      }
    }
    
    if (language === 'en') {
      // Priorität 1: Jenny (Natural)
      let voice = voices.find(v => 
        v.name.includes('Jenny') && v.name.includes('Natural')
      );
      
      if (voice) {
        console.log('✅ Using Jenny (Natural)');
        return voice;
      }
      
      // Priorität 2: Beliebige Natural-Stimme für Englisch
      voice = voices.find(v => 
        v.name.includes('Natural') && v.lang.startsWith('en')
      );
      
      if (voice) {
        console.log('✅ Using:', voice.name);
        return voice;
      }
      
      // Priorität 3: Beliebige englische Stimme
      voice = voices.find(v => v.lang.startsWith('en'));
      
      if (voice) {
        console.log('⚠️ Using fallback:', voice.name);
        return voice;
      }
    }
    
    console.log('⚠️ Keine passende Stimme gefunden');
    return null;
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

      // Funktion zum Sprechen mit ausgewählter Stimme
      const speakWithVoice = () => {
        // Stoppe vorherige Ausgabe
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Wähle die beste Stimme
        const selectedVoice = this.selectBestVoice(language);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

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
      };

      // Warte auf Stimmen falls noch nicht geladen
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        console.log('⏳ Warte auf Stimmen...');
        window.speechSynthesis.onvoiceschanged = () => {
          console.log('✅ Stimmen geladen');
          speakWithVoice();
        };
      } else {
        speakWithVoice();
      }
    });
  }

  /**
   * Spielt einen Text ab
   * @param {string} text - Der zu sprechende Text
   * @param {string} language - Sprache ('en' oder 'de')
   */
  async speak(text, language = 'en') {
    try {
      // Stoppe aktuelles Audio
      this.stop();

      return await this.speakWithBrowser(text, language);
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

    // Stoppe ggf. laufendes Audio-Element
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
    return this.isBrowserSpeaking;
  }
}

// Singleton-Instanz exportieren
const ttsService = new TTSService();
export default ttsService;

// Named Exports für einzelne Funktionen
export const speak = (text, language) => ttsService.speak(text, language);
export const stop = () => ttsService.stop();
export const isPlaying = () => ttsService.isPlaying();
