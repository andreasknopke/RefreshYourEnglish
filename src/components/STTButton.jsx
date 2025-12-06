import { useState, useEffect } from 'react';
import sttService from '../services/sttService';

/**
 * Speech-to-Text Button Component
 * Mikrofon-Button für Spracheingabe mittels Web Speech API
 */
function STTButton({ onTranscript, language = 'en', disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(sttService.checkSupport());
  }, []);

  const handleStartRecording = () => {
    try {
      setError(null);
      setInterimText('');
      
      // ElevenLabs provider
      if (sttService.getProvider() === 'elevenlabs') {
        sttService.start();
        setIsRecording(true);
        return;
      }
      
      // Browser Web Speech API
      sttService.initRecognition(
        language,
        // onResult - Zwischenergebnisse
        (text) => {
          setInterimText(text);
        },
        // onFinalResult - Finales Ergebnis
        (text) => {
          setIsRecording(false);
          setInterimText('');
          if (text && onTranscript) {
            onTranscript(text);
          }
        },
        // onError
        (errorMsg) => {
          setIsRecording(false);
          setError(errorMsg);
          setTimeout(() => setError(null), 3000);
        }
      );
      
      sttService.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleStopRecording = async () => {
    try {
      // ElevenLabs provider
      if (sttService.getProvider() === 'elevenlabs') {
        setIsRecording(false);
        const text = await sttService.stop(language);
        if (text && onTranscript) {
          onTranscript(text);
        }
        return;
      }
      
      // Browser Web Speech API
      sttService.stop();
      setIsRecording(false);
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError(err.message);
      setIsRecording(false);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  if (!isSupported) {
    return (
      <button
        disabled
        className="p-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
        title="Spracherkennung wird von diesem Browser nicht unterstützt"
      >
        <span className="text-xl">🎤</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-all ${
        isRecording
          ? 'bg-red-500 text-white animate-pulse'
          : error
          ? 'bg-red-100 text-red-600'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
      title={
        isRecording
          ? interimText || 'Höre zu...'
          : error
          ? error
          : 'Spracheingabe starten'
      }
    >
      {isRecording ? (
        <span className="text-xl">🔴</span>
      ) : error ? (
        <span className="text-xl">⚠️</span>
      ) : (
        <span className="text-xl">🎤</span>
      )}
    </button>
  );
}

export default STTButton;
