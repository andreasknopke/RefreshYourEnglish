import { useState } from 'react';
import TranslationModule from './components/TranslationModule';
import ActionModule from './components/ActionModule';

function App() {
  const [activeModule, setActiveModule] = useState(null);

  console.log('App rendered, activeModule:', activeModule);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-bold gradient-text mb-4">
            Refresh Your English
          </h1>
          <p className="text-xl text-gray-700 font-medium">
            ✨ LLM-gestütztes Vokabeltraining ✨
          </p>
        </header>

        {!activeModule ? (
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Modul 1 */}
            <div className="glass-card rounded-3xl p-8 shadow-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Übersetzungsübung</h2>
              <p className="text-gray-600 mb-8">
                Übersetze deutsche Sätze ins Englische und erhalte KI-basiertes Feedback.
              </p>
              <button
                onClick={() => {
                  console.log('Translation button clicked');
                  setActiveModule('translation');
                }}
                className="w-full btn-primary"
              >
                Jetzt starten →
              </button>
            </div>

            {/* Modul 2 */}
            <div className="glass-card rounded-3xl p-8 shadow-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-6 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Action Modus</h2>
              <p className="text-gray-600 mb-8">
                Trainiere deinen aktiven Wortschatz mit zeitbasierten Vokabelübungen.
              </p>
              <button
                onClick={() => {
                  console.log('Action button clicked');
                  setActiveModule('action');
                }}
                className="w-full btn-secondary"
              >
                Jetzt starten →
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                console.log('Back button clicked');
                setActiveModule(null);
              }}
              className="mb-8 flex items-center text-indigo-600 hover:text-indigo-800 font-semibold text-lg"
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
