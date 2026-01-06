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
    const currentUrl = window.location.origin;
    results.tests.push({
      name: 'API URL',
      status: 'INFO',
      value: apiUrl,
      icon: '🌐',
      details: `Backend URL die verwendet wird`
    });

    // Test 2b: Frontend URL
    results.tests.push({
      name: 'Frontend URL',
      status: 'INFO',
      value: currentUrl,
      icon: '🌐',
      details: 'Diese URL muss in der Backend CORS-Config sein'
    });

    // Test 2c: CORS Match Check
    const backendCorsUrl = 'https://pleasant-cooperation-production.up.railway.app';
    const corsMatch = currentUrl === backendCorsUrl;
    results.tests.push({
      name: 'CORS URL Match',
      status: corsMatch ? 'PASS' : 'WARN',
      value: corsMatch ? 'URLs stimmen überein' : `Frontend: ${currentUrl} ≠ Backend CORS: ${backendCorsUrl}`,
      icon: corsMatch ? '✅' : '⚠️',
      details: corsMatch ? 'CORS sollte funktionieren' : 'CORS könnte blockieren - Backend-Config prüfen!'
    });

    // Test 3: Backend Erreichbarkeit
    try {
      // Verwende einen existierenden Endpoint statt /health
      const response = await fetch(`${apiUrl.replace('/api', '')}/api/vocabulary`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      results.tests.push({
        name: 'Backend Erreichbarkeit',
        status: response.ok ? 'PASS' : 'FAIL',
        value: response.ok ? `OK (${response.status})` : `Error ${response.status}`,
        icon: response.ok ? '✅' : '❌',
        details: response.ok ? 'Backend ist erreichbar' : `Status: ${response.status}`
      });
    } catch (error) {
      results.tests.push({
        name: 'Backend Erreichbarkeit',
        status: 'FAIL',
        value: error.message,
        icon: '❌',
        details: 'Backend nicht erreichbar oder CORS-Fehler'
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

    // Test 7: CORS Preflight
    try {
      const corsTestUrl = apiUrl.replace('/api', '');
      const response = await fetch(`${corsTestUrl}/api/vocabulary`, { 
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET'
        }
      });
      const corsHeaders = response.headers.get('access-control-allow-origin');
      const corsMatch = corsHeaders === '*' || corsHeaders === window.location.origin;
      results.tests.push({
        name: 'CORS Preflight',
        status: corsMatch ? 'PASS' : 'FAIL',
        value: corsHeaders || 'Nicht gesetzt',
        icon: corsMatch ? '✅' : '❌',
        details: `Backend erlaubt: ${corsHeaders || 'keine'}, Frontend: ${window.location.origin}`
      });
    } catch (error) {
      results.tests.push({
        name: 'CORS Preflight',
        status: 'FAIL',
        value: error.message,
        icon: '❌',
        details: 'CORS Preflight fehlgeschlagen'
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
      logService.info('DIAGNOSTICS', 'Starting cache clear...');

      // 1. Clear localStorage (keep only llm_provider)
      const keysToKeep = ['llm_provider'];
      const allKeys = Object.keys(localStorage);
      const removed = [];
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          removed.push(key);
          localStorage.removeItem(key);
        }
      });
      logService.debug('DIAGNOSTICS', `localStorage cleared: ${removed.join(', ')}`);

      // 2. Unregister Service Workers
      let swCount = 0;
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        swCount = registrations.length;
        logService.debug('DIAGNOSTICS', `Found ${swCount} Service Workers`);
        for (const registration of registrations) {
          await registration.unregister();
          logService.debug('DIAGNOSTICS', 'Service Worker unregistered', { scope: registration.scope });
        }
      }

      // 3. Delete all Cache Storage
      let cacheCount = 0;
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        cacheCount = cacheNames.length;
        logService.debug('DIAGNOSTICS', `Found ${cacheCount} caches: ${cacheNames.join(', ')}`);
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          logService.debug('DIAGNOSTICS', `Cache deleted: ${cacheName}`);
        }
      }

      // 4. Clear sessionStorage
      sessionStorage.clear();
      logService.debug('DIAGNOSTICS', 'sessionStorage cleared');

      logService.info('DIAGNOSTICS', 'Cache cleared successfully', { 
        localStorageKeys: removed.length,
        serviceWorkers: swCount,
        caches: cacheCount
      });

      alert('✅ Cache komplett gelöscht!\n\nDie Seite wird jetzt neu geladen und sollte die aktuelle Version vom Server holen.');
      
      // Hard reload to bypass cache
      window.location.href = window.location.href;
    } catch (error) {
      logService.error('DIAGNOSTICS', 'Failed to clear cache', { error: error.message });
      alert(`❌ Fehler beim Löschen: ${error.message}\n\nVersuche stattdessen: Browser komplett schließen und neu öffnen.`);
    }
  };

  const nuclearOption = async () => {
    if (!confirm('⚠️ NUCLEAR OPTION ⚠️\n\nWIRKLICH ALLES löschen (inkl. LLM-Einstellungen)?\nDies kann helfen wenn normale Cache-Löschung nicht funktioniert.')) {
      return;
    }

    try {
      logService.warn('DIAGNOSTICS', 'Nuclear option activated!');

      // Clear EVERYTHING - no exceptions
      localStorage.clear();
      sessionStorage.clear();

      // Unregister all Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Delete all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          const dbs = await window.indexedDB.databases?.() || [];
          dbs.forEach(db => {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          });
        } catch (e) {
          logService.debug('DIAGNOSTICS', 'IndexedDB clear not supported', { error: e.message });
        }
      }

      logService.info('DIAGNOSTICS', '💥 Nuclear option completed');
      alert('💥 ALLES gelöscht!\n\nDie App startet jetzt komplett neu.');
      
      // Force complete reload
      window.location.href = window.location.origin;
    } catch (error) {
      logService.error('DIAGNOSTICS', 'Nuclear option failed', { error: error.message });
      alert(`❌ Fehler: ${error.message}\n\n🔧 Letzte Option: Safari/Chrome Einstellungen öffnen → Website-Daten löschen für diese App.`);
    }
  };

  const forceReload = () => {
    if (confirm('Seite komplett neu laden (Hard Reload)?\n\nBypasst den Browser-Cache.')) {
      // Modern browsers ignore the parameter, so we use a cache-busting URL
      const url = new URL(window.location.href);
      url.searchParams.set('_reload', Date.now());
      window.location.href = url.href;
    }
  };

  const updateServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) {
          alert('ℹ️ Kein Service Worker gefunden.');
          return;
        }

        for (const registration of registrations) {
          await registration.update();
          logService.info('DIAGNOSTICS', 'Service Worker update triggered', { scope: registration.scope });
        }

        alert('✅ Service Worker Update ausgelöst!\n\nWenn verfügbar, wird die neue Version beim nächsten Reload geladen.');
      } else {
        alert('❌ Service Worker nicht unterstützt in diesem Browser.');
      }
    } catch (error) {
      logService.error('DIAGNOSTICS', 'Service Worker update failed', { error: error.message });
      alert(`❌ Fehler: ${error.message}`);
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
          onClick={updateServiceWorker}
          className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
        >
          🔄 Service Worker aktualisieren
        </button>

        <button
          onClick={clearCache}
          className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition-all"
        >
          🗑️ Cache & Service Worker löschen
        </button>

        <button
          onClick={nuclearOption}
          className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
        >
          💥 Nuclear Option (ALLES löschen)
        </button>

        <button
          onClick={forceReload}
          className="w-full px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
        >
          🔄 Hard Reload
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
                  <strong>{test.value}</strong>
                  {test.details && (
                    <div className="text-gray-500 mt-1">
                      💡 {test.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-3">
            Ausgeführt: {new Date(testResults.timestamp).toLocaleString('de-DE')}
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p className="font-semibold mb-2">💡 Wenn die App auf einem Gerät nicht mehr funktioniert:</p>
        <ol className="text-xs space-y-1 list-decimal list-inside">
          <li><strong>Service Worker aktualisieren</strong> - Lädt die neueste App-Version</li>
          <li><strong>Cache löschen</strong> - Entfernt gecachte alte Daten (behält LLM-Settings)</li>
          <li><strong>Nuclear Option</strong> - Löscht ALLES und startet komplett neu</li>
        </ol>
        <p className="text-xs mt-2 text-blue-600">
          ⚠️ Nach Cache-Löschung immer die Seite komplett schließen und neu öffnen (nicht nur refreshen)!
        </p>
      </div>
    </div>
  );
}
