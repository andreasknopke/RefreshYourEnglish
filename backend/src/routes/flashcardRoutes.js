import express from 'express';
import {
  addToFlashcardDeck,
  getDueFlashcards,
  getAllFlashcards,
  reviewFlashcard,
  removeFromFlashcardDeck,
  getFlashcardStats
} from '../controllers/flashcardController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET routes mit optionalAuth (geben leere Arrays für anonymous zurück)
router.get('/due', optionalAuth, getDueFlashcards);
router.get('/stats', optionalAuth, getFlashcardStats);
router.get('/', optionalAuth, getAllFlashcards);

// POST/DELETE routes benötigen Authentication
router.post('/', authenticateToken, addToFlashcardDeck);
router.post('/:flashcardId/review', authenticateToken, reviewFlashcard);
router.delete('/:flashcardId', authenticateToken, removeFromFlashcardDeck);

export default router;
