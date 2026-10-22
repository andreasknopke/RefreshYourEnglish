/**
 * API v2 – Grammatik (Fokus)
 *
 * GET  /api/v2/me/languages/:id/grammar              Punkte auflisten
 * GET  /api/v2/me/languages/:id/grammar/:pointId     Punkt mit Übungen
 * POST /api/v2/me/languages/:id/grammar/answer       Antwort auswerten
 * GET  /api/v2/me/languages/:id/grammar/stats        Fehlerprofil + Skill
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listGrammarPoints,
  getGrammarPoint,
  answerExercise,
  getGrammarStats
} from '../../services/grammarService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/v2/me/languages/:id/grammar?level=A1
 */
router.get('/:id/grammar', (req, res) => {
  const level = req.query.level || null;
  const result = listGrammarPoints(Number(req.params.id), req.user.userId, level);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/grammar/stats
 * (vor /:pointId registrieren, damit "stats" nicht als pointId greift)
 */
router.get('/:id/grammar/stats', (req, res) => {
  const result = getGrammarStats(Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/grammar/:pointId
 */
router.get('/:id/grammar/:pointId', (req, res) => {
  const result = getGrammarPoint(Number(req.params.id), req.user.userId, req.params.pointId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

/**
 * POST /api/v2/me/languages/:id/grammar/answer
 * Body: { pointId, exerciseIndex, answer, durationMs? }
 */
router.post('/:id/grammar/answer', (req, res) => {
  const { pointId, exerciseIndex, answer, durationMs } = req.body || {};
  if (pointId == null || exerciseIndex == null || answer == null) {
    return res.status(400).json({ error: 'pointId, exerciseIndex und answer erforderlich' });
  }
  const result = answerExercise(Number(req.params.id), req.user.userId, {
    pointId,
    exerciseIndex,
    answer,
    durationMs
  });
  if (result.error) {
    const status = result.error.includes('nicht gefunden') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }
  res.json(result);
});

export default router;
