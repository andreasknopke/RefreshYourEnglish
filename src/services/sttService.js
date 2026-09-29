/**
 * Speech-to-Text Service
 * Nutzt die Web Speech API des Browsers
 */

class STTService {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.mediaRecorder = null;
    this.audioChunks = [];

    // Spracherkennung läuft ausschließlich im Browser
    this.provider = 'browser';
  }

  /**
   * Gibt den aktuellen Provider zurück
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Initialisiert die Spracherkennung
   * @param {string} language - Zielsprache ('en' oder 'de')
   * @param {Function} onResult - Callback für Zwischenergebnisse
   * @param {Function} onFinalResult - Callback für finales Ergebnis
   * @param {Function} onError - Callback für Fehler
   */
  initRecognition(language = 'en', onResult, onFinalResult, onError) {
    if (!this.isSupported) {
      throw new Error('Spracherkennung wird von diesem Browser nicht unterstützt');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Konfiguration
    this.recognition.continuous = false; // Stoppt nach einer Phrase
    this.recognition.interimResults = true; // Zeige Zwischenergebnisse
    this.recognition.lang = language === 'de' ? 'de-DE' : 'en-US';
    this.recognition.maxAlternatives = 1;

    // Event Handlers
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && onResult) {
        onResult(interimTranscript);
      }

      if (finalTranscript && onFinalResult) {
        onFinalResult(finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isRecording = false;
      
      if (onError) {
        let errorMessage = 'Spracherkennungsfehler';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'Keine Sprache erkannt';
            break;
          case 'audio-capture':
            errorMessage = 'Mikrofon nicht verfügbar';
            break;
          case 'not-allowed':
            errorMessage = 'Mikrofon-Zugriff verweigert';
            break;
          case 'network':
            errorMessage = 'Netzwerkfehler';
            break;
          default:
            errorMessage = `Fehler: ${event.error}`;
        }
        onError(errorMessage);
      }
    };

    this.recognition.onend = () => {
      this.isRecording = false;
    };
  }

  /**
   * Startet die Spracherkennung (Browser Web Speech API)
   */
  start() {
    // Browser Web Speech API
    if (!this.recognition) {
      throw new Error('Spracherkennung nicht initialisiert');
    }
    
    if (this.isRecording) {
      console.warn('Spracherkennung läuft bereits');
      return;
    }

    try {
      this.recognition.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start recognition:', error);
      throw error;
    }
  }

  /**
   * Stoppt die Spracherkennung (Browser Web Speech API)
   */
  async stop() {
    // Browser Web Speech API
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }
  }

  /**
   * Bricht die Spracherkennung ab
   */
  abort() {
    if (this.recognition && this.isRecording) {
      this.recognition.abort();
      this.isRecording = false;
    }
  }

  /**
   * Prüft ob Spracherkennung unterstützt wird
   * @returns {boolean}
   */
  checkSupport() {
    return this.isSupported;
  }
}

// Singleton Instance
const sttService = new STTService();
export default sttService;
