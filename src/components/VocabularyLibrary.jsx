import { useState, useEffect } from 'react';
import VocabularyEditor from './VocabularyEditor';
import apiService from '../services/apiService';
import { classifyVocabularyLevels, classifySingleVocabulary } from '../services/llmService';

function VocabularyLibrary({ user }) {
  const [vocabulary, setVocabulary] = useState([]);
  const [filteredVocabulary, setFilteredVocabulary] = useState([]);
  const [selectedVocab, setSelectedVocab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [addedToTrainer, setAddedToTrainer] = useState(new Set());
  const [showNewVocabForm, setShowNewVocabForm] = useState(false);
  const [newVocab, setNewVocab] = useState({ english: '', german: '', level: 'B2' });
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [classifyingAll, setClassifyingAll] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState(null);
  const [classifyingSingle, setClassifyingSingle] = useState(new Set());

  useEffect(() => {
    loadVocabularyData();
  }, []);

  useEffect(() => {
    filterVocabulary();
  }, [searchTerm, selectedLevel, vocabulary]);

  const loadVocabularyData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getVocabulary();
      // API returns { count: X, vocabulary: [...] }
      const vocabArray = data.vocabulary || data;
      setVocabulary(vocabArray);
      setFilteredVocabulary(vocabArray);
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
          vocab.german.toLowerCase().includes(term) ||
          vocab.english.toLowerCase().includes(term)
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

  const checkDuplicate = (english, german) => {
    return vocabulary.some(
      v => v.english.toLowerCase() === english.toLowerCase() || 
           v.german.toLowerCase() === german.toLowerCase()
    );
  };

  const handleCreateVocabulary = async () => {
    if (!user) {
      alert('Bitte melde dich an, um Vokabeln zu erstellen.');
      return;
    }

    if (!newVocab.english.trim() || !newVocab.german.trim()) {
      alert('Bitte fülle alle Felder aus.');
      return;
    }

    // Duplikat-Prüfung
    if (checkDuplicate(newVocab.english.trim(), newVocab.german.trim())) {
      alert('⚠️ Diese Vokabel existiert bereits!');
      return;
    }

    try {
      const created = await apiService.createVocabulary(
        newVocab.english.trim(),
        newVocab.german.trim(),
        newVocab.level
      );
      setVocabulary(prev => [created, ...prev]);
      setNewVocab({ english: '', german: '', level: 'B2' });
      setShowNewVocabForm(false);
      alert('✅ Vokabel erfolgreich erstellt!');
    } catch (err) {
      alert('Fehler beim Erstellen: ' + err.message);
    }
  };

  const handleBulkImport = async () => {
    if (!user) {
      alert('Bitte melde dich an, um Vokabeln zu importieren.');
      return;
    }

    if (!bulkImportText.trim()) {
      alert('Bitte füge Vokabeln im Format "englisch;deutsch" ein (eine pro Zeile).');
      return;
    }

    const lines = bulkImportText.split('\n').filter(line => line.trim());
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const newVocabs = [];

    for (const line of lines) {
      const parts = line.split(';').map(p => p.trim());
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        errors++;
        continue;
      }

      const [english, german] = parts;

      // Duplikat-Prüfung
      if (checkDuplicate(english, german)) {
        skipped++;
        continue;
      }

      try {
        const created = await apiService.createVocabulary(english, german, 'B2');
        newVocabs.push(created);
        imported++;
      } catch (err) {
        errors++;
      }
    }

    // Update vocabulary list
    if (newVocabs.length > 0) {
      setVocabulary(prev => [...newVocabs, ...prev]);
    }

    // Show results
    setImportResults({
      total: lines.length,
      imported,
      skipped,
      errors
    });

    setBulkImportText('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setBulkImportText(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleDeleteVocabulary = async (id) => {
    if (!user) {
      alert('Bitte melde dich an, um Vokabeln zu löschen.');
      return;
    }

    if (!confirm('Möchtest du diese Vokabel wirklich löschen?')) {
      return;
    }

    try {
      await apiService.deleteVocabulary(id);
      setVocabulary(prev => prev.filter(v => v.id !== id));
      alert('✅ Vokabel gelöscht!');
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  // KI-basierte Level-Klassifizierung für alle gefilterten Vokabeln
  const handleClassifyAll = async () => {
    if (!user) {
      alert('Bitte melde dich an, um Vokabeln zu klassifizieren.');
      return;
    }

    const vocabsToClassify = filteredVocabulary;
    if (vocabsToClassify.length === 0) {
      alert('Keine Vokabeln zum Klassifizieren gefunden.');
      return;
    }

    if (!confirm(`🤖 Möchtest du ${vocabsToClassify.length} Vokabel(n) mit KI nach CEFR-Level (A1-C2) einstufen?\n\nDies kann je nach Anzahl einige Sekunden dauern.`)) {
      return;
    }

    setClassifyingAll(true);
    setClassifyProgress({ current: 0, total: vocabsToClassify.length, message: 'Starte Klassifizierung...' });

    try {
      const results = await classifyVocabularyLevels(vocabsToClassify, setClassifyProgress);
      
      // Update jede Vokabel mit dem neuen Level
      let successCount = 0;
      let errorCount = 0;

      for (const result of results) {
        try {
          await apiService.updateVocabulary(result.id, { level: result.level });
          successCount++;
          
          // Update lokalen State
          setVocabulary(prev => prev.map(v => 
            v.id === result.id ? { ...v, level: result.level } : v
          ));
        } catch (err) {
          console.error(`Failed to update vocabulary ${result.id}:`, err);
          errorCount++;
        }
      }

      alert(`✅ Klassifizierung abgeschlossen!\n\n${successCount} Vokabel(n) aktualisiert${errorCount > 0 ? `\n${errorCount} Fehler` : ''}`);
    } catch (error) {
      console.error('Classification failed:', error);
      alert('❌ Fehler bei der Klassifizierung: ' + error.message);
    } finally {
      setClassifyingAll(false);
      setClassifyProgress(null);
    }
  };

  // KI-basierte Level-Klassifizierung für eine einzelne Vokabel
  const handleClassifySingle = async (vocab) => {
    if (!user) {
      alert('Bitte melde dich an, um Vokabeln zu klassifizieren.');
      return;
    }

    setClassifyingSingle(prev => new Set([...prev, vocab.id]));

    try {
      const newLevel = await classifySingleVocabulary(vocab.english, vocab.german);
      
      // Update in der Datenbank
      await apiService.updateVocabulary(vocab.id, { level: newLevel });
      
      // Update lokalen State
      setVocabulary(prev => prev.map(v => 
        v.id === vocab.id ? { ...v, level: newLevel } : v
      ));

      // Kurze Bestätigung
      setTimeout(() => {
        setClassifyingSingle(prev => {
          const newSet = new Set(prev);
          newSet.delete(vocab.id);
          return newSet;
        });
      }, 1500);
    } catch (error) {
      console.error('Single classification failed:', error);
      alert('❌ Fehler bei der Klassifizierung: ' + error.message);
      setClassifyingSingle(prev => {
        const newSet = new Set(prev);
        newSet.delete(vocab.id);
        return newSet;
      });
    }
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
      <div className="glass-card rounded-2xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text mb-2 sm:mb-3 md:mb-4">📚 Vokabelbibliothek</h2>
        <p className="text-gray-600 mb-3 sm:mb-4 md:mb-6 text-sm sm:text-base">
          Durchsuche alle Vokabeln, bearbeite sie oder füge sie deinem Vokabeltrainer hinzu.
        </p>

        {/* Search and Filter Controls */}
        <div className="grid md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Suche nach Deutsch oder Englisch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pl-10 sm:pl-12 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-sm sm:text-base"
              />
              <svg
                className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
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
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-gray-600">
            <span className="font-bold text-indigo-600">{filteredVocabulary.length}</span> von{' '}
            <span className="font-bold">{vocabulary.length}</span> Vokabeln
          </div>
          <div className="flex gap-2 flex-wrap">
            {user && (
              <>
                <button
                  onClick={() => setShowNewVocabForm(true)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  ➕ Neue Vokabel
                </button>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  📂 Bulk-Import
                </button>
              </>
            )}
            {user && filteredVocabulary.length > 0 && (
              <button
                onClick={handleAddAllToTrainer}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                📥 Alle zum Trainer
              </button>
            )}
            {user && filteredVocabulary.length > 0 && (
              <button
                onClick={handleClassifyAll}
                disabled={classifyingAll}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Alle Vokabeln mit KI nach CEFR-Level einstufen"
              >
                {classifyingAll ? '⏳ Klassifiziere...' : '🤖 Level mit KI setzen'}
              </button>
            )}
          </div>
        </div>

        {/* Classification Progress */}
        {classifyProgress && (
          <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-800">{classifyProgress.message}</div>
                <div className="w-full bg-amber-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(classifyProgress.current / classifyProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm font-bold text-amber-700">
                {classifyProgress.current}/{classifyProgress.total}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vocabulary List */}
      <div className="space-y-2 sm:space-y-3">
        {filteredVocabulary.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 sm:p-8 md:p-12 text-center">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">🔍</div>
            <p className="text-lg sm:text-xl text-gray-600">Keine Vokabeln gefunden</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
              Versuche eine andere Suche oder wähle ein anderes Level
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-3">
            {filteredVocabulary.map((vocab) => (
              <div
                key={vocab.id}
                className="glass-card rounded-xl p-2 sm:p-3 md:p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
                  {/* Vocabulary Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] sm:text-xs font-bold">
                        {vocab.level}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500">#{vocab.id}</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-1 sm:gap-2">
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">🇩🇪 Deutsch</div>
                        <div className="font-bold text-gray-800">{vocab.german}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">🇬🇧 Englisch</div>
                        <div className="font-bold text-gray-800">{vocab.english}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {user && (
                      <>
                        <button
                          onClick={() => handleClassifySingle(vocab)}
                          disabled={classifyingSingle.has(vocab.id)}
                          className={`${
                            classifyingSingle.has(vocab.id)
                              ? 'bg-amber-400 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          } font-semibold text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-70`}
                          title="Level mit KI bestimmen"
                        >
                          {classifyingSingle.has(vocab.id) ? '⏳' : '🤖'}
                        </button>
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
                        <button
                          onClick={() => setSelectedVocab(vocab)}
                          className="text-indigo-600 hover:bg-indigo-50 font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteVocabulary(vocab.id)}
                          className="text-red-600 hover:bg-red-50 font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    {!user && (
                      <button
                        onClick={() => setSelectedVocab(vocab)}
                        className="text-indigo-600 hover:bg-indigo-50 font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        ✏️
                      </button>
                    )}
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
                          english: updated.english,
                          german: updated.german,
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

      {/* New Vocabulary Modal */}
      {showNewVocabForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">➕ Neue Vokabel erstellen</h3>
            
            <div className="space-y-4">
              {/* English Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🇬🇧 Englisch
                </label>
                <input
                  type="text"
                  value={newVocab.english}
                  onChange={(e) => setNewVocab(prev => ({ ...prev, english: e.target.value }))}
                  placeholder="z.B. apple"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* German Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🇩🇪 Deutsch
                </label>
                <input
                  type="text"
                  value={newVocab.german}
                  onChange={(e) => setNewVocab(prev => ({ ...prev, german: e.target.value }))}
                  placeholder="z.B. Apfel"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Level Select */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📊 Niveau
                </label>
                <select
                  value={newVocab.level}
                  onChange={(e) => setNewVocab(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateVocabulary}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  ✓ Erstellen
                </button>
                <button
                  onClick={() => {
                    setShowNewVocabForm(false);
                    setNewVocab({ english: '', german: '', level: 'B2' });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  ✕ Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-3xl w-full rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">📂 Bulk-Import</h3>
            
            <div className="space-y-4">
              {/* Format Instructions */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 font-semibold mb-2">📝 Format:</p>
                <p className="text-sm text-gray-600 mb-2">Jede Zeile: <code className="bg-white px-2 py-1 rounded">englisch;deutsch</code></p>
                <p className="text-xs text-gray-500">Beispiel:</p>
                <pre className="text-xs bg-white p-2 rounded mt-1 text-gray-700">
hello;hallo
world;welt
apple;apfel</pre>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📁 Datei hochladen
                </label>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ✍️ Oder direkt einfügen
                </label>
                <textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder="hello;hallo&#10;world;welt&#10;apple;apfel"
                  rows={10}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors font-mono text-sm"
                />
              </div>

              {/* Import Results */}
              {importResults && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">✅ Import abgeschlossen</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>✅ Importiert: <span className="font-bold text-green-600">{importResults.imported}</span></p>
                    <p>⏭️ Übersprungen (Duplikate): <span className="font-bold text-yellow-600">{importResults.skipped}</span></p>
                    <p>❌ Fehler: <span className="font-bold text-red-600">{importResults.errors}</span></p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBulkImport}
                  disabled={!bulkImportText.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  📥 Importieren
                </button>
                <button
                  onClick={() => {
                    setShowBulkImport(false);
                    setBulkImportText('');
                    setImportResults(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  ✕ Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VocabularyLibrary;
