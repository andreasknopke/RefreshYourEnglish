// Log Service für Debugging und Monitoring
// Erfasst LLM-Aufrufe, API-Requests und wichtige Events

const MAX_LOGS = 500; // Maximale Anzahl gespeicherter Logs
const LOG_STORAGE_KEY = 'app_debug_logs';

/**
 * Log-Level Definitionen
 */
export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  LLM: 'LLM'
};

/**
 * Log-Eintrag Struktur
 */
class LogEntry {
  constructor(level, category, message, data = {}) {
    this.timestamp = new Date().toISOString();
    this.level = level;
    this.category = category;
    this.message = message;
    this.data = data;
    this.userAgent = navigator.userAgent;
    this.screenSize = `${window.innerWidth}x${window.innerHeight}`;
  }
}

/**
 * Log Service Klasse
 */
class LogService {
  constructor() {
    this.logs = this.loadLogs();
    this.listeners = [];
    this.enableConsoleLogging = true;
  }

  /**
   * Lädt gespeicherte Logs aus localStorage
   */
  loadLogs() {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
    return [];
  }

  /**
   * Speichert Logs in localStorage
   */
  saveLogs() {
    try {
      // Behalte nur die neuesten MAX_LOGS Einträge
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  /**
   * Fügt einen neuen Log-Eintrag hinzu
   */
  log(level, category, message, data = {}) {
    const entry = new LogEntry(level, category, message, data);
    this.logs.push(entry);
    this.saveLogs();
    
    // Console-Logging
    if (this.enableConsoleLogging) {
      const emoji = this.getEmojiForLevel(level);
      const consoleMethod = this.getConsoleMethod(level);
      console[consoleMethod](`${emoji} [${category}] ${message}`, data);
    }
    
    // Benachrichtige Listeners
    this.notifyListeners(entry);
    
    return entry;
  }

  /**
   * Helper: Emoji für Log-Level
   */
  getEmojiForLevel(level) {
    const emojis = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
      LLM: '🤖'
    };
    return emojis[level] || '📝';
  }

  /**
   * Helper: Console-Methode für Log-Level
   */
  getConsoleMethod(level) {
    switch (level) {
      case LogLevel.ERROR: return 'error';
      case LogLevel.WARN: return 'warn';
      case LogLevel.DEBUG: return 'debug';
      default: return 'log';
    }
  }

  /**
   * Debug Log
   */
  debug(category, message, data) {
    return this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * Info Log
   */
  info(category, message, data) {
    return this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * Warning Log
   */
  warn(category, message, data) {
    return this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * Error Log
   */
  error(category, message, data) {
    return this.log(LogLevel.ERROR, category, message, data);
  }

  /**
   * LLM-spezifischer Log
   */
  llm(message, data) {
    return this.log(LogLevel.LLM, 'LLM', message, data);
  }

  /**
   * Loggt einen LLM-Request
   */
  logLLMRequest(provider, endpoint, requestData) {
    return this.llm('LLM Request gesendet', {
      provider,
      endpoint,
      model: requestData.model,
      messages: requestData.messages,
      temperature: requestData.temperature,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Loggt eine LLM-Response
   */
  logLLMResponse(provider, response, duration) {
    const data = {
      provider,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    if (response.choices && response.choices[0]) {
      data.content = response.choices[0].message?.content;
      data.finishReason = response.choices[0].finish_reason;
    }

    if (response.usage) {
      data.usage = response.usage;
    }

    return this.llm('LLM Response erhalten', data);
  }

  /**
   * Loggt einen LLM-Fehler
   */
  logLLMError(provider, error, requestData) {
    return this.error('LLM', `LLM Request fehlgeschlagen (${provider})`, {
      provider,
      error: error.message || error.toString(),
      stack: error.stack,
      requestData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Gibt alle Logs zurück
   */
  getAllLogs() {
    return [...this.logs];
  }

  /**
   * Filtert Logs nach Level
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Filtert Logs nach Kategorie
   */
  getLogsByCategory(category) {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Filtert Logs nach Zeitraum
   */
  getLogsByTimeRange(startTime, endTime) {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }

  /**
   * Löscht alle Logs
   */
  clearLogs() {
    this.logs = [];
    this.saveLogs();
    this.notifyListeners(null, 'clear');
  }

  /**
   * Exportiert Logs als JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Exportiert Logs als Text
   */
  exportLogsAsText() {
    return this.logs.map(log => {
      return `[${log.timestamp}] [${log.level}] [${log.category}] ${log.message}\n${JSON.stringify(log.data, null, 2)}\n`;
    }).join('\n---\n\n');
  }

  /**
   * Registriert einen Listener für Log-Updates
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Benachrichtigt alle Listeners
   */
  notifyListeners(entry, event = 'new') {
    this.listeners.forEach(callback => {
      try {
        callback({ entry, event, logs: this.logs });
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }

  /**
   * Sammelt System-Informationen
   */
  getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: performance.memory ? {
        used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(performance.memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      } : 'N/A'
    };
  }
}

// Singleton Instance
const logService = new LogService();

// Initialer System-Info Log
logService.info('SYSTEM', 'Log Service initialisiert', logService.getSystemInfo());

// Export
export default logService;
