import { useState } from 'react';
import apiService from '../services/apiService';

function VocabularyEditor({ vocabulary, onUpdate, onDelete, onClose, onAddedToTrainer }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedVocab, setEditedVocab] = useState({
    english: vocabulary.en,
    german: vocabulary.de,
    level: vocabulary.level || 'B2'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [addedToTrainer, setAddedToTrainer] = useState(false);

  const handleAddToTrainer = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await apiService.addToFlashcardDeck(vocabulary.id);
      setAddedToTrainer(true);
      if (onAddedToTrainer) onAddedToTrainer(vocabulary.id);
      setTimeout(() => setAddedToTrainer(false), 3000); // Reset nach 3 Sekunden
    } catch (err) {
      if (err.message.includes('already in flashcard deck')) {
        setError('Bereits im Vokabeltrainer!');
      } else {
        setError(err.message || 'Fehler beim Hinzufügen');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editedVocab.english.trim() || !editedVocab.german.trim()) {
      setError('Beide Felder müssen ausgefüllt sein');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updated = await apiService.updateVocabulary(vocabulary.id, editedVocab);
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchtest du diese Vokabel wirklich löschen?')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await apiService.deleteVocabulary(vocabulary.id);
      onDelete(vocabulary.id);
    } catch (err) {
      setError(err.message || 'Fehler beim Löschen');
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className="font-bold text-gray-800">{vocabulary.de}</p>
          <p className="text-sm text-gray-600">{vocabulary.en}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddToTrainer}
            disabled={isSaving || addedToTrainer}
            className={`${
              addedToTrainer 
                ? 'bg-green-500 text-white' 
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            } font-semibold text-sm px-3 py-1 rounded-lg transition-colors disabled:opacity-50`}
            title="Zum Vokabeltrainer hinzufügen"
          >
            {addedToTrainer ? '✅ Hinzugefügt!' : '📚 Zum Trainer'}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            ✏️ Bearbeiten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">🇩🇪 Deutsch</label>
          <input
            type="text"
            value={editedVocab.german}
            onChange={(e) => setEditedVocab({ ...editedVocab, german: e.target.value })}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            disabled={isSaving}
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">🇬🇧 Englisch</label>
          <input
            type="text"
            value={editedVocab.english}
            onChange={(e) => setEditedVocab({ ...editedVocab, english: e.target.value })}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            disabled={isSaving}
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">📊 Level</label>
          <select
            value={editedVocab.level}
            onChange={(e) => setEditedVocab({ ...editedVocab, level: e.target.value })}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            disabled={isSaving}
          >
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '💾 Speichere...' : '💾 Speichern'}
        </button>
        
        <button
          onClick={() => {
            setIsEditing(false);
            setError(null);
            setEditedVocab({
              english: vocabulary.en,
              german: vocabulary.de,
              level: vocabulary.level || 'B2'
            });
          }}
          disabled={isSaving}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ❌ Abbrechen
        </button>
        
        <button
          onClick={handleDelete}
          disabled={isSaving}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Vokabel löschen"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default VocabularyEditor;
