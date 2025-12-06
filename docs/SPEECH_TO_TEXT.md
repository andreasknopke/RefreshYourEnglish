# Speech-to-Text Integration

## Übersicht

Die App nutzt die **Web Speech API** (Browser-native) für Spracheingabe in allen Eingabefeldern.

## Implementierung

### Service: `sttService.js`

```javascript
import sttService from '../services/sttService';

// Spracherkennung initialisieren
sttService.initRecognition(
  'en', // Sprache: 'en' oder 'de'
  (interimText) => {
    // Zwischenergebnisse während der Aufnahme
    console.log('Interim:', interimText);
  },
  (finalText) => {
    // Finales Ergebnis nach Beendigung
    console.log('Final:', finalText);
  },
  (error) => {
    // Fehlerbehandlung
    console.error('Error:', error);
  }
);

// Aufnahme starten
sttService.start();

// Aufnahme stoppen
sttService.stop();

// Browser-Support prüfen
const isSupported = sttService.checkSupport();
```

### Component: `STTButton.jsx`

```jsx
import STTButton from './STTButton';

<STTButton
  onTranscript={(text) => setInputValue(prev => prev + ' ' + text)}
  language="en"
  disabled={false}
/>
```

## Integrierte Module

1. **DialogModule**: Englische Konversationen
2. **TranslationModule**: Englische Übersetzungen

## Features

- ✅ **Kostenlos**: Keine API-Kosten, Browser-native
- ✅ **Echtzeit**: Live-Transkription während der Aufnahme
- ✅ **Mehrsprachig**: Unterstützt Englisch und Deutsch
- ✅ **Auto-Stop**: Erkennt automatisch Pausen
- ✅ **Visual Feedback**: Animierter Button während Aufnahme
- ✅ **Error Handling**: Klare Fehlermeldungen

## Browser-Kompatibilität

| Browser | Support |
|---------|---------|
| Chrome | ✅ Vollständig |
| Edge | ✅ Vollständig |
| Safari | ✅ Teilweise (macOS/iOS 14.5+) |
| Firefox | ❌ Nicht unterstützt |

## Verwendung

1. **Mikrofon-Button klicken** 🎤
2. **Sprechen** (roter pulsierender Button = aktiv 🔴)
3. **Automatischer Stop** nach Pause
4. **Text wird eingefügt** in das Eingabefeld

## Fehlerbehandlung

- **"Mikrofon-Zugriff verweigert"**: Browser-Berechtigung erforderlich
- **"Keine Sprache erkannt"**: Lauter sprechen oder Mikrofon prüfen
- **"Netzwerkfehler"**: Internetverbindung prüfen (API-Anfrage erforderlich)
- **Button ausgegraut**: Browser unterstützt keine Spracherkennung

## Technische Details

- **API**: Web Speech API (`SpeechRecognition`)
- **Modus**: `continuous: false` (stoppt nach einer Phrase)
- **Sprachen**: 
  - Englisch: `en-US`
  - Deutsch: `de-DE`
- **Interim Results**: `true` (zeigt Zwischenergebnisse)

## Vorteile gegenüber ElevenLabs

1. **Kostenlos**: Keine API-Gebühren
2. **Schneller**: Keine Server-Round-Trips
3. **Offline-fähig**: Funktioniert teilweise ohne Internet (browserabhängig)
4. **Geringere Latenz**: Echtzeit-Transkription

## Einschränkungen

- Funktioniert nur in unterstützten Browsern
- Benötigt Internetverbindung (Google Speech Recognition Backend)
- Genauigkeit variiert je nach Mikrofon und Umgebungsgeräuschen
