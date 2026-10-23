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
   * Setzt die bevorzugte Browser-Stimme pro Sprache.
   * @param {string} voiceName - Name der Stimme
   * @param {string} language - Sprachcode ('en', 'it', ...)
   */
  setPreferredVoice(voiceName, language = 'en') {
    localStorage.setItem(`preferred_browser_voice:${language}`, voiceName);
  }

  /**
   * Gibt die bevorzugte Browser-Stimme einer Sprache zurück.
   * @param {string} language - Sprachcode ('en', 'it', ...)
   */
  getPreferredVoice(language = 'en') {
    return localStorage.getItem(`preferred_browser_voice:${language}`) || null;
  }

  /**
   * Prüft, ob eine Stimme zu einem Sprachprefix passt ('it' matcht 'it',
   * 'it-IT', 'it_IT').
   */
  voiceMatchesLang(voice, prefix) {
    const lang = (voice.lang || '').replace('_', '-').toLowerCase();
    return lang === prefix || lang.startsWith(prefix + '-');
  }

  /**
   * Wählt die beste verfügbare Stimme für eine Sprache aus.
   * Wichtig: es wird NIEMALS eine Stimme einer anderen Sprache gewählt –
   * sonst klingt Italienisch plötzlich mit englischem Akzent.
   * @param {string} language - Sprachcode ('en', 'it', ...) oder volles Locale
   */
  selectBestVoice(language = 'en') {
    const voices = window.speechSynthesis.getVoices();

    console.log('🎙️ Verfügbare Stimmen:', voices.map(v => `${v.name} [${v.lang}]`));

    const locale = this.resolveLocale(language);      // z. B. 'it-IT'
    const prefix = locale.split('-')[0].toLowerCase(); // z. B. 'it'

    // Priorität 0: Benutzerdefinierte Stimme aus Settings (nur wenn sie
    // tatsächlich zu dieser Sprache passt).
    const preferredVoiceName = this.getPreferredVoice(prefix);
    if (preferredVoiceName) {
      const voice = voices.find(
        v => v.name === preferredVoiceName && this.voiceMatchesLang(v, prefix)
      );
      if (voice) {
        console.log('✅ Using preferred voice:', voice.name);
        return voice;
      }
    }

    // Stimmen, deren Lang zu dieser Sprache passt (zuerst exaktes Locale,
    // dann nur Sprachprefix).
    const exact = voices.filter(v => v.lang.replace('_', '-').toLowerCase() === locale.toLowerCase());
    const loose = voices.filter(v => this.voiceMatchesLang(v, prefix));
    const pool = exact.length > 0 ? exact : loose;

    // Bevorzuge hochwertige Stimmen (Natural/Google/Premium/Enhanced …).
    const quality = /(natural|google|premium|enhanced|neural)/i;
    const voice =
      pool.find(v => quality.test(v.name)) ||   // beste passende Stimme
      pool.find(v => !/lokal|local/i.test(v.name)) ||
      pool[0] ||                                 // beliebige passende Stimme
      null;

    if (voice) {
      console.log(`✅ Using voice for "${prefix}":`, voice.name, `[${voice.lang}]`);
      return voice;
    }

    console.warn(`⚠️ Keine "${prefix}"-Stimme installiert – Browser wählt Standard (Akzent möglich).`);
    return null;
  }

  /**
   * Wandelt einen Sprachcode ('en','de','it',...) oder ein volles Locale
   * ('it-IT') in ein BCP-47-Locale für die Web Speech API um.
   */
  resolveLocale(language = 'en') {
    const map = { en: 'en-US', de: 'de-DE', it: 'it-IT', fr: 'fr-FR', es: 'es-ES' };
    if (map[language]) return map[language];
    // Bereits ein volles Locale (enthält '-') oder unbekannt -> direkt durchreichen
    return language;
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
        utterance.lang = this.resolveLocale(language);
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
