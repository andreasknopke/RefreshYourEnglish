import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function ResetPassword({ onClose }) {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError('Kein Token gefunden');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      await apiService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        window.history.pushState({}, '', '/');
        if (onClose) onClose();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ungültiger Link</h2>
          <p className="text-gray-600 mb-6">
            Dieser Link ist ungültig oder abgelaufen.
          </p>
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

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center animate-fade-in">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold gradient-text mb-4">Passwort zurückgesetzt!</h2>
          <p className="text-gray-700 mb-6">
            Dein Passwort wurde erfolgreich zurückgesetzt. Du wirst zur Startseite weitergeleitet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 max-w-md w-full animate-fade-in">
        <h2 className="text-2xl font-bold gradient-text mb-6">Neues Passwort setzen</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Neues Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-indigo-500 focus:outline-none"
              placeholder="mindestens 6 Zeichen"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-indigo-500 focus:outline-none"
              placeholder="Passwort wiederholen"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird gespeichert...' : 'Passwort zurücksetzen'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
