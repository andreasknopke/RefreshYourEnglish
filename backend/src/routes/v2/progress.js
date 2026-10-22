/**
 * API v2 – Progress Dashboard
 *
 * GET /api/v2/me/languages/:id/progress          Dashboard (Skills, Fehlerprofil, Can-do)
 * GET /api/v2/me/languages/:id/progress/export   Dashboard als JSON-Download
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { getProgress, exportProgress } from '../../services/progressService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/v2/me/languages/:id/progress
 */
router.get('/:id/progress', (req, res) => {
  const result = getProgress(Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/progress/export
 */
router.get('/:id/progress/export', (req, res) => {
  const result = exportProgress(Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="progress-${result.data.targetLang}-${result.data.userLanguageId}.json"`
  );
  res.json(result);
});

export default router;
