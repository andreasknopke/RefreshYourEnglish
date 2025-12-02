import { useState, useEffect } from 'react';
import TranslationModule from './components/TranslationModule';
import ActionModule from './components/ActionModule';
import DialogModule from './components/DialogModule';
import VocabularyTrainer from './components/VocabularyTrainer';
import VocabularyLibrary from './components/VocabularyLibrary';
import AuthModal from './components/AuthModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import VerifyEmail from './components/VerifyEmail';
import ResetPassword from './components/ResetPassword';
import GamificationBanner from './components/GamificationBanner';
import apiService from './services/apiService';

function App() {
  const [activeModule, setActiveModule] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(null);
  const [dueFlashcardsCount, setDueFlashcardsCount] = useState(0);

  useEffect(() => {
    // Check for special routes
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      const path = window.location.pathname;
      if (path.includes('verify-email') || window.location.href.includes('verify-email')) {
        setActiveModule('verify-email');
      } else if (path.includes('reset-password') || window.location.href.includes('reset-password')) {
        setActiveModule('reset-password');
      }
    }

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

  // Lade fällige Flashcards für Badge
  useEffect(() => {
    if (user) {
      loadDueFlashcardsCount();
      // Update alle 30 Sekunden
      const interval = setInterval(loadDueFlashcardsCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadDueFlashcardsCount = async () => {
    try {
      const data = await apiService.getDueFlashcards();
      setDueFlashcardsCount(data.flashcards?.length || 0);
    } catch (error) {
      console.error('Failed to load due flashcards count:', error);
    }
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    localStorage.removeItem('user');
  };

  // Handle special routes
  if (activeModule === 'verify-email') {
    return <VerifyEmail onClose={() => setActiveModule(null)} />;
  }

  if (activeModule === 'reset-password') {
    return <ResetPassword onClose={() => setActiveModule(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-3 py-4 relative z-10">
        {/* User Info / Login Button */}
        <div className="flex justify-end mb-3">
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

        {/* Gamification Banner */}
        {user && <GamificationBanner user={user} />}

        {!activeModule ? (
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Modul 1: Übersetzungsübung */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:rotate-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Übersetzung
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10">
                Übersetze Sätze mit KI-Feedback
              </p>
              <button
                onClick={() => setActiveModule('translation')}
                className="w-full btn-primary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Starten →</span>
              </button>
            </div>

            {/* Modul 2: Action Modus */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:-rotate-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:-rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Action Modus
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10">
                Vokabeln mit Countdown-Timer
              </p>
              <button
                onClick={() => setActiveModule('action')}
                className="w-full btn-secondary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Starten →</span>
              </button>
            </div>

            {/* Modul 3: Dialog Trainer */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:rotate-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Dialog
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10">
                Konversationstraining mit KI
              </p>
              <button
                onClick={() => setActiveModule('dialog')}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold text-sm py-2 rounded-lg hover:scale-105 transition-all relative z-10"
              >
                <span className="relative z-10">Starten →</span>
              </button>
            </div>

            {/* Modul 4: Vocabulary Trainer */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Badge für fällige Karten */}
              {user && dueFlashcardsCount > 0 && (
                <div className="absolute top-2 right-2 z-20">
                  <div className="bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-pulse">
                    {dueFlashcardsCount}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Flashcards
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10">
                Spaced Repetition Lernen
              </p>
              <button
                onClick={() => setActiveModule('trainer')}
                disabled={!user}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold text-sm py-2 rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
              >
                <span className="relative z-10">{user ? 'Starten →' : '🔒 Login'}</span>
              </button>
            </div>

            {/* Modul 5: Vokabelbibliothek */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:rotate-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:-rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Bibliothek
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10">
                Vokabeln verwalten und suchen
              </p>
              <button
                onClick={() => setActiveModule('library')}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm py-2 rounded-lg hover:scale-105 transition-all relative z-10"
              >
                <span className="relative z-10">Starten →</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <button
              onClick={() => setActiveModule(null)}
              className="mb-4 flex items-center text-indigo-600 hover:text-indigo-800 font-semibold text-base hover:-translate-x-2 transition-transform duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Zurück
            </button>
            
            {activeModule === 'translation' && <TranslationModule user={user} />}
            {activeModule === 'action' && <ActionModule user={user} />}
            {activeModule === 'dialog' && <DialogModule user={user} />}
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
