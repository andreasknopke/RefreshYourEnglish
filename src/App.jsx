import { useState } from 'react';
import TranslationModule from './components/TranslationModule';
import ActionModule from './components/ActionModule';

function App() {
  const [activeModule, setActiveModule] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold mb-4 gradient-text">
            Refresh Your English
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 font-medium">
            ✨ LLM-gestütztes Vokabeltraining ✨
          </p>
        </header>

        {!activeModule ? (
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
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
            
            {activeModule === 'translation' && <TranslationModule />}
            {activeModule === 'action' && <ActionModule />}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
