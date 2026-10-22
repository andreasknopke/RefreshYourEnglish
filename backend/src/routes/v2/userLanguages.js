/**
 * API v2 – User Languages (Onboarding / Profil)
 *
 * POST   /api/v2/me/languages          Zielsprache anlegen (Onboarding)
 * GET    /api/v2/me/languages          alle Sprachen des Nutzers
 * GET    /api/v2/me/languages/:id      eine Sprache inkl. Skills
 * PATCH  /api/v2/me/languages/:id      Profilfelder aktualisieren
 * POST   /api/v2/me/languages/:id/active  aktive Sprache setzen (Umschalter)
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  validateProfile,
  createUserLanguage,
  listUserLanguages,
  getUserLanguage,
  setActiveLanguage,
  updateUserLanguage
} from '../../services/userLanguageService.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', (req, res) => {
  const { targetLang, nativeLang, goalType, targetCefr, startCefr, dailyMinutes, deadline, interests } =
    req.body || {};

  const { valid, errors } = validateProfile({
    targetLang,
    nativeLang,
    goalType,
    targetCefr,
    dailyMinutes,
    interests
  });
  if (!valid) {
    return res.status(400).json({ error: 'Ungültiges Profil', details: errors });
  }

  try {
    const created = createUserLanguage(req.user.userId, {
      targetLang,
      nativeLang,
      goalType,
      targetCefr,
      startCefr,
      dailyMinutes,
      deadline,
      interests
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('❌ create user language:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', (req, res) => {
  res.json({ languages: listUserLanguages(req.user.userId) });
});

router.get('/:id', (req, res) => {
  const ul = getUserLanguage(Number(req.params.id), req.user.userId);
  if (!ul) {
    return res.status(404).json({ error: 'Sprache nicht gefunden' });
  }
  res.json(ul);
});

router.patch('/:id', (req, res) => {
  const updated = updateUserLanguage(req.user.userId, Number(req.params.id), req.body || {});
  if (!updated) {
    return res.status(404).json({ error: 'Sprache nicht gefunden' });
  }
  res.json(updated);
});

router.post('/:id/active', (req, res) => {
  const ok = setActiveLanguage(req.user.userId, Number(req.params.id));
  if (!ok) {
    return res.status(404).json({ error: 'Sprache nicht gefunden' });
  }
  res.json({ ok: true, activeId: Number(req.params.id) });
});

export default router;
