import express from 'express';
import db from '../models/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user progress (optional auth - returns empty for anonymous)
router.get('/', optionalAuth, (req, res) => {
  try {
    if (!req.user) {
      return res.json({ progress: [], stats: { total_practiced: 0, total_correct: 0, total_incorrect: 0, avg_mastery: 0 } });
    }

    const progress = db.prepare(`
      SELECT 
        up.*,
        v.english,
        v.german,
        v.level
      FROM user_progress up
      JOIN vocabulary v ON up.vocabulary_id = v.id
      WHERE up.user_id = ?
      ORDER BY up.last_practiced DESC
    `).all(req.user.userId);

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_practiced,
        SUM(correct_count) as total_correct,
        SUM(incorrect_count) as total_incorrect,
        AVG(mastery_level) as avg_mastery
      FROM user_progress
      WHERE user_id = ?
    `).get(req.user.userId);

    res.json({ progress, stats });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update progress for a vocabulary item (optional auth - ignores if anonymous)
router.post('/:vocabularyId', optionalAuth, (req, res) => {
  const { wasCorrect, responseTimeMs } = req.body;
  const { vocabularyId } = req.params;
  
  // If not authenticated, just return success without saving
  if (!req.user) {
    return res.json({ message: 'Progress not saved (anonymous mode)', vocabularyId, wasCorrect });
  }

  const userId = req.user.userId;

  try {
    console.log('Update progress - userId:', userId, 'vocabularyId:', vocabularyId, 'wasCorrect:', wasCorrect);
    
    // Verify user exists
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!userExists) {
      console.error('User not found in database - userId:', userId);
      return res.status(401).json({ 
        error: 'User not found', 
        message: 'Your session is invalid. Please log in again.',
        requiresReauth: true 
      });
    }
    
    // Verify vocabulary exists
    const vocabExists = db.prepare('SELECT id FROM vocabulary WHERE id = ?').get(parseInt(vocabularyId));
    if (!vocabExists) {
      console.error('Vocabulary not found - vocabularyId:', vocabularyId);
      return res.status(404).json({ error: 'Vocabulary not found' });
    }
    
    // Get or create progress entry
    let progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND vocabulary_id = ?').get(userId, parseInt(vocabularyId));

    if (!progress) {
      console.log('Creating new progress entry for userId:', userId, 'vocabularyId:', vocabularyId);
      db.prepare('INSERT INTO user_progress (user_id, vocabulary_id) VALUES (?, ?)').run(userId, parseInt(vocabularyId));
      progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND vocabulary_id = ?').get(userId, parseInt(vocabularyId));
    }

    // Update counts
    const correctIncrement = wasCorrect ? 1 : 0;
    const incorrectIncrement = wasCorrect ? 0 : 1;

    // Calculate new mastery level (0-100)
    const totalAttempts = progress.correct_count + progress.incorrect_count + 1;
    const newCorrectCount = progress.correct_count + correctIncrement;
    const masteryLevel = Math.min(100, Math.round((newCorrectCount / totalAttempts) * 100));

    db.prepare(`
      UPDATE user_progress 
      SET 
        correct_count = correct_count + ?,
        incorrect_count = incorrect_count + ?,
        mastery_level = ?,
        last_practiced = CURRENT_TIMESTAMP
      WHERE user_id = ? AND vocabulary_id = ?
    `).run(correctIncrement, incorrectIncrement, masteryLevel, userId, parseInt(vocabularyId));

    const updated = db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND vocabulary_id = ?').get(userId, parseInt(vocabularyId));
    res.json(updated);
  } catch (error) {
    console.error('Update progress error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Start training session (optional auth - returns mock session for anonymous)
router.post('/session/start', optionalAuth, (req, res) => {
  const { mode } = req.body;
  
  // If not authenticated, return a mock session
  if (!req.user) {
    return res.json({ 
      id: 'anonymous-' + Date.now(), 
      mode, 
      started_at: new Date().toISOString(),
      anonymous: true 
    });
  }

  const userId = req.user.userId;

  try {
    const result = db.prepare('INSERT INTO training_sessions (user_id, mode) VALUES (?, ?)').run(userId, mode);
    const session = db.prepare('SELECT * FROM training_sessions WHERE id = ?').get(result.lastInsertRowid);
    res.json(session);
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete training session (optional auth - ignores for anonymous)
router.post('/session/:sessionId/complete', optionalAuth, (req, res) => {
  const { sessionId } = req.params;
  const { score, correctAnswers, totalAnswers, durationSeconds, details } = req.body;
  
  // If not authenticated or anonymous session, just return success
  if (!req.user || sessionId.startsWith('anonymous-')) {
    return res.json({ 
      message: 'Session completed (anonymous mode)', 
      score, 
      correctAnswers, 
      totalAnswers 
    });
  }

  const userId = req.user.userId;

  try {
    // Verify session belongs to user
    const session = db.prepare('SELECT * FROM training_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update session
    db.prepare(`
      UPDATE training_sessions 
      SET 
        score = ?,
        correct_answers = ?,
        total_answers = ?,
        duration_seconds = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(score, correctAnswers, totalAnswers, durationSeconds, sessionId);

    // Insert session details
    if (details && Array.isArray(details)) {
      const insertDetail = db.prepare('INSERT INTO session_details (session_id, vocabulary_id, was_correct, response_time_ms) VALUES (?, ?, ?, ?)');
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          insertDetail.run(sessionId, item.vocabularyId, item.wasCorrect ? 1 : 0, item.responseTimeMs);
        }
      });
      insertMany(details);
    }

    const updated = db.prepare('SELECT * FROM training_sessions WHERE id = ?').get(sessionId);
    res.json(updated);
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  try {
    // Stats aus training_sessions (wenn vorhanden)
    const sessionStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT ts.id) as total_sessions,
        COALESCE(SUM(ts.correct_answers), 0) as session_correct,
        COALESCE(SUM(ts.total_answers), 0) as session_questions,
        COALESCE(AVG(ts.score), 0) as avg_score,
        COALESCE(SUM(ts.duration_seconds), 0) as total_time_seconds
      FROM training_sessions ts
      WHERE ts.user_id = ? AND ts.completed_at IS NOT NULL
    `).get(userId);

    // Stats aus user_progress (tatsächliche Vokabel-Nutzung)
    const vocabStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT vocabulary_id) as total_words,
        COALESCE(SUM(times_correct), 0) as total_correct,
        COALESCE(SUM(times_incorrect), 0) as total_incorrect,
        COALESCE(SUM(times_correct + times_incorrect), 0) as total_attempts
      FROM user_progress
      WHERE user_id = ?
    `).get(userId);

    // Stats aus Flashcard Reviews
    const flashcardReviewStats = db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        COALESCE(SUM(CASE WHEN repetitions > 0 THEN 1 ELSE 0 END), 0) as reviewed_cards
      FROM flashcard_deck
      WHERE user_id = ?
    `).get(userId);

    // Stats aus Action Mode Reviews
    const actionReviewStats = db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        COALESCE(SUM(CASE WHEN repetitions > 0 THEN 1 ELSE 0 END), 0) as reviewed_words
      FROM action_mode_reviews
      WHERE user_id = ?
    `).get(userId);

    // Kombiniere die Stats mit sicheren Defaults
    const totalCorrect = (vocabStats?.total_correct || 0) + (sessionStats?.session_correct || 0);
    const totalIncorrect = vocabStats?.total_incorrect || 0;
    const totalQuestions = totalCorrect + totalIncorrect;
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions * 100) : 0;

    // Berechne Gesamt-"Übungen" aus allen Aktivitäten
    const totalExercises = 
      (sessionStats?.total_sessions || 0) + 
      (flashcardReviewStats?.total_reviews || 0) + 
      (actionReviewStats?.total_reviews || 0);

    const overallStats = {
      total_sessions: sessionStats?.total_sessions || 0,
      total_exercises: totalExercises,
      total_words: vocabStats?.total_words || 0,
      total_correct: totalCorrect,
      total_incorrect: totalIncorrect,
      total_questions: totalQuestions,
      avg_score: accuracy,
      total_time_seconds: sessionStats?.total_time_seconds || 0,
      flashcard_reviews: flashcardReviewStats?.total_reviews || 0,
      action_reviews: actionReviewStats?.total_reviews || 0
    };

    const modeStats = db.prepare(`
      SELECT 
        mode,
        COUNT(*) as session_count,
        AVG(score) as avg_score,
        SUM(correct_answers) as total_correct,
        SUM(total_answers) as total_questions
      FROM training_sessions
      WHERE user_id = ? AND completed_at IS NOT NULL
      GROUP BY mode
    `).all(userId);

    const recentSessions = db.prepare(`
      SELECT * FROM training_sessions
      WHERE user_id = ? AND completed_at IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 10
    `).all(userId);

    res.json({
      overall: overallStats,
      byMode: modeStats,
      recent: recentSessions
    });
  } catch (error) {
    console.error('Get stats error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
