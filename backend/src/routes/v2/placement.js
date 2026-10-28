/**
 * API v2 – Placement (adaptiver Einstufungstest)
 *
 * POST /api/v2/placement/start   Session starten, liefert erstes Item
 * POST /api/v2/placement/answer  Antwort senden, liefert nächstes Item oder Ergebnis
 *
 * Der adaptive Zustand liegt serverseitig; der Client erhält nur Items ohne
 * Lösung und am Ende die CEFR-Zusammenfassung.
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { getUserLanguage } from '../../services/userLanguageService.js';
import { startPlacement, answerPlacement, getPlacementStatus } from '../../services/placementService.js';
import { dismissPlacement } from '../../services/userLanguageService.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/start', (req, res) => {
  const { userLanguageId, skills } = req.body || {};
  const ul = getUserLanguage(Number(userLanguageId), req.user.userId);
  if (!ul) {
    return res.status(404).json({ error: 'Sprache nicht gefunden' });
  }

  try {
    const result = startPlacement(ul.id, ul.targetLang, normalizeSkills(skills));
    res.status(201).json(result);
  } catch (err) {
    console.error('❌ placement start:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v2/placement/status/:userLanguageId
 * Wurde der Einstufungstest für diese Sprache abgeschlossen?
 */
router.get('/status/:userLanguageId', (req, res) => {
  const ul = getUserLanguage(Number(req.params.userLanguageId), req.user.userId);
  if (!ul) {
    return res.status(404).json({ error: 'Sprache nicht gefunden' });
  }
  res.json(getPlacementStatus(ul.id));
});

/**
 * POST /api/v2/placement/dismiss
 * Body: { userLanguageId } – Einstufungstest bewusst überspringen.
 * Das "nicht abgeschlossen"-Banner wird danach nicht mehr angezeigt.
 */
router.post('/dismiss', (req, res) => {
  const { userLanguageId } = req.body || {};
  const ul = getUserLanguage(Number(userLanguageId), req.user.userId);
  if (!ul) {
    return res.status(404).json({ error: 'Sprache nicht gefunden' });
  }
  const ok = dismissPlacement(ul.id, req.user.userId);
  if (!ok) return res.status(404).json({ error: 'Sprache nicht gefunden' });
  res.json({ ok: true });
});

router.post('/answer', (req, res) => {
  const { sessionId, userLanguageId, itemId, response } = req.body || {};
  const ul = getUserLanguage(Number(userLanguageId), req.user.userId);
  if (!ul) {
    return res.status(404).json({ error: 'Sprache nicht gefunden' });
  }

  try {
    const result = answerPlacement(Number(sessionId), ul.id, itemId, response);
    res.json(result);
  } catch (err) {
    console.error('❌ placement answer:', err);
    res.status(500).json({ error: err.message });
  }
});

function normalizeSkills(skills) {
  const allowed = ['reading', 'listening', 'grammar', 'vocabulary', 'writing', 'speaking'];
  if (!Array.isArray(skills) || skills.length === 0) {
    return ['reading', 'listening', 'grammar', 'vocabulary'];
  }
  const filtered = skills.filter((s) => allowed.includes(s));
  return filtered.length > 0 ? filtered : ['reading', 'listening', 'grammar', 'vocabulary'];
}

export default router;
