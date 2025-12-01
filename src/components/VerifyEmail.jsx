import { useEffect, useState } from 'react';
import apiService from '../services/apiService';

function VerifyEmail({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      verifyEmail(token);
    } else {
      setLoading(false);
      setError('Kein Verifizierungs-Token gefunden');
    }
  }, []);

  const verifyEmail = async (token) => {
    try {
      await apiService.verifyEmail(token);
      setSuccess(true);
      setTimeout(() => {
        window.history.pushState({}, '', '/');
        if (onClose) onClose();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Verifizierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">E-Mail wird verifiziert...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center animate-fade-in">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold gradient-text mb-4">E-Mail verifiziert!</h2>
          <p className="text-gray-700 mb-6">
            Deine E-Mail-Adresse wurde erfolgreich bestätigt. Du wirst zur Startseite weitergeleitet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Verifizierung fehlgeschlagen</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => {
            window.history.pushState({}, '', '/');
            if (onClose) onClose();
          }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:scale-105 transition-all"
        >
          Zur Startseite
        </button>
      </div>
    </div>
  );
}

export default VerifyEmail;
