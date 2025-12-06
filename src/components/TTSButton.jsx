import { useState, useEffect } from 'react';
import ttsService from '../services/ttsService';

/**
 * Wiederverwendbarer TTS (Text-to-Speech) Button
 * @param {string} text - Der zu sprechende Text
 * @param {string} language - Sprache ('en' oder 'de')
 * @param {string} className - Zusätzliche CSS-Klassen
 * @param {Object} ttsOptions - ElevenLabs TTS-Optionen
 */
function TTSButton({ text, language = 'en', className = '', ttsOptions = {} }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Cleanup beim Unmount
    return () => {
      ttsService.stop();
    };
  }, []);

  const handleClick = async () => {
    if (!text) return;

    try {
      setError(null);

      if (isPlaying) {
        // Stoppe aktuelles Audio
        ttsService.stop();
        setIsPlaying(false);
      } else {
        // Starte neues Audio
        setIsLoading(true);
        await ttsService.speak(text, language, ttsOptions);
        setIsPlaying(true);
        
        // Warte auf Ende des Audios
        if (ttsService.currentAudio) {
          ttsService.currentAudio.onended = () => {
            setIsPlaying(false);
          };
        }
      }
    } catch (err) {
      console.error('TTS Error:', err);
      setError(err.message);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <button
        className={`p-2 text-red-500 cursor-not-allowed ${className}`}
        disabled
        title={`Fehler: ${error}`}
      >
        🔇
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
        isLoading ? 'opacity-50 cursor-wait' : ''
      } ${className}`}
      title={isPlaying ? 'Audio stoppen' : 'Text vorlesen'}
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : isPlaying ? (
        <span className="text-red-500">🔊</span>
      ) : (
        <span className="text-gray-600">🔊</span>
      )}
    </button>
  );
}

export default TTSButton;
