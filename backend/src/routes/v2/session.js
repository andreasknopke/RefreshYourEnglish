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
  confirmCando,
  getSessionProgress,
  curateTodaySession
} from '../../services/sessionComposer.js';
import { getCuratorReport } from '../../services/curatorService.js';

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
 * POST /api/v2/me/languages/:id/session/cando
 * Body: { candoId } – Can-do-Aussage selbst bestätigt
 */
router.post('/:id/session/cando', (req, res) => {
  const { candoId } = req.body || {};
  if (!candoId) return res.status(400).json({ error: 'candoId erforderlich' });
  const result = confirmCando(Number(req.params.id), req.user.userId, { candoId });
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

/**
 * POST /api/v2/me/languages/:id/session/curate
 * KI-Kurator: Erzeugt einen personalisierten Tagesplan.
 * Asynchron (LLM-Aufruf), kann 10-30s dauern.
 */
router.post('/:id/session/curate', async (req, res) => {
  try {
    const result = await curateTodaySession(Number(req.params.id), req.user.userId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error('[curate]', err);
    res.status(500).json({ error: 'Kurator-Fehler' });
  }
});

/**
 * GET /api/v2/me/languages/:id/curator/report
 * Lernzustand + Kurator-Insight (ohne LLM-Aufruf, nur gespeicherte Daten).
 */
router.get('/:id/curator/report', (req, res) => {
  const result = getCuratorReport(Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

export default router;
