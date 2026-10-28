/**
 * v2 API Client (sprachneutrale Lern-Engine)
 *
 * Nutzt dieselbe Backend-Basis-URL und denselben Token wie apiService, aber
 * einen eigenen, schlanken Request-Wrapper für die /api/v2-Endpunkte.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('authToken');
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });

  if (!response.ok) {
    let msg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      msg = data.error || data.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  return response.json();
}

export const v2Client = {
  // Languages
  listLanguages: () => request('/v2/languages'),
  getLanguage: (code) => request(`/v2/languages/${code}`),

  // User languages (Onboarding / Profil)
  createLanguage: (profile) =>
    request('/v2/me/languages', { method: 'POST', body: JSON.stringify(profile) }),
  listMyLanguages: () => request('/v2/me/languages'),
  getMyLanguage: (id) => request(`/v2/me/languages/${id}`),
  updateMyLanguage: (id, updates) =>
    request(`/v2/me/languages/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  setActiveLanguage: (id) =>
    request(`/v2/me/languages/${id}/active`, { method: 'POST' }),

  // Placement
  startPlacement: (userLanguageId, skills) =>
    request('/v2/placement/start', {
      method: 'POST',
      body: JSON.stringify({ userLanguageId, skills })
    }),
  answerPlacement: (sessionId, userLanguageId, itemId, response) =>
    request('/v2/placement/answer', {
      method: 'POST',
      body: JSON.stringify({ sessionId, userLanguageId, itemId, response })
    }),
  getPlacementStatus: (userLanguageId) =>
    request(`/v2/placement/status/${userLanguageId}`),
  dismissPlacement: (userLanguageId) =>
    request('/v2/placement/dismiss', {
      method: 'POST',
      body: JSON.stringify({ userLanguageId })
    }),

  // Vocab / Review (SRS)
  getReviewQueue: (userLanguageId, limit = 20) =>
    request(`/v2/me/languages/${userLanguageId}/review?limit=${limit}`),
  submitReview: (userLanguageId, userVocabId, rating, elapsedMs) =>
    request(`/v2/me/languages/${userLanguageId}/review`, {
      method: 'POST',
      body: JSON.stringify({ userVocabId, rating, elapsedMs })
    }),
  addCard: (userLanguageId, payload) =>
    request(`/v2/me/languages/${userLanguageId}/cards`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getVocabStats: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/stats`),

  // Reader & Listening
  getTexts: (userLanguageId, level) =>
    request(`/v2/me/languages/${userLanguageId}/texts${level ? `?level=${level}` : ''}`),
  getText: (userLanguageId, textId) =>
    request(`/v2/me/languages/${userLanguageId}/texts/${textId}`),
  mineWord: (userLanguageId, textId, payload) =>
    request(`/v2/me/languages/${userLanguageId}/texts/${textId}/mine`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Grammatik (Fokus)
  getGrammarPoints: (userLanguageId, level) =>
    request(`/v2/me/languages/${userLanguageId}/grammar${level ? `?level=${level}` : ''}`),
  getGrammarPoint: (userLanguageId, pointId) =>
    request(`/v2/me/languages/${userLanguageId}/grammar/${pointId}`),
  answerGrammar: (userLanguageId, payload) =>
    request(`/v2/me/languages/${userLanguageId}/grammar/answer`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getGrammarStats: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/grammar/stats`),

  // Schreiben / Übersetzen
  getWritingTask: (userLanguageId, topic) =>
    request(`/v2/me/languages/${userLanguageId}/writing/task${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`),
  evaluateWriting: (userLanguageId, payload) =>
    request(`/v2/me/languages/${userLanguageId}/writing/evaluate`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getWritingStats: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/writing/stats`),

  // Speaking (Dialog + Shadowing)
  getSpeakingScenarios: (userLanguageId, level) =>
    request(`/v2/me/languages/${userLanguageId}/speaking/scenarios${level ? `?level=${level}` : ''}`),
  getSpeakingScenario: (userLanguageId, scenarioId) =>
    request(`/v2/me/languages/${userLanguageId}/speaking/scenarios/${encodeURIComponent(scenarioId)}`),
  sendSpeakingTurn: (userLanguageId, payload) =>
    request(`/v2/me/languages/${userLanguageId}/speaking/turn`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getShadowing: (userLanguageId, level) =>
    request(`/v2/me/languages/${userLanguageId}/speaking/shadowing${level ? `?level=${level}` : ''}`),
  scoreSpeaking: (userLanguageId, payload) =>
    request(`/v2/me/languages/${userLanguageId}/speaking/score`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getSpeakingStats: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/speaking/stats`),

  // Tages-Sitzung (Session Composer)
  getTodaySession: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/session/today`),
  completeSessionStage: (userLanguageId, stageKey) =>
    request(`/v2/me/languages/${userLanguageId}/session/complete`, {
      method: 'POST',
      body: JSON.stringify({ stageKey })
    }),
  confirmSessionCando: (userLanguageId, candoId) =>
    request(`/v2/me/languages/${userLanguageId}/session/cando`, {
      method: 'POST',
      body: JSON.stringify({ candoId })
    }),
  getSessionProgress: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/session/progress`),

  // KI-Kurator
  curateSession: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/session/curate`, {
      method: 'POST',
      body: JSON.stringify({})
    }),
  getCuratorReport: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/curator/report`),

  // Lesetext-Quiz + Übersetzung
  getTextQuiz: (userLanguageId, textId) =>
    request(`/v2/me/languages/${userLanguageId}/texts/${textId}/quiz`),
  submitTextQuiz: (userLanguageId, textId, answers) =>
    request(`/v2/me/languages/${userLanguageId}/texts/${textId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    }),
  getTextTranslation: (userLanguageId, textId) =>
    request(`/v2/me/languages/${userLanguageId}/texts/${textId}/translation`),
  markTextRead: (userLanguageId, textId) =>
    request(`/v2/me/languages/${userLanguageId}/texts/${textId}/read`, { method: 'POST' }),

  // Progress Dashboard
  getProgress: (userLanguageId) =>
    request(`/v2/me/languages/${userLanguageId}/progress`),
  exportProgress: async (userLanguageId) => {
    const url = `${API_URL}/v2/me/languages/${userLanguageId}/progress/export`;
    const response = await fetch(url, { headers: headers() });
    if (!response.ok) throw new Error(`Export fehlgeschlagen (${response.status})`);
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `progress-${data?.data?.targetLang || 'export'}-${userLanguageId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
    return data;
  }
};

export default v2Client;
