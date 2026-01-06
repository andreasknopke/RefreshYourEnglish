import React, { useState, useEffect, useRef } from 'react';
import logService, { LogLevel } from '../services/logService';

/**
 * LogViewer Component
 * Zeigt Debug-Logs und LLM-Aufrufe in Echtzeit an
 */
export default function LogViewer({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  // Lädt Logs beim Mount
  useEffect(() => {
    setLogs(logService.getAllLogs());

    // Registriere Listener für neue Logs
    const unsubscribe = logService.addListener(({ logs: updatedLogs }) => {
      setLogs([...updatedLogs]);
    });

    return unsubscribe;
  }, []);

  // Auto-Scroll zu neuesten Logs
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  /**
   * Filtert Logs basierend auf Level und Suchbegriff
   */
  const filteredLogs = logs.filter(log => {
    // Filter nach Level
    if (filter !== 'ALL' && log.level !== filter) {
      return false;
    }

    // Filter nach Suchbegriff
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        log.message.toLowerCase().includes(search) ||
        log.category.toLowerCase().includes(search) ||
        JSON.stringify(log.data).toLowerCase().includes(search)
      );
    }

    return true;
  });

  /**
   * Export Logs als JSON
   */
  const handleExportJSON = () => {
    const data = logService.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Export Logs als Text
   */
  const handleExportText = () => {
    const data = logService.exportLogsAsText();
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Löscht alle Logs
   */
  const handleClearLogs = () => {
    if (confirm('Möchten Sie wirklich alle Logs löschen?')) {
      logService.clearLogs();
      setLogs([]);
    }
  };

  /**
   * Kopiert Log-Details in Zwischenablage
   */
  const handleCopyLog = (log) => {
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('Log in Zwischenablage kopiert!');
    });
  };

  /**
   * Gibt die Farbe für ein Log-Level zurück
   */
  const getLevelColor = (level) => {
    switch (level) {
      case LogLevel.DEBUG: return 'text-gray-500';
      case LogLevel.INFO: return 'text-blue-500';
      case LogLevel.WARN: return 'text-yellow-500';
      case LogLevel.ERROR: return 'text-red-500';
      case LogLevel.LLM: return 'text-purple-500';
      default: return 'text-gray-400';
    }
  };

  /**
   * Gibt das Emoji für ein Log-Level zurück
   */
  const getLevelEmoji = (level) => {
    switch (level) {
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.ERROR: return '❌';
      case LogLevel.LLM: return '🤖';
      default: return '📝';
    }
  };

  /**
   * Formatiert Timestamp
   */
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  /**
   * System-Info anzeigen
   */
  const systemInfo = logService.getSystemInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            📊 Debug Log Viewer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-2">
          {/* Filter Buttons */}
          {['ALL', ...Object.values(LogLevel)].map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {level === 'ALL' ? `Alle (${logs.length})` : `${getLevelEmoji(level)} ${level}`}
            </button>
          ))}

          {/* Auto-Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              autoScroll ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {autoScroll ? '📍 Auto-Scroll AN' : '⏸️ Auto-Scroll AUS'}
          </button>

          {/* System Info Toggle */}
          <button
            onClick={() => setShowSystemInfo(!showSystemInfo)}
            className="px-3 py-1 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            🖥️ System Info
          </button>
        </div>

        <div className="flex gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Logs durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />

          {/* Export Buttons */}
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
            title="Als JSON exportieren"
          >
            💾 JSON
          </button>
          <button
            onClick={handleExportText}
            className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
            title="Als Text exportieren"
          >
            📄 TXT
          </button>
          <button
            onClick={handleClearLogs}
            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            title="Alle Logs löschen"
          >
            🗑️ Löschen
          </button>
        </div>
      </div>

      {/* System Info Panel */}
      {showSystemInfo && (
        <div className="bg-gray-800 border-b border-gray-700 p-4 max-h-64 overflow-auto">
          <h3 className="text-lg font-bold text-white mb-2">🖥️ System Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(systemInfo).map(([key, value]) => (
              <div key={key} className="text-gray-300">
                <span className="font-semibold text-gray-400">{key}:</span>{' '}
                <span className="text-white">
                  {typeof value === 'object' ? JSON.stringify(value) : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs Container */}
      <div
        ref={logsContainerRef}
        className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Keine Logs gefunden
            {searchTerm && ` für "${searchTerm}"`}
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <LogEntry
              key={index}
              log={log}
              onCopy={() => handleCopyLog(log)}
              getLevelColor={getLevelColor}
              getLevelEmoji={getLevelEmoji}
              formatTimestamp={formatTimestamp}
            />
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-800 border-t border-gray-700 p-2 text-center text-gray-400 text-sm">
        Zeige {filteredLogs.length} von {logs.length} Logs
        {searchTerm && ` (gefiltert nach "${searchTerm}")`}
      </div>
    </div>
  );
}

/**
 * LogEntry Component
 * Einzelner Log-Eintrag mit Details
 */
function LogEntry({ log, onCopy, getLevelColor, getLevelEmoji, formatTimestamp }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2 border border-gray-700 rounded bg-gray-800 hover:bg-gray-750 transition-colors">
      {/* Log Header */}
      <div
        className="flex items-start gap-2 p-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-lg">{getLevelEmoji(log.level)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500 text-xs font-mono">
              {formatTimestamp(log.timestamp)}
            </span>
            <span className={`font-bold ${getLevelColor(log.level)}`}>
              {log.level}
            </span>
            <span className="text-blue-400 font-semibold">
              [{log.category}]
            </span>
          </div>
          <div className="text-white">{log.message}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className="text-gray-500 hover:text-white text-sm px-2"
          title="Kopieren"
        >
          📋
        </button>
        <span className="text-gray-500">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-700 p-2 bg-gray-900">
          {/* Data */}
          {Object.keys(log.data).length > 0 && (
            <div className="mb-2">
              <div className="text-gray-400 text-xs font-semibold mb-1">DATA:</div>
              <pre className="text-xs text-gray-300 overflow-auto max-h-96 bg-black p-2 rounded">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Meta Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <div><span className="font-semibold">User Agent:</span> {log.userAgent}</div>
            <div><span className="font-semibold">Screen:</span> {log.screenSize}</div>
            <div><span className="font-semibold">Full Timestamp:</span> {log.timestamp}</div>
          </div>
        </div>
      )}
    </div>
  );
}
