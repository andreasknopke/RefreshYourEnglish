/**
 * API v2 – Vocab & Review (SRS)
 *
 * GET  /api/v2/me/languages/:id/review        Fällige Karten abrufen
 * POST /api/v2/me/languages/:id/review        Review-Antwort senden
 * POST /api/v2/me/languages/:id/cards         Neue Karte hinzufügen (Mining)
 * GET  /api/v2/me/languages/:id/stats         Vokabel-Statistiken
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getReviewQueue,
  submitReview,
  addVocabCard,
  getStats
} from '../../services/reviewService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/v2/me/languages/:id/review?limit=20
 * Liefert die nächste SRS-Queue.
 */
router.get('/:id/review', (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const result = getReviewQueue(Number(req.params.id), req.user.userId, limit);
  if (result.error) {
    return res.status(404).json({ error: result.error });
  }
  res.json(result);
});

/**
 * POST /api/v2/me/languages/:id/review
 * Body: { userVocabId, rating (1-4), elapsedMs? }
 */
router.post('/:id/review', (req, res) => {
  const { userVocabId, rating, elapsedMs } = req.body || {};
  if (!userVocabId || !rating) {
    return res.status(400).json({ error: 'userVocabId und rating erforderlich' });
  }
  const result = submitReview(Number(userVocabId), req.user.userId, Number(rating), elapsedMs ?? null);
  if (result.error) {
    const status = result.error.includes('Berechtigung') || result.error.includes('nicht gefunden') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }
  res.json(result);
});

/**
 * POST /api/v2/me/languages/:id/cards
 * Body: { lemma, translation?, pos?, gender?, ipa?, level?, example?, source?, metadata? }
 * Fügt eine Karte hinzu (Sentence Mining oder manuell).
 */
router.post('/:id/cards', (req, res) => {
  const result = addVocabCard(Number(req.params.id), req.user.userId, req.body || {});
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.status(result.created ? 201 : 200).json(result);
});

/**
 * GET /api/v2/me/languages/:id/stats
 * Aggregierte Vokabel-Statistik.
 */
router.get('/:id/stats', (req, res) => {
  const stats = getStats(Number(req.params.id), req.user.userId);
  if (stats.error) {
    return res.status(404).json({ error: stats.error });
  }
  res.json(stats);
});

export default router;
