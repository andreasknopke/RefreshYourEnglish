import { useState, useEffect } from 'react';
import TranslationModule from './components/TranslationModule';
import ActionModule from './components/ActionModule';
import VocabularyTrainer from './components/VocabularyTrainer';
import VocabularyLibrary from './components/VocabularyLibrary';
import AuthModal from './components/AuthModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import apiService from './services/apiService';

function App() {
  const [activeModule, setActiveModule] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Lade User aus localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    
    // Listen for auth-required events (e.g., when session is invalid)
    const handleAuthRequired = (event) => {
      console.warn('Authentication required:', event.detail);
      handleLogout();
      setShowAuthModal(true);
    };
    
    window.addEventListener('auth-required', handleAuthRequired);
    return () => window.removeEventListener('auth-required', handleAuthRequired);
  }, []);

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* User Info / Login Button */}
        <div className="flex justify-end mb-4">
          {user ? (
            <div className="glass-card px-6 py-3 rounded-2xl flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{user.username?.[0]?.toUpperCase()}</span>
                </div>
                <span className="font-bold text-gray-800">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-800 font-bold"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="glass-card px-6 py-3 rounded-2xl font-bold text-indigo-600 hover:text-indigo-800 hover:scale-105 transition-all"
            >
              Login / Registrieren
            </button>
          )}
        </div>

        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold mb-4 gradient-text">
            Refresh Your English
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 font-medium">
            ✨ LLM-gestütztes Vokabeltraining ✨
          </p>
        </header>

        {!activeModule ? (
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Modul 1: Übersetzungsübung */}
            <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:scale-105 hover:rotate-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 mb-4 relative z-10">
                Übersetzungsübung
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed relative z-10">
                Übersetze deutsche Sätze ins Englische und erhalte KI-basiertes Feedback zu deinen Übersetzungen.
              </p>
              <button
                onClick={() => setActiveModule('translation')}
                className="w-full btn-primary relative z-10"
              >
                <span className="relative z-10">Jetzt starten →</span>
              </button>
            </div>

            {/* Modul 2: Action Modus */}
            <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:scale-105 hover:-rotate-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-6 shadow-lg relative z-10 group-hover:-rotate-12 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 mb-4 relative z-10">
                Action Modus
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed relative z-10">
                Trainiere deinen aktiven Wortschatz mit zeitbasierten Vokabelübungen im Countdown-Modus.
              </p>
              <button
                onClick={() => setActiveModule('action')}
                className="w-full btn-secondary relative z-10"
              >
                <span className="relative z-10">Jetzt starten →</span>
              </button>
            </div>

            {/* Modul 3: Vocabulary Trainer */}
            <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-6 shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 mb-4 relative z-10">
                Vocabulary Trainer
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed relative z-10">
                Lerne mit Flashcards und Spaced Repetition. Behalte deine Vokabeln langfristig im Gedächtnis.
              </p>
              <button
                onClick={() => setActiveModule('trainer')}
                disabled={!user}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
              >
                <span className="relative z-10">{user ? 'Jetzt starten →' : '🔒 Login erforderlich'}</span>
              </button>
            </div>

            {/* Modul 4: Vokabelbibliothek */}
            <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:scale-105 hover:rotate-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-6 shadow-lg relative z-10 group-hover:-rotate-12 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 mb-4 relative z-10">
                Vokabelbibliothek
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed relative z-10">
                Durchsuche und verwalte alle Vokabeln. Füge beliebige Wörter zum Trainer hinzu.
              </p>
              <button
                onClick={() => setActiveModule('library')}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:scale-105 transition-all relative z-10"
              >
                <span className="relative z-10">Jetzt starten →</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <button
              onClick={() => setActiveModule(null)}
              className="mb-8 flex items-center text-indigo-600 hover:text-indigo-800 font-semibold text-lg hover:-translate-x-2 transition-transform duration-200"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Zurück zur Modulauswahl
            </button>
            
            {activeModule === 'translation' && <TranslationModule user={user} />}
            {activeModule === 'action' && <ActionModule user={user} />}
            {activeModule === 'trainer' && <VocabularyTrainer user={user} />}
            {activeModule === 'library' && <VocabularyLibrary user={user} />}
          </div>
        )}

        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onLogin={(newUser) => setUser(newUser)}
          />
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </div>
  );
}

export default App;
