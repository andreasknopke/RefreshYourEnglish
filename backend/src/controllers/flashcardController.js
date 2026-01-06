import db from '../models/database.js';

/**
 * SM-2 Spaced Repetition Algorithm
 * quality: 0-5 (0 = complete blackout, 5 = perfect response)
 */
const calculateNextReview = (quality, easeFactor, interval, repetitions) => {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  // Ease Factor Anpassung
  newEaseFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality < 3) {
    // Falsche Antwort - zurück auf Start
    newRepetitions = 0;
    newInterval = 0;
  } else {
    // Richtige Antwort
    newRepetitions += 1;
    
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
  }

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions
  };
};

// Füge Vokabel zum Flashcard Deck hinzu
export const addToFlashcardDeck = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { vocabularyId } = req.body;
    const userId = req.user.userId;

    console.log('Add to flashcard deck - userId:', userId, 'vocabularyId:', vocabularyId);

    // Prüfe ob Vokabel existiert
    const vocab = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(parseInt(vocabularyId));
    if (!vocab) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }

    // Verwende INSERT OR IGNORE für atomare Duplikatsprüfung
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO flashcard_deck 
      (user_id, vocabulary_id, ease_factor, interval_days, repetitions, next_review_date, added_at)
      VALUES (?, ?, 2.5, 0, 0, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(userId, parseInt(vocabularyId), today);

    // Wenn changes = 0, war die Vokabel bereits im Deck
    if (result.changes === 0) {
      return res.status(400).json({ message: 'Vocabulary already in flashcard deck' });
    }

    res.json({
      message: 'Added to flashcard deck',
      flashcardId: result.lastInsertRowid,
      vocabulary: vocab
    });
  } catch (error) {
    console.error('Error adding to flashcard deck:', error);
    
    // Prüfe auf UNIQUE constraint violation (falls INSERT OR IGNORE nicht funktioniert)
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: 'Vocabulary already in flashcard deck' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Hole fällige Flashcards für heute
export const getDueFlashcards = (req, res) => {
  try {
    // Return empty for anonymous users
    if (!req.user) {
      return res.json({ dueCount: 0, flashcards: [] });
    }

    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    const flashcards = db.prepare(`
      SELECT 
        f.id as flashcard_id,
        f.ease_factor,
        f.interval_days,
        f.repetitions,
        f.next_review_date,
        f.last_reviewed_date,
        v.id as vocabulary_id,
        v.english,
        v.german,
        v.level
      FROM flashcard_deck f
      JOIN vocabulary v ON f.vocabulary_id = v.id
      WHERE f.user_id = ? AND f.next_review_date <= ?
      ORDER BY f.next_review_date ASC
    `).all(userId, today);

    res.json({
      dueCount: flashcards.length,
      flashcards
    });
  } catch (error) {
    console.error('Error getting due flashcards:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
    console.error('Error getting due flashcards:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Review einer Flashcard (mit Spaced Repetition Update)
export const reviewFlashcard = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { flashcardId } = req.params;
    const { quality } = req.body; // 0-5
    const userId = req.user.userId;

    if (quality < 0 || quality > 5) {
      return res.status(400).json({ message: 'Quality must be between 0 and 5' });
    }

    // Hole aktuelle Flashcard
    const flashcard = db.prepare(`
      SELECT * FROM flashcard_deck 
      WHERE id = ? AND user_id = ?
    `).get(flashcardId, userId);

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    // Berechne nächstes Review
    const { easeFactor, interval, repetitions } = calculateNextReview(
      quality,
      flashcard.ease_factor,
      flashcard.interval_days,
      flashcard.repetitions
    );

    const today = new Date();
    const nextReviewDate = new Date(today);
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    // Update Flashcard
    const stmt = db.prepare(`
      UPDATE flashcard_deck 
      SET ease_factor = ?,
          interval_days = ?,
          repetitions = ?,
          next_review_date = ?,
          last_reviewed_date = ?
      WHERE id = ?
    `);

    stmt.run(
      easeFactor,
      interval,
      repetitions,
      nextReviewDate.toISOString().split('T')[0],
      today.toISOString().split('T')[0],
      flashcardId
    );

    res.json({
      message: 'Flashcard reviewed successfully',
      nextReview: {
        date: nextReviewDate.toISOString().split('T')[0],
        intervalDays: interval,
        easeFactor: easeFactor.toFixed(2),
        repetitions
      }
    });
  } catch (error) {
    console.error('Error reviewing flashcard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Alle Flashcards eines Users abrufen (mit Stats)
export const getAllFlashcards = (req, res) => {
  try {
    // Return empty for anonymous users
    if (!req.user) {
      return res.json({ 
        stats: { total: 0, due: 0, learning: 0, mastered: 0 },
        flashcards: [] 
      });
    }

    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    const flashcards = db.prepare(`
      SELECT 
        f.id as flashcard_id,
        f.ease_factor,
        f.interval_days,
        f.repetitions,
        f.next_review_date,
        f.last_reviewed_date,
        f.added_at,
        v.id as vocabulary_id,
        v.english,
        v.german,
        v.level,
        CASE 
          WHEN f.next_review_date <= ? THEN 1 
          ELSE 0 
        END as is_due
      FROM flashcard_deck f
      JOIN vocabulary v ON f.vocabulary_id = v.id
      WHERE f.user_id = ?
      ORDER BY f.next_review_date ASC
    `).all(today, userId);

    const stats = {
      total: flashcards.length,
      due: flashcards.filter(f => f.is_due).length,
      learning: flashcards.filter(f => f.repetitions < 3).length,
      mastered: flashcards.filter(f => f.repetitions >= 3).length
    };

    res.json({
      stats,
      flashcards
    });
  } catch (error) {
    console.error('Error getting flashcards:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Flashcard aus Deck entfernen
export const removeFromFlashcardDeck = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { flashcardId } = req.params;
    const userId = req.user.userId;

    const stmt = db.prepare(`
      DELETE FROM flashcard_deck 
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(flashcardId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    res.json({ message: 'Removed from flashcard deck' });
  } catch (error) {
    console.error('Error removing flashcard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Statistiken für Dashboard
export const getFlashcardStats = (req, res) => {
  try {
    // Anonyme Benutzer erhalten leere Statistiken
    if (!req.user) {
      return res.json({
        total: 0,
        due: 0,
        learning: 0,
        mastered: 0,
        avg_ease_factor: null
      });
    }

    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN next_review_date <= ? THEN 1 ELSE 0 END) as due,
        SUM(CASE WHEN repetitions < 3 THEN 1 ELSE 0 END) as learning,
        SUM(CASE WHEN repetitions >= 3 THEN 1 ELSE 0 END) as mastered,
        AVG(ease_factor) as avg_ease_factor
      FROM flashcard_deck
      WHERE user_id = ?
    `).get(today, userId);

    res.json(stats);
  } catch (error) {
    console.error('Error getting flashcard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Flashcard-Status basierend auf Vokabeltrainer-Nutzung
export const updateFlashcardByVocabulary = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { vocabularyId, usedCorrectly } = req.body;
    const userId = req.user.userId;

    console.log('📚 [Flashcard] Update from vocab trainer:', {
      userId,
      vocabularyId,
      usedCorrectly,
      timestamp: new Date().toISOString()
    });

    // Finde die Flashcard für diese Vokabel
    const flashcard = db.prepare(`
      SELECT * FROM flashcard_deck 
      WHERE user_id = ? AND vocabulary_id = ?
    `).get(userId, vocabularyId);

    if (!flashcard) {
      console.log('📚 [Flashcard] No flashcard found for vocabulary, skipping update');
      return res.json({ 
        message: 'No flashcard found for this vocabulary',
        updated: false 
      });
    }

    // Qualität basierend auf korrekter Nutzung
    // usedCorrectly=true -> quality=5 (gut), usedCorrectly=false -> quality=2 (schwierig)
    const quality = usedCorrectly ? 5 : 2;

    console.log('📚 [Flashcard] Calculating next review:', {
      flashcardId: flashcard.id,
      currentRepetitions: flashcard.repetitions,
      currentInterval: flashcard.interval_days,
      quality
    });

    // Berechne nächstes Review mit SM-2 Algorithm
    const { easeFactor, interval, repetitions } = calculateNextReview(
      quality,
      flashcard.ease_factor,
      flashcard.interval_days,
      flashcard.repetitions
    );

    const today = new Date();
    const nextReviewDate = new Date(today);
    
    // WICHTIG: Bei falscher Antwort (quality < 3) wird interval=0 gesetzt.
    // Damit die Karte trotzdem als "heute bearbeitet" gilt und nicht mehr fällig ist,
    // setzen wir das next_review_date mindestens auf morgen.
    const minimumInterval = (quality < 3) ? 1 : interval;
    nextReviewDate.setDate(nextReviewDate.getDate() + minimumInterval);

    console.log('📚 [Flashcard] Review calculated:', {
      quality,
      usedCorrectly,
      calculatedInterval: interval,
      appliedInterval: minimumInterval,
      nextReviewDate: nextReviewDate.toISOString().split('T')[0]
    });

    // Update Flashcard
    const stmt = db.prepare(`
      UPDATE flashcard_deck 
      SET ease_factor = ?,
          interval_days = ?,
          repetitions = ?,
          next_review_date = ?,
          last_reviewed_date = ?
      WHERE id = ?
    `);

    stmt.run(
      easeFactor,
      minimumInterval,  // Verwende minimumInterval statt interval
      repetitions,
      nextReviewDate.toISOString().split('T')[0],
      today.toISOString().split('T')[0],
      flashcard.id
    );

    console.log('✅ [Flashcard] Updated successfully:', {
      flashcardId: flashcard.id,
      newRepetitions: repetitions,
      newInterval: minimumInterval,  // Zeige den tatsächlich verwendeten Interval
      nextReviewDate: nextReviewDate.toISOString().split('T')[0]
    });

    res.json({
      message: 'Flashcard updated successfully',
      updated: true,
      usedCorrectly,
      nextReview: {
        date: nextReviewDate.toISOString().split('T')[0],
        intervalDays: minimumInterval,  // Verwende minimumInterval
        easeFactor: easeFactor.toFixed(2),
        repetitions
      }
    });
  } catch (error) {
    console.error('❌ [Flashcard] Error updating from vocab trainer:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
