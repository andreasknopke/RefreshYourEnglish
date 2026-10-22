/**
 * API v2 – Tages-Sitzung (Session Composer)
 *
 * GET  /api/v2/me/languages/:id/session/today     heutige Sitzung (komponiert/gecacht)
 * POST /api/v2/me/languages/:id/session/complete  Stufe abschließen { stageKey }
 * GET  /api/v2/me/languages/:id/session/progress  Fortschritt heute
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getTodaySession,
  completeStage,
  getSessionProgress
} from '../../services/sessionComposer.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/v2/me/languages/:id/session/today
 */
router.get('/:id/session/today', (req, res) => {
  const result = getTodaySession(Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

/**
 * POST /api/v2/me/languages/:id/session/complete
 * Body: { stageKey }
 */
router.post('/:id/session/complete', (req, res) => {
  const { stageKey } = req.body || {};
  if (!stageKey) return res.status(400).json({ error: 'stageKey erforderlich' });
  const result = completeStage(Number(req.params.id), req.user.userId, { stageKey });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/session/progress
 */
router.get('/:id/session/progress', (req, res) => {
  const result = getSessionProgress(Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

export default router;
