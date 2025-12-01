import { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import VocabularyEditor from './VocabularyEditor';

function VocabularyManager({ onClose }) {
  const [vocabularies, setVocabularies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVocab, setSelectedVocab] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVocab, setNewVocab] = useState({ english: '', german: '', level: 'B2' });

  useEffect(() => {
    loadVocabularies();
  }, []);

  const loadVocabularies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getVocabulary();
      const vocabArray = data.vocabulary || data;
      setVocabularies(vocabArray);
    } catch (err) {
      setError(err.message || 'Fehler beim Laden der Vokabeln');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newVocab.english.trim() || !newVocab.german.trim()) {
      alert('Bitte fülle beide Felder aus');
      return;
    }

    try {
      await apiService.createVocabulary(newVocab.english, newVocab.german, newVocab.level);
      setNewVocab({ english: '', german: '', level: 'B2' });
      setShowCreateForm(false);
      loadVocabularies();
    } catch (err) {
      alert('Fehler beim Erstellen: ' + err.message);
    }
  };

  const handleUpdate = (updated) => {
    setVocabularies(vocabularies.map(v => v.id === updated.id ? updated : v));
    setSelectedVocab(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Möchtest du diese Vokabel wirklich löschen?')) return;
    
    try {
      await apiService.deleteVocabulary(id);
      setVocabularies(vocabularies.filter(v => v.id !== id));
      setSelectedVocab(null);
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const filteredVocabularies = vocabularies.filter(v => {
    const matchesSearch = v.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.german.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || v.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold gradient-text mb-2">📝 Vokabelbearbeitung</h2>
          <p className="text-gray-600">Verwalte deine persönliche Vokabeldatenbank</p>
        </div>

        {/* Controls */}
        <div className="glass-card rounded-3xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Suche nach Vokabeln..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-teal-500 focus:outline-none"
              />
            </div>

            {/* Level Filter */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-teal-500 focus:outline-none bg-white"
            >
              <option value="all">Alle Niveaus</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
            </select>

            {/* Create Button */}
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-xl hover:scale-105 transition-all"
            >
              {showCreateForm ? '❌ Abbrechen' : '➕ Neu erstellen'}
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-white rounded-xl p-4 border-2 border-teal-300">
              <h3 className="font-bold text-gray-800 mb-3">Neue Vokabel erstellen</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Englisch"
                  value={newVocab.english}
                  onChange={(e) => setNewVocab({ ...newVocab, english: e.target.value })}
                  className="px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Deutsch"
                  value={newVocab.german}
                  onChange={(e) => setNewVocab({ ...newVocab, german: e.target.value })}
                  className="px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:outline-none"
                />
                <select
                  value={newVocab.level}
                  onChange={(e) => setNewVocab({ ...newVocab, level: e.target.value })}
                  className="px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:outline-none bg-white"
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>
              <button
                onClick={handleCreate}
                className="mt-3 w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors"
              >
                ✅ Erstellen
              </button>
            </div>
          )}
        </div>

        {/* Vocabulary List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-600">Lade Vokabeln...</p>
          </div>
        ) : error ? (
          <div className="glass-card rounded-3xl p-8 text-center">
            <p className="text-red-600 font-bold">⚠️ {error}</p>
            <button
              onClick={loadVocabularies}
              className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-6">
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {filteredVocabularies.length} von {vocabularies.length} Vokabeln
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredVocabularies.map(vocab => (
                <div
                  key={vocab.id}
                  className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-teal-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded">
                      {vocab.level}
                    </span>
                    <button
                      onClick={() => setSelectedVocab(vocab)}
                      className="text-teal-600 hover:text-teal-800 font-bold"
                    >
                      ✏️
                    </button>
                  </div>
                  <p className="font-bold text-gray-800 mb-1">{vocab.english}</p>
                  <p className="text-sm text-gray-600">{vocab.german}</p>
                </div>
              ))}
            </div>

            {filteredVocabularies.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Keine Vokabeln gefunden
              </div>
            )}
          </div>
        )}

        {/* Editor Modal */}
        {selectedVocab && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full">
              <VocabularyEditor
                vocabulary={{
                  id: selectedVocab.id,
                  en: selectedVocab.english,
                  de: selectedVocab.german,
                  level: selectedVocab.level
                }}
                onUpdate={(updated) => handleUpdate({
                  id: updated.id,
                  english: updated.english,
                  german: updated.german,
                  level: updated.level
                })}
                onDelete={() => handleDelete(selectedVocab.id)}
                onClose={() => setSelectedVocab(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VocabularyManager;
