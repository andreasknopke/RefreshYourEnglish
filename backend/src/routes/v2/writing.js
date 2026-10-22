/**
 * API v2 – Schreiben / Übersetzen
 *
 * GET  /api/v2/me/languages/:id/writing/task       Aufgabe erzeugen (?topic=)
 * POST /api/v2/me/languages/:id/writing/evaluate   Produktion bewerten
 * GET  /api/v2/me/languages/:id/writing/stats      Fehlerprofil + Skill
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getWritingTask,
  evaluateWriting,
  getWritingStats
} from '../../services/writingService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/v2/me/languages/:id/writing/task?topic=reisen
 */
router.get('/:id/writing/task', async (req, res, next) => {
  try {
    const result = await getWritingTask(Number(req.params.id), req.user.userId, {
      topic: req.query.topic || undefined
    });
    if (result.error) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v2/me/languages/:id/writing/evaluate
 * Body: { prompt?, answer, topic? }
 */
router.post('/:id/writing/evaluate', async (req, res, next) => {
  try {
    const { prompt, answer, topic } = req.body || {};
    if (!answer) return res.status(400).json({ error: 'answer erforderlich' });
    const result = await evaluateWriting(Number(req.params.id), req.user.userId, {
      prompt,
      answer,
      topic
    });
    if (result.error) {
      const status = result.error.includes('nicht gefunden') ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v2/me/languages/:id/writing/stats
 */
router.get('/:id/writing/stats', (req, res) => {
  const result = getWritingStats(Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

export default router;
