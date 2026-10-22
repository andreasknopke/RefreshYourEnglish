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
    })
};

export default v2Client;
