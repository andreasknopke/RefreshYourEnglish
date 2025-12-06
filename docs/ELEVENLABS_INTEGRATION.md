# ElevenLabs Text-to-Speech Integration

## Übersicht

Die App integriert die ElevenLabs API für hochwertige Text-to-Speech-Ausgabe in Englisch und Deutsch.

## Setup

### 1. API-Key erhalten

1. Gehe zu [ElevenLabs](https://elevenlabs.io/)
2. Erstelle einen Account (kostenloser Plan verfügbar)
3. Navigiere zu Profile Settings → API Keys
4. Erstelle einen neuen API-Key

### 2. Voice-ID finden (Optional)

Wenn du eine spezielle Stimme verwenden möchtest:
1. Gehe zu [ElevenLabs Voices](https://elevenlabs.io/app/voice-library)
2. Wähle oder erstelle eine Stimme
3. Klicke auf die Stimme und kopiere die Voice-ID
4. Die Voice-ID ist ein langer String wie `21m00Tcm4TlvDq8ikWAM`

### 3. Konfiguration

Füge die Keys zur `.env`-Datei hinzu:

```bash
# Erforderlich
VITE_ELEVENLABS_API_KEY=your_api_key_here

# Optional: Verwende eine spezielle Stimme für alle Sprachen
VITE_ELEVENLABS_VOICE_ID=your_custom_voice_id_here
```

**Standard-Stimmen (wenn keine VOICE_ID gesetzt):**
- Englisch: Rachel (weiblich, amerikanisch)
- Deutsch: Lily (weiblich)

**Mit Custom Voice-ID:**
- Alle Texte (EN + DE) verwenden deine spezielle Stimme

**Wichtig für Railway Deployment:**
- Füge die Umgebungsvariable `VITE_ELEVENLABS_API_KEY` in den Railway-Einstellungen hinzu
- Variable wird beim Build-Prozess in die App integriert

## Verwendung in Komponenten

### Wiederverwendbare TTSButton-Komponente

```jsx
import TTSButton from './TTSButton';

function MyComponent() {
  return (
    <div>
      <p>Hello World</p>
      <TTSButton text="Hello World" language="en" />
    </div>
  );
}
```

### Direkter Service-Aufruf

```jsx
import ttsService from '../services/ttsService';

// Text vorlesen
await ttsService.speak('Hello World', 'en');

// Audio stoppen
ttsService.stop();

// Prüfen ob Audio läuft
const isPlaying = ttsService.isPlaying();
```

## Features

### Audio-Caching
- Automatisches Caching von generierten Audio-Dateien
- Max. 50 Einträge im Cache
- Reduziert API-Aufrufe und verbessert Performance

### Unterstützte Sprachen

- **Englisch**: Rachel (weiblich, amerikanisches Englisch)
- **Deutsch**: Lily (weiblich, deutsch)

Weitere Stimmen können in `src/services/ttsService.js` hinzugefügt werden.

### Verfügbare Stimmen abrufen

```javascript
const voices = await ttsService.getVoices();
console.log(voices);
```

## Integration in Module

### VocabularyTrainer
- TTS-Button auf Vorder- und Rückseite der Flashcards
- Deutsch und Englisch verfügbar

### ActionModule
- TTS-Button bei aktueller Vokabel
- TTS-Buttons in der Ergebnisliste (DE + EN)

### TranslationModule
- TTS-Button beim deutschen Satz
- Hilft bei korrekter Aussprache

## Erweiterte Optionen

```javascript
await ttsService.speak('Hello World', 'en', {
  voiceId: 'custom_voice_id',       // Spezifische Stimme
  modelId: 'eleven_multilingual_v2', // TTS-Modell
  stability: 0.5,                     // 0-1, Stabilität der Stimme
  similarityBoost: 0.75,             // 0-1, Ähnlichkeit zur Original-Stimme
  style: 0,                          // 0-1, Stil-Intensität
  useSpeakerBoost: true              // Speaker-Boost aktivieren
});
```

## API-Limits

**Free Tier:**
- 10.000 Zeichen/Monat
- Zugriff auf Standard-Stimmen
- Kommerzielle Nutzung erlaubt

Für höhere Limits siehe [ElevenLabs Pricing](https://elevenlabs.io/pricing).

## Fehlerbehandlung

- Bei fehlendem API-Key: Warnung in der Konsole, TTS-Button wird deaktiviert
- Bei API-Fehlern: Button zeigt 🔇 Icon mit Fehlermeldung im Tooltip
- Cache-Fehler werden automatisch behandelt

## Troubleshooting

### TTS-Button erscheint nicht
- Prüfe ob `VITE_ELEVENLABS_API_KEY` gesetzt ist
- Öffne Browser-Konsole für Warnungen

### Audio wird nicht abgespielt
- Prüfe Browser-Berechtigungen für Audio
- Stelle sicher, dass CORS korrekt konfiguriert ist
- Prüfe API-Limits im ElevenLabs Dashboard

### Qualität der Ausgabe

Bei Problemen mit der Audio-Qualität:
1. Passe `stability` an (höhere Werte = stabiler)
2. Experimentiere mit verschiedenen Stimmen
3. Nutze `eleven_multilingual_v2` für bessere Qualität (mehr Credits)

## Architektur

```
src/
├── services/
│   └── ttsService.js         # ElevenLabs API Service
└── components/
    └── TTSButton.jsx         # Wiederverwendbare TTS-Komponente
```

### ttsService.js
- Singleton-Service für TTS-Funktionen
- Audio-Caching
- API-Kommunikation

### TTSButton.jsx
- Wiederverwendbarer React-Button
- Loading- und Playing-States
- Fehlerbehandlung
