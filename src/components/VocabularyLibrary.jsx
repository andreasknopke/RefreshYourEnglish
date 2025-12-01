import { useState, useEffect } from 'react';
import VocabularyEditor from './VocabularyEditor';
import apiService from '../services/apiService';
import { loadVocabulary } from '../utils/vocabularyLoader';

function VocabularyLibrary({ user }) {
  const [vocabulary, setVocabulary] = useState([]);
  const [filteredVocabulary, setFilteredVocabulary] = useState([]);
  const [selectedVocab, setSelectedVocab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [addedToTrainer, setAddedToTrainer] = useState(new Set());

  useEffect(() => {
    loadVocabularyData();
  }, []);

  useEffect(() => {
    filterVocabulary();
  }, [searchTerm, selectedLevel, vocabulary]);

  const loadVocabularyData = async () => {
    setLoading(true);
    try {
      const data = await loadVocabulary();
      setVocabulary(data);
      setFilteredVocabulary(data);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVocabulary = () => {
    let filtered = [...vocabulary];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        vocab =>
          vocab.de.toLowerCase().includes(term) ||
          vocab.en.toLowerCase().includes(term)
      );
    }

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(vocab => vocab.level === selectedLevel);
    }

    setFilteredVocabulary(filtered);
  };

  const handleAddToTrainer = async (vocabId) => {
    if (!user) {
      alert('Bitte melde dich an, um Vokabeln zum Trainer hinzuzufügen.');
      return;
    }

    try {
      await apiService.addToFlashcardDeck(vocabId);
      setAddedToTrainer(prev => new Set([...prev, vocabId]));
      setTimeout(() => {
        setAddedToTrainer(prev => {
          const newSet = new Set(prev);
          newSet.delete(vocabId);
          return newSet;
        });
      }, 3000);
    } catch (err) {
      if (err.message.includes('already in flashcard deck')) {
        alert('Diese Vokabel ist bereits im Trainer!');
      } else {
        alert('Fehler beim Hinzufügen: ' + err.message);
      }
    }
  };

  const handleAddAllToTrainer = async () => {
    if (!user) {
      alert('Bitte melde dich an, um Vokabeln zum Trainer hinzuzufügen.');
      return;
    }

    if (!confirm(`Möchtest du alle ${filteredVocabulary.length} gefilterten Vokabeln zum Trainer hinzufügen?`)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const vocab of filteredVocabulary) {
      try {
        await apiService.addToFlashcardDeck(vocab.id);
        successCount++;
      } catch (err) {
        if (!err.message.includes('already in flashcard deck')) {
          errorCount++;
        }
      }
    }

    alert(`${successCount} Vokabeln hinzugefügt${errorCount > 0 ? `, ${errorCount} Fehler` : ''}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <h2 className="text-3xl font-bold gradient-text mb-4">📚 Vokabelbibliothek</h2>
        <p className="text-gray-600 mb-6">
          Durchsuche alle Vokabeln, bearbeite sie oder füge sie deinem Vokabeltrainer hinzu.
        </p>

        {/* Search and Filter Controls */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Suche nach Deutsch oder Englisch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
            >
              <option value="all">Alle Level</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
            </select>
          </div>
        </div>

        {/* Stats and Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-bold text-indigo-600">{filteredVocabulary.length}</span> von{' '}
            <span className="font-bold">{vocabulary.length}</span> Vokabeln
          </div>
          {user && filteredVocabulary.length > 0 && (
            <button
              onClick={handleAddAllToTrainer}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              📥 Alle zum Trainer hinzufügen
            </button>
          )}
        </div>
      </div>

      {/* Vocabulary List */}
      <div className="space-y-3">
        {filteredVocabulary.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-600">Keine Vokabeln gefunden</p>
            <p className="text-sm text-gray-500 mt-2">
              Versuche eine andere Suche oder wähle ein anderes Level
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredVocabulary.map((vocab) => (
              <div
                key={vocab.id}
                className="glass-card rounded-xl p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Vocabulary Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                        {vocab.level}
                      </span>
                      <span className="text-xs text-gray-500">#{vocab.id}</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">🇩🇪 Deutsch</div>
                        <div className="font-bold text-gray-800">{vocab.de}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">🇬🇧 Englisch</div>
                        <div className="font-bold text-gray-800">{vocab.en}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {user && (
                      <button
                        onClick={() => handleAddToTrainer(vocab.id)}
                        disabled={addedToTrainer.has(vocab.id)}
                        className={`${
                          addedToTrainer.has(vocab.id)
                            ? 'bg-green-500 text-white'
                            : 'bg-purple-500 hover:bg-purple-600 text-white'
                        } font-semibold text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50`}
                        title="Zum Vokabeltrainer hinzufügen"
                      >
                        {addedToTrainer.has(vocab.id) ? '✅' : '📚'}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedVocab(vocab)}
                      className="text-indigo-600 hover:bg-indigo-50 font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vocabulary Editor Modal */}
      {selectedVocab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Vokabel bearbeiten</h3>
            <VocabularyEditor
              vocabulary={selectedVocab}
              onUpdate={(updated) => {
                // Update vocabulary in list
                setVocabulary((vocab) =>
                  vocab.map((v) =>
                    v.id === updated.id
                      ? {
                          ...v,
                          en: updated.english,
                          de: updated.german,
                          level: updated.level,
                        }
                      : v
                  )
                );
                setSelectedVocab(null);
              }}
              onDelete={(id) => {
                setVocabulary((vocab) => vocab.filter((v) => v.id !== id));
                setSelectedVocab(null);
              }}
              onClose={() => setSelectedVocab(null)}
              onAddedToTrainer={(id) => {
                setAddedToTrainer(prev => new Set([...prev, id]));
                setTimeout(() => {
                  setAddedToTrainer(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                  });
                }, 3000);
              }}
            />
            <button
              onClick={() => setSelectedVocab(null)}
              className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              ✕ Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VocabularyLibrary;
