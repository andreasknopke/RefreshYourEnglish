import express from 'express';
import { body, validationResult } from 'express-validator';
import db from '../models/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all vocabulary (optional auth for user progress)
router.get('/', optionalAuth, (req, res) => {
  try {
    let vocabulary;
    
    if (req.user) {
      // Include user progress if authenticated
      vocabulary = db.prepare(`
        SELECT 
          v.*,
          up.correct_count,
          up.incorrect_count,
          up.mastery_level,
          up.last_practiced
        FROM vocabulary v
        LEFT JOIN user_progress up ON v.id = up.vocabulary_id AND up.user_id = ?
        ORDER BY v.id
      `).all(req.user.userId);
    } else {
      vocabulary = db.prepare('SELECT * FROM vocabulary ORDER BY id').all();
    }

    res.json({ count: vocabulary.length, vocabulary });
  } catch (error) {
    console.error('Get vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single vocabulary item
router.get('/:id', (req, res) => {
  try {
    const vocab = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(req.params.id);
    if (!vocab) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }
    res.json(vocab);
  } catch (error) {
    console.error('Get vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create vocabulary (authenticated)
router.post('/',
  authenticateToken,
  body('english').trim().notEmpty(),
  body('german').trim().notEmpty(),
  body('level').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { english, german, level } = req.body;

    try {
      // Prüfe auf Duplikate (case-insensitive)
      const existing = db.prepare('SELECT id FROM vocabulary WHERE LOWER(english) = LOWER(?) AND LOWER(german) = LOWER(?)').get(english, german);
      
      if (existing) {
        return res.status(409).json({ error: 'Diese Vokabel existiert bereits (Groß-/Kleinschreibung ignoriert)' });
      }

      const result = db.prepare('INSERT INTO vocabulary (english, german, level) VALUES (?, ?, ?)').run(english, german, level || 'B2');
      
      const newVocab = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(newVocab);
    } catch (error) {
      console.error('Create vocabulary error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update vocabulary (authenticated)
router.put('/:id',
  authenticateToken,
  body('english').optional().trim().notEmpty(),
  body('german').optional().trim().notEmpty(),
  body('level').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { english, german, level } = req.body;
    const updates = [];
    const values = [];

    if (english) {
      updates.push('english = ?');
      values.push(english);
    }
    if (german) {
      updates.push('german = ?');
      values.push(german);
    }
    if (level) {
      updates.push('level = ?');
      values.push(level);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    try {
      const result = db.prepare(`UPDATE vocabulary SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Vocabulary not found' });
      }

      const updated = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error('Update vocabulary error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete vocabulary (authenticated)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM vocabulary WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }

    res.json({ message: 'Vocabulary deleted successfully' });
  } catch (error) {
    console.error('Delete vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
