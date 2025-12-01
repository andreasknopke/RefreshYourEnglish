const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    console.log('API Request:', url, config);

    try {
      const response = await fetch(url, config);
      
      // Prüfe ob Response OK ist
      if (!response.ok) {
        // Versuche JSON zu parsen, falls verfügbar
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check if user needs to re-authenticate
        if (errorData.requiresReauth || response.status === 401) {
          console.warn('Session invalid, logging out user');
          this.logout();
          window.dispatchEvent(new CustomEvent('auth-required', { detail: errorData }));
        }
        
        throw new Error(errorData.error || errorData.message || 'Request failed');
      }

      // Prüfe ob Response JSON ist
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response. Check API_URL configuration.');
      }

      const data = await response.json();
      console.log('API Response:', response.status, data);

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(username, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('user');
  }

  async verifyEmail(token) {
    return this.request(`/auth/verify-email/${token}`);
  }

  async resendVerification(email) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, password) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  isAuthenticated() {
    return !!this.token;
  }

  // Vocabulary endpoints
  async getVocabulary() {
    return this.request('/vocabulary');
  }

  async getVocabularyById(id) {
    return this.request(`/vocabulary/${id}`);
  }

  async createVocabulary(english, german, level = 'B2') {
    return this.request('/vocabulary', {
      method: 'POST',
      body: JSON.stringify({ english, german, level }),
    });
  }

  async updateVocabulary(id, updates) {
    return this.request(`/vocabulary/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteVocabulary(id) {
    return this.request(`/vocabulary/${id}`, {
      method: 'DELETE',
    });
  }

  // Progress endpoints
  async getProgress() {
    return this.request('/progress');
  }

  async updateProgress(vocabularyId, wasCorrect, responseTimeMs = null) {
    return this.request(`/progress/${vocabularyId}`, {
      method: 'POST',
      body: JSON.stringify({ wasCorrect, responseTimeMs }),
    });
  }

  async startSession(mode) {
    return this.request('/progress/session/start', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async completeSession(sessionId, score, correctAnswers, totalAnswers, durationSeconds, details = []) {
    return this.request(`/progress/session/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        score,
        correctAnswers,
        totalAnswers,
        durationSeconds,
        details,
      }),
    });
  }

  async getStats() {
    return this.request('/progress/stats');
  }

  // Flashcard endpoints
  async addToFlashcardDeck(vocabularyId) {
    return this.request('/flashcards', {
      method: 'POST',
      body: JSON.stringify({ vocabularyId }),
    });
  }

  async getDueFlashcards() {
    return this.request('/flashcards/due');
  }

  async getAllFlashcards() {
    return this.request('/flashcards');
  }

  async reviewFlashcard(flashcardId, quality) {
    return this.request(`/flashcards/${flashcardId}/review`, {
      method: 'POST',
      body: JSON.stringify({ quality }),
    });
  }

  async removeFromFlashcardDeck(flashcardId) {
    return this.request(`/flashcards/${flashcardId}`, {
      method: 'DELETE',
    });
  }

  async getFlashcardStats() {
    return this.request('/flashcards/stats');
  }
}

const apiService = new ApiService();

// Named exports for convenience
export const updateVocabulary = (id, updates) => apiService.updateVocabulary(id, updates);
export const deleteVocabulary = (id) => apiService.deleteVocabulary(id);
export const updateProgress = (vocabularyId, wasCorrect, responseTimeMs) => apiService.updateProgress(vocabularyId, wasCorrect, responseTimeMs);
export const startSession = (mode) => apiService.startSession(mode);
export const completeSession = (sessionId, data) => apiService.completeSession(sessionId, data.score, data.correctAnswers, data.totalAnswers, data.durationSeconds, data.details);
export const addToFlashcardDeck = (vocabularyId) => apiService.addToFlashcardDeck(vocabularyId);
export const getDueFlashcards = () => apiService.getDueFlashcards();
export const getAllFlashcards = () => apiService.getAllFlashcards();
export const reviewFlashcard = (flashcardId, quality) => apiService.reviewFlashcard(flashcardId, quality);
export const removeFromFlashcardDeck = (flashcardId) => apiService.removeFromFlashcardDeck(flashcardId);
export const getFlashcardStats = () => apiService.getFlashcardStats();

export default apiService;
