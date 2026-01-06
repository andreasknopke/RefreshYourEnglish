import React, { useState } from 'react';
import apiService from '../services/apiService';
import logService from '../services/logService';

/**
 * Diagnostics Panel für Debugging
 * Zeigt Netzwerk-Status, Cache-Info und bietet Clear-Funktionen
 */
export default function DiagnosticsPanel() {
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Online Status
    results.tests.push({
      name: 'Online Status',
      status: navigator.onLine ? 'PASS' : 'FAIL',
      value: navigator.onLine ? 'Online' : 'Offline',
      icon: navigator.onLine ? '✅' : '❌'
    });

    // Test 2: API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    results.tests.push({
      name: 'API URL',
      status: 'INFO',
      value: apiUrl,
      icon: '🌐'
    });

    // Test 3: Backend Erreichbarkeit
    try {
      const healthCheck = await fetch(`${apiUrl}/health`).catch(() => null);
      results.tests.push({
        name: 'Backend Health Check',
        status: healthCheck?.ok ? 'PASS' : 'FAIL',
        value: healthCheck?.ok ? `OK (${healthCheck.status})` : 'Not reachable',
        icon: healthCheck?.ok ? '✅' : '❌'
      });
    } catch (error) {
      results.tests.push({
        name: 'Backend Health Check',
        status: 'FAIL',
        value: error.message,
        icon: '❌'
      });
    }

    // Test 4: Service Worker Status
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      results.tests.push({
        name: 'Service Worker',
        status: registrations.length > 0 ? 'ACTIVE' : 'NONE',
        value: `${registrations.length} active`,
        icon: registrations.length > 0 ? '⚙️' : '⭕'
      });
    } else {
      results.tests.push({
        name: 'Service Worker',
        status: 'N/A',
        value: 'Not supported',
        icon: '⭕'
      });
    }

    // Test 5: localStorage
    try {
      const authToken = localStorage.getItem('authToken');
      results.tests.push({
        name: 'Auth Token',
        status: authToken ? 'PRESENT' : 'NONE',
        value: authToken ? `${authToken.substring(0, 20)}...` : 'None',
        icon: authToken ? '🔑' : '🔓'
      });
    } catch (error) {
      results.tests.push({
        name: 'localStorage',
        status: 'ERROR',
        value: error.message,
        icon: '❌'
      });
    }

    // Test 6: DNS Resolution
    try {
      const domain = apiUrl.replace(/https?:\/\//, '').split('/')[0];
      const dnsStart = performance.now();
      await fetch(`https://${domain}`, { method: 'HEAD', mode: 'no-cors' });
      const dnsTime = Math.round(performance.now() - dnsStart);
      results.tests.push({
        name: 'DNS Resolution',
        status: 'PASS',
        value: `${dnsTime}ms`,
        icon: '🌍'
      });
    } catch (error) {
      results.tests.push({
        name: 'DNS Resolution',
        status: 'FAIL',
        value: error.message,
        icon: '❌'
      });
    }

    // Test 7: CORS
    try {
      const response = await fetch(apiUrl, { method: 'OPTIONS' });
      const corsHeaders = response.headers.get('access-control-allow-origin');
      results.tests.push({
        name: 'CORS Headers',
        status: corsHeaders ? 'PASS' : 'WARN',
        value: corsHeaders || 'Not set',
        icon: corsHeaders ? '✅' : '⚠️'
      });
    } catch (error) {
      results.tests.push({
        name: 'CORS',
        status: 'FAIL',
        value: error.message,
        icon: '❌'
      });
    }

    setTestResults(results);
    setTesting(false);
    
    logService.info('DIAGNOSTICS', 'Diagnostics completed', results);
  };

  const clearCache = async () => {
    if (!confirm('Cache, localStorage und Service Worker löschen? Die Seite wird neu geladen.')) {
      return;
    }

    try {
      // Clear localStorage
      const keysToKeep = ['llm_provider'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Clear Cache Storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }

      logService.info('DIAGNOSTICS', 'Cache cleared successfully');
      alert('✅ Cache gelöscht! Die Seite wird neu geladen.');
      window.location.reload();
    } catch (error) {
      logService.error('DIAGNOSTICS', 'Failed to clear cache', { error: error.message });
      alert(`❌ Fehler beim Löschen: ${error.message}`);
    }
  };

  const forceReload = () => {
    if (confirm('Seite komplett neu laden (Hard Reload)?')) {
      window.location.reload(true);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 shadow-xl">
      <h3 className="text-xl font-bold mb-4 text-gray-800">🔧 Netzwerk-Diagnostik</h3>
      
      <div className="space-y-3 mb-4">
        <button
          onClick={runDiagnostics}
          disabled={testing}
          className="w-full btn-primary"
        >
          {testing ? '⏳ Teste...' : '🔍 Diagnostik ausführen'}
        </button>

        <button
          onClick={clearCache}
          className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition-all"
        >
          🗑️ Cache & Service Worker löschen
        </button>

        <button
          onClick={forceReload}
          className="w-full px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
        >
          🔄 Seite komplett neu laden
        </button>
      </div>

      {testResults && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-bold text-sm text-gray-700 mb-3">Test-Ergebnisse:</h4>
          <div className="space-y-2">
            {testResults.tests.map((test, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  test.status === 'PASS' ? 'bg-green-50 border border-green-200' :
                  test.status === 'FAIL' ? 'bg-red-50 border border-red-200' :
                  test.status === 'WARN' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{test.icon}</span>
                    <span className="font-semibold">{test.name}</span>
                  </div>
                  <span className={`text-xs font-bold ${
                    test.status === 'PASS' ? 'text-green-600' :
                    test.status === 'FAIL' ? 'text-red-600' :
                    test.status === 'WARN' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {test.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1 ml-8 font-mono break-all">
                  {test.value}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-3">
            Ausgeführt: {new Date(testResults.timestamp).toLocaleString('de-DE')}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 Tipp:</p>
        <p className="text-xs">
          Wenn iPad funktioniert aber Handy nicht: Cache löschen und Seite neu laden.
          Das Problem liegt meist an gecachten Daten oder einem alten Service Worker.
        </p>
      </div>
    </div>
  );
}
