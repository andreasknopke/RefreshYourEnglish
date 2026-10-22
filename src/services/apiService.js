import logService from './logService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    // Don't store token in instance, always read from localStorage
    // This ensures we always have the latest token
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getToken() {
    return localStorage.getItem('authToken');
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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

    const requestStartTime = performance.now();
    console.log('API Request:', url, config);
    console.log('🌐 Full API URL:', url);
    console.log('🔧 API_URL from env:', import.meta.env.VITE_API_URL);
    console.log('🔧 Using API_URL:', API_URL);
    
    // Log API Request
    logService.info('API', `API Request: ${options.method || 'GET'} ${endpoint}`, {
      url,
      fullUrl: url,
      apiUrlEnv: import.meta.env.VITE_API_URL,
      apiUrlUsed: API_URL,
      method: options.method || 'GET',
      hasAuth: !!this.getToken(),
      body: options.body ? JSON.parse(options.body) : undefined,
      online: navigator.onLine,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink
      } : 'unknown'
    });

    try {
      const response = await fetch(url, config);
      const requestDuration = Math.round(performance.now() - requestStartTime);
      
      // Prüfe ob Response OK ist
      if (!response.ok) {
        // Versuche JSON zu parsen, falls verfügbar
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check if user needs to re-authenticate (401 or 403)
        if (errorData.requiresReauth || response.status === 401 || response.status === 403) {
          console.warn('Session invalid or expired, logging out user');
          logService.warn('API', 'Session ungültig - Re-Authentication erforderlich', {
            status: response.status,
            endpoint
          });
          this.setToken(null);
          window.dispatchEvent(new CustomEvent('auth-required', { detail: errorData }));
        }
        
        logService.error('API', `API Error: ${response.status}`, {
          endpoint,
          status: response.status,
          error: errorData,
          duration: `${requestDuration}ms`
        });
        
        throw new Error(errorData.error || errorData.message || 'Request failed');
      }

      // Prüfe ob Response JSON ist
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        logService.error('API', 'Nicht-JSON Response erhalten', {
          endpoint,
          contentType,
          preview: text.substring(0, 200)
        });
        throw new Error('Server returned non-JSON response. Check API_URL configuration.');
      }

      const data = await response.json();
      console.log('API Response:', response.status, data);
      
      // Log successful response
      logService.info('API', `API Response: ${response.status}`, {
        endpoint,
        status: response.status,
        duration: `${requestDuration}ms`,
        dataKeys: Object.keys(data)
      });

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Bessere Fehlermeldungen für Network-Errors
      let userFriendlyMessage = error.message;
      if (error.message === 'Failed to fetch') {
        userFriendlyMessage = 'Backend nicht erreichbar. Das Backend könnte gerade neu starten (Railway cold start). Bitte warte 30 Sekunden und versuche es erneut.';
        console.warn('⚠️ Network Error - Backend möglicherweise down oder Railway cold start');
      }
      
      // Log error if not already logged
      if (!error.logged) {
        logService.error('API', 'API Request fehlgeschlagen', {
          endpoint,
          error: userFriendlyMessage,
          originalError: error.message,
          stack: error.stack,
          isNetworkError: error.message === 'Failed to fetch'
        });
      }
      
      // Create new error with friendly message
      const friendlyError = new Error(userFriendlyMessage);
      friendlyError.originalError = error;
      friendlyError.logged = true;
      throw friendlyError;
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

  // LLM-Info (Backend-Konfiguration für Einstellungen/Diagnose)
  async getLLMProvider() {
    return this.request('/v2/llm/provider');
  }
}

const apiService = new ApiService();

export default apiService;
