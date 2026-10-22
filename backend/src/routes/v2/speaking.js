/**
 * API v2 – Sprechen (Dialog + Shadowing)
 *
 * GET  /api/v2/me/languages/:id/speaking/scenarios        Szenarien (?level=)
 * GET  /api/v2/me/languages/:id/speaking/scenarios/:sid   Szenario + Verlauf
 * POST /api/v2/me/languages/:id/speaking/turn             Dialogzug senden
 * GET  /api/v2/me/languages/:id/speaking/shadowing        Shadowing-Sätze (?level=)
 * POST /api/v2/me/languages/:id/speaking/score            Shadowing bewerten
 * GET  /api/v2/me/languages/:id/speaking/stats            Fehlerprofil + Skill
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listDialogScenarios,
  getDialogScenario,
  submitDialogTurn,
  listShadowingPhrases,
  scoreShadowing,
  getSpeakingStats
} from '../../services/dialogService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/v2/me/languages/:id/speaking/scenarios?level=A2
 */
router.get('/:id/speaking/scenarios', (req, res) => {
  const result = listDialogScenarios(Number(req.params.id), req.user.userId, {
    level: req.query.level || undefined
  });
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/speaking/shadowing?level=A1
 * (vor /:sid definiert, damit 'shadowing' nicht als Szenario-ID greift)
 */
router.get('/:id/speaking/shadowing', (req, res) => {
  const result = listShadowingPhrases(Number(req.params.id), req.user.userId, {
    level: req.query.level || undefined
  });
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/speaking/scenarios/:sid
 */
router.get('/:id/speaking/scenarios/:sid', (req, res) => {
  const result = getDialogScenario(Number(req.params.id), req.user.userId, req.params.sid);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

/**
 * POST /api/v2/me/languages/:id/speaking/turn
 * Body: { scenarioId, text }
 */
router.post('/:id/speaking/turn', async (req, res, next) => {
  try {
    const { scenarioId, text } = req.body || {};
    if (!scenarioId) return res.status(400).json({ error: 'scenarioId erforderlich' });
    if (!text) return res.status(400).json({ error: 'text erforderlich' });
    const result = await submitDialogTurn(Number(req.params.id), req.user.userId, {
      scenarioId,
      text
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
 * POST /api/v2/me/languages/:id/speaking/score
 * Body: { reference, transcript, durationMs?, scenarioId? }
 */
router.post('/:id/speaking/score', (req, res) => {
  const { reference, transcript, durationMs, scenarioId } = req.body || {};
  if (!reference) return res.status(400).json({ error: 'reference erforderlich' });
  const result = scoreShadowing(Number(req.params.id), req.user.userId, {
    reference,
    transcript,
    durationMs,
    scenarioId
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/speaking/stats
 */
router.get('/:id/speaking/stats', (req, res) => {
  const result = getSpeakingStats(Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

export default router;
