/**
 * API v2 – Reader & Listening
 *
 * GET  /api/v2/me/languages/:id/texts          Textliste mit Coverage
 * GET  /api/v2/me/languages/:id/texts/:textId  Text mit Segmenten + Wortstatus
 * POST /api/v2/me/languages/:id/texts/:textId/mine  Wort minen
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listTextsWithCoverage,
  getTextForReading,
  mineWord,
  getQuizForText,
  submitQuizForText,
  getTranslationForText,
  markTextRead
} from '../../services/readerService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/v2/me/languages/:id/texts?level=A1
 */
router.get('/:id/texts', (req, res) => {
  const level = req.query.level || null;
  const result = listTextsWithCoverage(Number(req.params.id), req.user.userId, level);
  if (result.error) {
    return res.status(404).json({ error: result.error });
  }
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/texts/:textId
 */
router.get('/:id/texts/:textId', (req, res) => {
  const result = getTextForReading(Number(req.params.textId), Number(req.params.id), req.user.userId);
  if (result.error) {
    const status = result.error.includes('gefunden') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }
  res.json(result);
});

/**
 * POST /api/v2/me/languages/:id/texts/:textId/mine
 * Body: { lemma, translation?, example? }
 */
router.post('/:id/texts/:textId/mine', (req, res) => {
  const result = mineWord(Number(req.params.id), req.user.userId, {
    ...(req.body || {}),
    example: req.body?.example || null
  });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.status(result.created ? 201 : 200).json(result);
});

/**
 * GET /api/v2/me/languages/:id/texts/:textId/quiz
 * Verständnis-Quiz (LLM-generiert, gecacht; Offline-Fallback: Vokabelfragen)
 */
router.get('/:id/texts/:textId/quiz', async (req, res, next) => {
  try {
    const result = await getQuizForText(
      Number(req.params.textId),
      Number(req.params.id),
      req.user.userId
    );
    if (result.error) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v2/me/languages/:id/texts/:textId/quiz
 * Body: { answers: [<optionstring je Frage>] }
 */
router.post('/:id/texts/:textId/quiz', (req, res) => {
  const result = submitQuizForText(Number(req.params.textId), Number(req.params.id), req.user.userId, {
    answers: req.body?.answers
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

/**
 * GET /api/v2/me/languages/:id/texts/:textId/translation
 * Übersetzung des Textes in die Muttersprache (LLM, gecacht)
 */
router.get('/:id/texts/:textId/translation', async (req, res, next) => {
  try {
    const result = await getTranslationForText(
      Number(req.params.textId),
      Number(req.params.id),
      req.user.userId
    );
    if (result.error) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

/**
 * POST /api/v2/me/languages/:id/texts/:textId/read
 * Markiert den Text als gelesen (Abschluss des Lesens).
 */
router.post('/:id/texts/:textId/read', (req, res) => {
  const result = markTextRead(Number(req.params.textId), Number(req.params.id), req.user.userId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});
