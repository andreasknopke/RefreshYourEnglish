import express from 'express';
import {
  addToFlashcardDeck,
  getDueFlashcards,
  getAllFlashcards,
  reviewFlashcard,
  removeFromFlashcardDeck,
  getFlashcardStats
} from '../controllers/flashcardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Alle Routes benötigen Authentication
router.use(authenticateToken);

// POST /api/flashcards - Füge Vokabel zum Deck hinzu
router.post('/', addToFlashcardDeck);

// GET /api/flashcards/due - Hole fällige Flashcards für heute
router.get('/due', getDueFlashcards);

// GET /api/flashcards/stats - Hole Statistiken
router.get('/stats', getFlashcardStats);

// GET /api/flashcards - Hole alle Flashcards des Users
router.get('/', getAllFlashcards);

// POST /api/flashcards/:flashcardId/review - Review einer Flashcard
router.post('/:flashcardId/review', reviewFlashcard);

// DELETE /api/flashcards/:flashcardId - Entferne Flashcard
router.delete('/:flashcardId', removeFromFlashcardDeck);

export default router;
