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
    // Get or create progress entry
    let progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND vocabulary_id = ?').get(userId, vocabularyId);

    if (!progress) {
      db.prepare('INSERT INTO user_progress (user_id, vocabulary_id) VALUES (?, ?)').run(userId, vocabularyId);
      progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND vocabulary_id = ?').get(userId, vocabularyId);
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
    `).run(correctIncrement, incorrectIncrement, masteryLevel, userId, vocabularyId);

    const updated = db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND vocabulary_id = ?').get(userId, vocabularyId);
    res.json(updated);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Server error' });
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
    const overallStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT ts.id) as total_sessions,
        SUM(ts.correct_answers) as total_correct,
        SUM(ts.total_answers) as total_questions,
        AVG(ts.score) as avg_score,
        SUM(ts.duration_seconds) as total_time_seconds
      FROM training_sessions ts
      WHERE ts.user_id = ? AND ts.completed_at IS NOT NULL
    `).get(userId);

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
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
