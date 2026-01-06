# Debug Log Viewer - Dokumentation

## Übersicht

Der Debug Log Viewer ist ein eingebautes Diagnose-Tool, das alle wichtigen Events, API-Aufrufe und insbesondere LLM-Interaktionen protokolliert. Dies hilft bei der Fehlersuche, besonders wenn sich die App auf verschiedenen Geräten unterschiedlich verhält.

## Funktionen

### 1. Log-Typen

- **DEBUG** 🔍 - Detaillierte Debug-Informationen
- **INFO** ℹ️ - Allgemeine Informationen
- **WARN** ⚠️ - Warnungen
- **ERROR** ❌ - Fehler
- **LLM** 🤖 - Spezifische LLM-API-Aufrufe und Antworten

### 2. Was wird geloggt?

#### LLM-Aufrufe
- **Request**: Provider, Endpoint, Model, Messages, Temperatur
- **Response**: Antwort-Content, Dauer, Token-Usage
- **Errors**: Fehlerdetails bei fehlgeschlagenen Requests

#### API-Aufrufe
- Alle Backend-API-Requests
- Response-Status und Dauer
- Fehler und Error-Details

#### System-Events
- App-Start
- Authentifizierung
- Modul-Wechsel

### 3. Log Viewer öffnen

- Klicke auf den **🐛 Debug-Button** in der oberen rechten Ecke
- Der Log Viewer öffnet sich als Vollbild-Overlay

### 4. Features des Log Viewers

#### Filter
- **ALL**: Zeigt alle Logs
- **DEBUG/INFO/WARN/ERROR/LLM**: Filtert nach Log-Level

#### Suche
- Durchsuche Logs nach Keywords
- Sucht in Message, Category und Data

#### Auto-Scroll
- **Auto-Scroll AN** 📍: Scrollt automatisch zu neuen Logs
- **Auto-Scroll AUS** ⏸️: Bleibt an aktueller Position

#### Export
- **JSON**: Exportiert Logs als JSON-Datei
- **TXT**: Exportiert Logs als lesbare Text-Datei

#### System Info
- **🖥️ System Info**: Zeigt Geräte- und Browser-Informationen
  - User Agent
  - Bildschirmgröße
  - Sprache
  - Memory Usage (wenn verfügbar)
  - Timezone
  - etc.

### 5. Log-Details

Klicke auf einen Log-Eintrag, um Details anzuzeigen:
- Vollständige Request/Response-Daten
- User Agent
- Bildschirmgröße
- Timestamp

### 6. Verwendung für Debugging

#### Problem: LLM-API funktioniert nicht

1. Öffne Log Viewer
2. Filtere nach **LLM**
3. Suche nach "Request" und "Response"
4. Prüfe:
   - Wird der Request gesendet?
   - Kommt eine Response?
   - Gibt es Fehler?
   - Welche Daten werden gesendet/empfangen?

#### Problem: Unterschiedliches Verhalten auf verschiedenen Geräten

1. Öffne Log Viewer auf beiden Geräten
2. Klicke auf **System Info**
3. Vergleiche:
   - Browser/User Agent
   - Bildschirmgröße
   - Memory
   - etc.
4. Exportiere Logs von beiden Geräten
5. Vergleiche die Logs

#### Problem: API-Fehler

1. Filtere nach **ERROR**
2. Suche nach dem entsprechenden Endpoint
3. Prüfe:
   - Status Code
   - Error Message
   - Request Body
   - Response Duration

## Programmatische Verwendung

### Im Code loggen

```javascript
import logService from './services/logService';

// Info Log
logService.info('CATEGORY', 'Message', { data: 'value' });

// Warning
logService.warn('CATEGORY', 'Warning message', { details });

// Error
logService.error('CATEGORY', 'Error message', { error });

// Debug
logService.debug('CATEGORY', 'Debug info', { debugData });

// LLM-spezifisch
logService.llm('LLM Event', { provider, response });

// Oder spezifische LLM-Methoden
logService.logLLMRequest(provider, endpoint, requestData);
logService.logLLMResponse(provider, response, duration);
logService.logLLMError(provider, error, requestData);
```

### Log Listener registrieren

```javascript
import logService from './services/logService';

// Registriere Listener
const unsubscribe = logService.addListener(({ entry, event, logs }) => {
  console.log('New log:', entry);
  
  // Bei neuem Log
  if (event === 'new') {
    // Handle new log
  }
  
  // Bei clear
  if (event === 'clear') {
    // Handle clear
  }
});

// Cleanup
unsubscribe();
```

## Speicherung

- Logs werden im **localStorage** gespeichert
- Maximal **500 Logs** werden behalten (älteste werden gelöscht)
- Logs bleiben zwischen Sessions erhalten
- Lösche mit **🗑️ Löschen** Button im Log Viewer

## Best Practices

1. **Filtere spezifisch**: Nutze Filter und Suche, um relevante Logs zu finden
2. **Exportiere bei Problemen**: Exportiere Logs als JSON/TXT für spätere Analyse
3. **System Info prüfen**: Bei Geräte-spezifischen Problemen System Info vergleichen
4. **Logs teilen**: Exportierte Logs können geteilt werden für Support
5. **Regelmäßig löschen**: Lösche alte Logs, wenn sie nicht mehr benötigt werden

## Troubleshooting

### Log Viewer öffnet sich nicht
- Prüfe Browser-Console auf Fehler
- Stelle sicher, dass JavaScript aktiviert ist

### Logs werden nicht gespeichert
- Prüfe localStorage Quota
- Browser könnte Private Mode sein
- Lösche alte Logs

### Performance-Probleme
- Zu viele Logs können die App verlangsamen
- Lösche regelmäßig alte Logs
- Deaktiviere Auto-Scroll bei vielen Logs

## Technische Details

### Log Entry Struktur

```javascript
{
  timestamp: "2026-01-06T10:30:45.123Z",
  level: "LLM",
  category: "LLM",
  message: "LLM Request gesendet",
  data: {
    provider: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
    messages: [...],
    temperature: 0.7
  },
  userAgent: "Mozilla/5.0...",
  screenSize: "1920x1080"
}
```

### Performance

- Logs werden asynchron geschrieben
- Max 500 Logs im Speicher
- Automatisches Cleanup alter Logs
- Effiziente Filter-Implementierung

## Zukünftige Erweiterungen

- [ ] Remote-Logging (Logs an Server senden)
- [ ] Log-Levels konfigurierbar machen
- [ ] Performance-Metrics visualisieren
- [ ] Export als CSV
- [ ] Log-Aggregation und Statistiken
- [ ] Echtzeit-Benachrichtigungen bei Errors
