# Refresh Your English 🇬🇧

Eine moderne Vokabel-Trainings-App mit React und Tailwind CSS, die LLM-basierte Module für effektives Englischlernen bietet.

## 🚀 Features

### Modul 1: Übersetzungsübung
- Übersetze deutsche Sätze ins Englische
- Erhalte KI-basiertes Feedback zu deinen Übersetzungen
- Detaillierte Bewertung auf einer Skala von 1-10
- Verbesserungsvorschläge für natürlichere Übersetzungen
- Fortschrittsanzeige und Punktesystem

### Modul 2: Action Modus
- Zeitbasiertes Vokabeltraining mit Countdown
- Drei Schwierigkeitsstufen (Einfach/Normal/Schwer)
- Punktesystem mit Zeit- und Serien-Boni
- Trainiere deinen aktiven Sprachschatz unter Zeitdruck
- Echtzeit-Statistiken und Genauigkeitsmessung

## 🛠️ Technologie-Stack

- **React** - UI-Framework
- **Tailwind CSS** - Styling
- **Vite** - Build-Tool
- **LLM-Integration** - KI-basierte Bewertung über eine frei konfigurierbare OpenAI-kompatible Schnittstelle

## 📦 Installation

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Production Build erstellen
npm run build
```

## 🔧 LLM-Integration

Die KI-Funktionen laufen über eine **frei konfigurierbare OpenAI-kompatible Schnittstelle**
(Base URL + API-Key + Modellname). Damit lassen sich Mistral, OpenAI oder lokale Modelle nutzen.

1. Erstelle eine `.env` Datei im Root-Verzeichnis:
```env
VITE_LLM_BASE_URL=https://api.mistral.ai/v1
VITE_LLM_API_KEY=your_api_key
VITE_LLM_MODEL=mistral-large-latest
```

Das Backend nutzt dieselbe Konfiguration über `LLM_BASE_URL`, `LLM_API_KEY` und `LLM_MODEL`.

### Unterstützte LLM-Anbieter
- Mistral (`https://api.mistral.ai/v1`)
- OpenAI (`https://api.openai.com/v1`)
- Lokale Modelle (Ollama `http://localhost:11434/v1`, LM Studio, vLLM)
- Jede andere OpenAI-kompatible API

### Sprachfunktionen
Speech-to-Text und Text-to-Speech laufen ausschließlich über die **Browser Web Speech API**
und benötigen keine Konfiguration.

## 🎯 Verwendung

1. Starte die App mit `npm run dev`
2. Wähle ein Trainingsmodul:
   - **Übersetzungsübung**: Für detailliertes Feedback und Verbesserungen
   - **Action Modus**: Für schnelles Vokabeltraining unter Zeitdruck
3. Verbessere deinen englischen Wortschatz!

## 📚 Projektstruktur

```
src/
├── components/
│   ├── TranslationModule.jsx    # Übersetzungsübung
│   └── ActionModule.jsx          # Action Modus
├── services/
│   └── llmService.js             # LLM-API Integration
├── App.jsx                       # Hauptkomponente
└── index.css                     # Tailwind Styles
```

## 🎨 Features im Detail

### Übersetzungsmodul
- Beispielsätze mit unterschiedlichen Schwierigkeitsgraden
- KI-Bewertung mit detailliertem Feedback
- Verbesserungsvorschläge
- Musterlösung zur Überprüfung
- Fortschrittsverfolgung

### Action Modus
- Countdown-Timer (5-15 Sekunden je nach Schwierigkeit)
- Punktesystem mit Boni
- Serien-System für konsistente richtige Antworten
- Genauigkeits-Statistiken
- Visuelle Fortschrittsanzeige

## 🚀 Zukünftige Erweiterungen

- [ ] Benutzer-Authentifizierung
- [ ] Persistente Fortschrittsspeicherung
- [ ] Erweiterte Vokabellisten und Kategorien
- [ ] Sprachausgabe für Aussprachetraining
- [ ] Multiplayer-Modus
- [ ] Eigene Vokabellisten erstellen
- [ ] Exportfunktion für Lernstatistiken

## 📝 Lizenz

MIT License

## 🤝 Contributing

Beiträge sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue für Vorschläge und Verbesserungen.

---

Made with ❤️ for English learners

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
