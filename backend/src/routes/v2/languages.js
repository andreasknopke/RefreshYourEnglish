/**
 * API v2 – Languages
 *
 * GET /api/v2/languages  -> alle verfügbaren, validierten Language Packs
 *
 * Sprachneutral: die Engine liefert nur, was die Packs deklarieren.
 */

import express from 'express';
import { listPacks, getPack } from '../../languages/registry.js';

const router = express.Router();

router.get('/', (req, res) => {
  const packs = listPacks();
  res.json({
    count: packs.length,
    languages: packs.map((p) => ({
      code: p.code,
      name: p.name,
      nativeName: p.nativeName,
      version: p.version,
      direction: p.direction,
      levels: p.levels,
      capabilities: p.capabilities,
      ttsLocale: p.ttsLocale,
      sttLocale: p.sttLocale
    }))
  });
});

router.get('/:code', (req, res) => {
  const pack = getPack(req.params.code);
  if (!pack) {
    return res.status(404).json({ error: `Language Pack "${req.params.code}" nicht gefunden` });
  }
  res.json(pack);
});

export default router;
