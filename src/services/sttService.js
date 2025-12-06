/**
 * Speech-to-Text Service
 * Unterstützt Web Speech API (Browser) und ElevenLabs API
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

class STTService {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.mediaRecorder = null;
    this.audioChunks = [];
    
    // Load STT provider preference from localStorage
    this.provider = localStorage.getItem('stt_provider') || 'browser';
  }

  /**
   * Setzt den STT-Provider
   * @param {string} provider - 'browser' oder 'elevenlabs'
   */
  setProvider(provider) {
    if (provider !== 'browser' && provider !== 'elevenlabs') {
      throw new Error('Invalid provider. Use "browser" or "elevenlabs"');
    }
    this.provider = provider;
    localStorage.setItem('stt_provider', provider);
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
   * Startet die Audioaufnahme (für ElevenLabs)
   */
  async startElevenLabsRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      
      const options = { mimeType: 'audio/webm' };
      this.mediaRecorder = new MediaRecorder(stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      
      return this.mediaRecorder;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Mikrofon-Zugriff verweigert');
    }
  }

  /**
   * Stoppt die Audioaufnahme und transkribiert mit ElevenLabs
   */
  async stopElevenLabsRecording(language = 'en') {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('Keine aktive Aufnahme');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
          
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.isRecording = false;
          
          const text = await this.transcribeWithElevenLabs(audioBlob, language);
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      
      this.mediaRecorder.stop();
    });
  }

  /**
   * Transkribiert Audio mit ElevenLabs API
   */
  async transcribeWithElevenLabs(audioBlob, language = 'en') {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API Key nicht konfiguriert');
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('model_id', 'eleven_multilingual_v2');

      const response = await fetch(`${ELEVENLABS_API_URL}/speech-to-text`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs STT Error:', errorText);
        throw new Error(`ElevenLabs API Fehler: ${response.status}`);
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('ElevenLabs transcription error:', error);
      throw error;
    }
  }

  /**
   * Startet die Spracherkennung (automatisch Browser oder ElevenLabs)
   */
  start() {
    if (this.provider === 'elevenlabs') {
      return this.startElevenLabsRecording();
    }
    
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
   * Stoppt die Spracherkennung (automatisch Browser oder ElevenLabs)
   */
  async stop(language = 'en') {
    if (this.provider === 'elevenlabs') {
      return await this.stopElevenLabsRecording(language);
    }
    
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
    if (this.provider === 'elevenlabs' && this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;
      this.audioChunks = [];
      return;
    }
    
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
    if (this.provider === 'elevenlabs') {
      return this.isElevenLabsAvailable();
    }
    return this.isSupported;
  }
}

// Singleton Instance
const sttService = new STTService();
export default sttService;
