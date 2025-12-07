import db from '../models/database.js';

/**
 * Spaced Repetition Algorithm (SuperMemo SM-2)
 * Berechnet das nächste Review-Datum basierend auf der Performance
 */
const calculateNextReview = (quality, easeFactor, intervalDays, repetitions) => {
  // quality: 0 = forgot, 1 = remembered
  let newEaseFactor = easeFactor;
  let newInterval = intervalDays;
  let newRepetitions = repetitions;

  if (quality === 0) {
    // Forgot - reset
    newRepetitions = 0;
    newInterval = 1; // Wiederhole morgen
  } else {
    // Remembered
    newRepetitions += 1;
    
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(intervalDays * easeFactor);
    }
    
    // Adjust ease factor (only increase on success)
    newEaseFactor = Math.max(1.3, easeFactor + 0.1);
  }

  return {
    easeFactor: newEaseFactor,
    intervalDays: newInterval,
    repetitions: newRepetitions
  };
};

/**
 * Fügt ein Wort zum Action Mode Review-System hinzu (wenn "Forgot" geklickt wurde)
 */
export const addToActionReviews = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { vocabularyId } = req.body;
    const userId = req.user.userId;

    console.log('Add to action reviews - userId:', userId, 'vocabularyId:', vocabularyId);

    // Prüfe ob Vokabel existiert
    const vocab = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(parseInt(vocabularyId));
    if (!vocab) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }

    // Prüfe ob bereits im Review-System
    const existing = db.prepare(
      'SELECT * FROM action_mode_reviews WHERE user_id = ? AND vocabulary_id = ?'
    ).get(userId, parseInt(vocabularyId));

    const today = new Date().toISOString().split('T')[0];

    if (existing) {
      // Update: Erhöhe "times_forgotten" und setze zurück auf morgen
      const stmt = db.prepare(`
        UPDATE action_mode_reviews 
        SET 
          times_forgotten = times_forgotten + 1,
          interval_days = 1,
          repetitions = 0,
          next_review_date = date('now', '+1 day'),
          last_reviewed_date = ?
        WHERE user_id = ? AND vocabulary_id = ?
      `);
      
      stmt.run(today, userId, parseInt(vocabularyId));
      
      return res.json({
        message: 'Added to action reviews (updated)',
        vocabulary: vocab
      });
    }

    // Neu hinzufügen
    const stmt = db.prepare(`
      INSERT INTO action_mode_reviews 
      (user_id, vocabulary_id, ease_factor, interval_days, repetitions, next_review_date, last_reviewed_date, times_forgotten)
      VALUES (?, ?, 2.5, 1, 0, date('now', '+1 day'), ?, 1)
    `);

    const result = stmt.run(userId, parseInt(vocabularyId), today);

    res.json({
      message: 'Added to action reviews',
      reviewId: result.lastInsertRowid,
      vocabulary: vocab
    });
  } catch (error) {
    console.error('Error adding to action reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Markiert ein Wort als "remembered" im Action Mode
 */
export const markAsRemembered = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { vocabularyId } = req.body;
    const userId = req.user.userId;

    console.log('Mark as remembered - userId:', userId, 'vocabularyId:', vocabularyId);

    // Prüfe ob im Review-System
    const existing = db.prepare(
      'SELECT * FROM action_mode_reviews WHERE user_id = ? AND vocabulary_id = ?'
    ).get(userId, parseInt(vocabularyId));

    if (!existing) {
      // Nicht im System - nichts zu tun
      return res.json({ message: 'Not in review system' });
    }

    // Berechne nächstes Review mit SM-2 Algorithmus
    const { easeFactor, intervalDays, repetitions } = calculateNextReview(
      1, // remembered
      existing.ease_factor,
      existing.interval_days,
      existing.repetitions
    );

    const today = new Date().toISOString().split('T')[0];

    // Update
    const stmt = db.prepare(`
      UPDATE action_mode_reviews 
      SET 
        ease_factor = ?,
        interval_days = ?,
        repetitions = ?,
        next_review_date = date('now', '+' || ? || ' days'),
        last_reviewed_date = ?
      WHERE user_id = ? AND vocabulary_id = ?
    `);

    stmt.run(easeFactor, intervalDays, repetitions, intervalDays, today, userId, parseInt(vocabularyId));

    // Wenn das Wort gut gelernt ist (5+ Wiederholungen), entferne es aus dem System
    if (repetitions >= 5) {
      db.prepare('DELETE FROM action_mode_reviews WHERE user_id = ? AND vocabulary_id = ?')
        .run(userId, parseInt(vocabularyId));
      
      return res.json({ message: 'Word mastered and removed from reviews' });
    }

    res.json({ message: 'Marked as remembered', nextReview: intervalDays });
  } catch (error) {
    console.error('Error marking as remembered:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Holt fällige Wörter für den Action Mode
 */
export const getDueActionReviews = (req, res) => {
  try {
    if (!req.user) {
      return res.json({ dueWords: [] });
    }

    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    const dueWords = db.prepare(`
      SELECT 
        ar.*,
        v.english,
        v.german,
        v.level
      FROM action_mode_reviews ar
      JOIN vocabulary v ON ar.vocabulary_id = v.id
      WHERE ar.user_id = ? AND ar.next_review_date <= ?
      ORDER BY ar.next_review_date ASC, ar.times_forgotten DESC
    `).all(userId, today);

    res.json({ 
      dueWords,
      count: dueWords.length 
    });
  } catch (error) {
    console.error('Error getting due action reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Holt Statistiken für Action Mode Reviews
 */
export const getActionReviewStats = (req, res) => {
  try {
    if (!req.user) {
      return res.json({ total: 0, due: 0 });
    }

    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN next_review_date <= ? THEN 1 ELSE 0 END) as due
      FROM action_mode_reviews
      WHERE user_id = ?
    `).get(today, userId);

    res.json(stats);
  } catch (error) {
    console.error('Error getting action review stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
