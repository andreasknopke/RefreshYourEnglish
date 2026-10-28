import { useState, useEffect } from 'react';
import SettingsModule from './components/SettingsModule';
import AuthModal from './components/AuthModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import VerifyEmail from './components/VerifyEmail';
import ResetPassword from './components/ResetPassword';
import LogViewer from './components/LogViewer';
import apiService from './services/apiService';
import logService from './services/logService';
import v2Client from './core/api/v2Client';
import { useLanguage } from './core/language/LanguageContext';
import OnboardingWizard from './features/onboarding/OnboardingWizard';
import PlacementTest from './features/placement/PlacementTest';
import ReviewModule from './features/review/ReviewModule';
import ReaderModule from './features/reader/ReaderModule';
import GrammarModule from './features/grammar/GrammarModule';
import WritingModule from './features/writing/WritingModule';
import SpeakingModule from './features/speaking/SpeakingModule';
import DailySession from './features/session/DailySession';
import ProgressDashboard from './features/progress/ProgressDashboard';

function App() {
  const [activeModule, setActiveModule] = useState(null);
  const [sessionFocus, setSessionFocus] = useState(null); // Deep-Link aus der Tages-Sitzung

  // Modul ohne Deep-Link öffnen (normale Navigation)
  const openModule = (m) => {
    setSessionFocus(null);
    setActiveModule(m);
  };

  // Aus einem Sitzungs-Modul zurück zur Tages-Sitzung
  const backToSession = () => {
    setSessionFocus(null);
    setActiveModule('session');
  };
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'online', 'offline'

  // Mehrsprachige Engine (Phase 1): Onboarding / Placement-Steuerung
  const {
    userLanguages,
    activeUserLanguage,
    loading: langLoading,
    refreshUserLanguages,
    switchLanguage
  } = useLanguage();
  const [flow, setFlow] = useState(null); // 'onboarding' | 'placement' | null
  // Placement-Status der aktiven Sprache: { done, lastSession } | null
  const [placementStatus, setPlacementStatus] = useState(null);

  useEffect(() => {
    // Log App Start
    logService.info('APP', 'Anwendung gestartet', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    // Check Backend Status
    checkBackendStatus();
    
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

  // Backend-Status regelmäßig prüfen
  useEffect(() => {
    if (user) {
      checkBackendStatus();
      const interval = setInterval(checkBackendStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Lade Zielsprachen des Nutzers; steuere Onboarding/Placement
  useEffect(() => {
    if (!user) {
      setFlow(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const langs = await refreshUserLanguages(user.id);
      if (cancelled) return;
      if (langs.length === 0) setFlow('onboarding');
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refreshUserLanguages]);

  // Placement-Status der aktiven Sprache laden (für Erinnerung/Banner).
  const activeLangId = activeUserLanguage?.id;
  useEffect(() => {
    setPlacementStatus(null);
    if (!user || !activeLangId) return;
    let cancelled = false;
    v2Client
      .getPlacementStatus(activeLangId)
      .then((s) => {
        if (!cancelled) setPlacementStatus(s);
      })
      .catch(() => {
        if (!cancelled) setPlacementStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, activeLangId]);

  const checkBackendStatus = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const baseUrl = apiUrl.replace('/api', '');
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        setBackendStatus('online');
        logService.info('APP', 'Backend Status: Online', { apiUrl, baseUrl });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setBackendStatus('offline');
      logService.warn('APP', 'Backend Status: Offline', { 
        error: error.message,
        apiUrl: import.meta.env.VITE_API_URL 
      });
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
        {/* Backend Status Warning */}
        {backendStatus === 'offline' && (
          <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded shadow-lg animate-fade-in">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold">
                  ⚠️ Backend nicht erreichbar
                </p>
                <p className="text-xs mt-1">
                  Das Backend startet möglicherweise gerade neu (Railway cold start). Bitte warte 30 Sekunden.
                  Die App funktioniert weiterhin mit lokaler KI-Bewertung.
                </p>
                <button 
                  onClick={checkBackendStatus}
                  className="mt-2 text-xs font-bold underline hover:no-underline"
                >
                  Status erneut prüfen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Info / Login Button / Settings */}
        <div className="flex justify-end mb-3 gap-2">
          {/* Sprachumschalter (mehrere Zielsprachen) */}
          {user && userLanguages.length > 0 && (
            <div className="glass-card px-3 py-3 rounded-2xl flex items-center gap-1">
              {userLanguages.map((l) => (
                <button
                  key={l.id}
                  className={`px-2 py-0.5 rounded-lg text-sm font-bold transition-all ${
                    l.active ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title={l.targetLang}
                  onClick={async () => {
                    if (!l.active) {
                      await switchLanguage(l.id);
                      setActiveModule(null);
                    }
                  }}
                >
                  {l.targetLang.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => setFlow('onboarding')}
                className="px-2 py-0.5 rounded-lg text-sm font-bold text-gray-400 hover:bg-gray-100"
                title="Weitere Sprache hinzufügen"
              >
                +
              </button>
            </div>
          )}

          {/* Debug Log Button */}
          <button
            onClick={() => setShowLogViewer(true)}
            className="glass-card px-4 py-3 rounded-2xl font-bold text-gray-700 hover:text-red-600 hover:scale-105 transition-all"
            title="Debug Logs"
          >
            🐛
          </button>
          
          {/* Settings Button */}
          <button
            onClick={() => openModule('settings')}
            className="glass-card px-4 py-3 rounded-2xl font-bold text-gray-700 hover:text-indigo-600 hover:scale-105 transition-all"
            title="Einstellungen"
          >
            ⚙️
          </button>
          
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

        {/* Onboarding / Placement (nur wenn eingeloggt und noch keine Zielsprache) */}
        {user && !langLoading && flow === 'onboarding' && (
          <div className="py-6">
            <OnboardingWizard
              onComplete={async ({ userLanguage, wantsPlacement }) => {
                if (wantsPlacement) {
                  setFlow('placement');
                } else {
                  // Nutzer hat Placement bewusst abgelehnt → Banner unterdrücken
                  if (userLanguage?.id) {
                    try {
                      await v2Client.dismissPlacement(userLanguage.id);
                    } catch {
                      /* ignore */
                    }
                  }
                  setFlow(null);
                }
              }}
              onCancel={() => setFlow(null)}
            />
          </div>
        )}

        {user && flow === 'placement' && activeUserLanguage && (
          <div className="py-6">
            <PlacementTest
              userLanguage={activeUserLanguage}
              lang={activeUserLanguage.targetLang}
              onComplete={() => {
                setFlow(null);
                // Banner-Status aktualisieren (Test jetzt abgeschlossen)
                setPlacementStatus((prev) => prev && { ...prev, done: true });
              }}
              onSkip={async () => {
                try {
                  await v2Client.dismissPlacement(activeLangId);
                  setPlacementStatus((prev) => prev && { ...prev, dismissed: true });
                } catch {
                  /* ignore */
                }
                setFlow(null);
              }}
            />
          </div>
        )}

        {/* Haupt-Content: nur wenn keine Onboarding/Placement-View aktiv ist */}
        {!(user && (flow === 'onboarding' || flow === 'placement')) && (
        <>
        {!activeModule ? (
          <div className="max-w-7xl mx-auto">
            {/* Erinnerung: Einstufungstest nicht abgeschlossen (nur wenn nicht bewusst übersprungen) */}
            {user && activeUserLanguage && placementStatus && !placementStatus.done && !placementStatus.dismissed && (
              <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4">
                <div>
                  <p className="font-bold text-amber-800">
                    📋 Einstufungstest nicht abgeschlossen
                  </p>
                  <p className="text-sm text-amber-700">
                    Ohne Placement starten wir mit deinem angegebenen Niveau. Der
                    adaptive Test passt die täglichen Sessions genauer an dich an.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      try {
                        await v2Client.dismissPlacement(activeLangId);
                        setPlacementStatus((prev) => prev && { ...prev, dismissed: true });
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="rounded-xl px-4 py-2.5 font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                    title="Nicht mehr daran erinnern"
                  >
                    Nicht mehr erinnern
                  </button>
                  <button
                    onClick={() => setFlow('placement')}
                    className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-white hover:bg-amber-600 transition-colors"
                  >
                    Jetzt nachholen →
                  </button>
                </div>
              </div>
            )}

            {/* Hauptmodule Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
            {/* Modul: Tages-Sitzung (Session Composer, Mehrsprachige Engine) */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 transition-all duration-300 flex flex-col ring-2 ring-indigo-300">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mb-3 shadow-lg relative z-10">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Tages-Sitzung
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10 flex-grow">
                Deine automatisch geplante Einheit: Input → Fokus → Output → Check
              </p>
              <button
                onClick={() => openModule('session')}
                className="w-full btn-primary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Heute lernen →</span>
              </button>
            </div>

            {/* Modul: Fortschritt (Progress Dashboard, Mehrsprachige Engine) */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 transition-all duration-300 flex flex-col ring-2 ring-emerald-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl mb-3 shadow-lg relative z-10">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 13.5l4-4 4 4 6-6M3 21h18" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Fortschritt
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10 flex-grow">
                Skills, Fehlerprofil, Can-do-Report und Export
              </p>
              <button
                onClick={() => openModule('progress')}
                className="w-full btn-primary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Dashboard ansehen →</span>
              </button>
            </div>

            {/* Modul 0: SRS-Review (Mehrsprachige Engine) */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:rotate-1 transition-all duration-300 flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:-rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Vokabel-Trainer
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10 flex-grow">
                Spaced Repetition (FSRS) für deine Sprache
              </p>
              <button
                onClick={() => openModule('review')}
                className="w-full btn-primary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Lernen →</span>
              </button>
            </div>

            {/* Modul 0b: Reader (Mehrsprachige Engine) */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:-rotate-1 transition-all duration-300 flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Lesetexte
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10 flex-grow">
                Comprehensible Input mit Wortschatz-Mining
              </p>
              <button
                onClick={() => openModule('reader')}
                className="w-full btn-secondary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Lesen →</span>
              </button>
            </div>

            {/* Modul 0c: Grammatik (Mehrsprachige Engine) */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:rotate-1 transition-all duration-300 flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:-rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Grammatik
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10 flex-grow">
                Fokus-Übungen mit Fehlerprofil
              </p>
              <button
                onClick={() => openModule('grammar')}
                className="w-full btn-secondary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Üben →</span>
              </button>
            </div>

            {/* Modul 0d: Schreiben (Mehrsprachige Engine) */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:-rotate-1 transition-all duration-300 flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Schreiben
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10 flex-grow">
                Übersetzen mit KI-Feedback
              </p>
              <button
                onClick={() => openModule('writing')}
                className="w-full btn-secondary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Schreiben →</span>
              </button>
            </div>

            {/* Modul 0e: Sprechen (Mehrsprachige Engine) */}
            <div className="glass-card rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:scale-105 hover:-rotate-1 transition-all duration-300 flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl mb-3 shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2 relative z-10">
                Sprechen
              </h2>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10 flex-grow">
                Dialog &amp; Shadowing
              </p>
              <button
                onClick={() => openModule('speaking')}
                className="w-full btn-secondary relative z-10 text-sm py-2"
              >
                <span className="relative z-10">Sprechen →</span>
              </button>
            </div>
          </div>

          </div>
        ) : (
          <div className="animate-fade-in">
            <button
              onClick={() => {
                if (sessionFocus) backToSession();
                else { setSessionFocus(null); setActiveModule(null); }
              }}
              className="mb-4 flex items-center text-indigo-600 hover:text-indigo-800 font-semibold text-base hover:-translate-x-2 transition-transform duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Zurück
            </button>
            
            {activeModule === 'review' && <ReviewModule />}
            {activeModule === 'reader' && (
              <ReaderModule focus={sessionFocus} onBackToSession={backToSession} />
            )}
            {activeModule === 'grammar' && (
              <GrammarModule focus={sessionFocus} onBackToSession={backToSession} />
            )}
            {activeModule === 'writing' && (
              <WritingModule focus={sessionFocus} onBackToSession={backToSession} />
            )}
            {activeModule === 'speaking' && (
              <SpeakingModule focus={sessionFocus} onBackToSession={backToSession} />
            )}
            {activeModule === 'session' && (
              <DailySession
                onOpenModule={(m, payload) => {
                  if (!m) return;
                  setSessionFocus(payload ? { module: m, ...payload } : null);
                  setActiveModule(m);
                }}
              />
            )}
            {activeModule === 'progress' && <ProgressDashboard />}
            {activeModule === 'settings' && <SettingsModule />}
          </div>
        )}
        </>
        )}

        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onLogin={(newUser) => setUser(newUser)}
          />
        )}

        {/* Log Viewer */}
        {showLogViewer && (
          <LogViewer onClose={() => setShowLogViewer(false)} />
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </div>
  );
}

export default App;
