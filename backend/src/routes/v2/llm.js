/**
 * API v2 – LLM-Info
 *
 * GET /api/v2/llm/provider
 * Liefert die aktive Backend-LLM-Konfiguration (LLM_BASE_URL / LLM_API_KEY /
 * LLM_MODEL), damit das Frontend (Einstellungen/Diagnose) die tatsächlich
 * aktive Konfiguration anzeigt. Portiert aus der ehemaligen v1-Route
 * /api/llm/provider.
 */

import express from 'express';
import { normalizeBaseUrl } from '../../llm/provider.js';

const router = express.Router();

const DEFAULT_MODEL = 'mistral-large-latest';
const PROVIDER = 'openai';

router.get('/provider', (req, res) => {
  const hasApiKey = !!process.env.LLM_API_KEY;
  res.json({
    provider: PROVIDER,
    name: process.env.LLM_MODEL || DEFAULT_MODEL,
    baseUrl: normalizeBaseUrl(process.env.LLM_BASE_URL),
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
    hasApiKey,
    availableProviders: [PROVIDER]
  });
});

export default router;
