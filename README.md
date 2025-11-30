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
- **LLM-Integration** - KI-basierte Bewertung (konfigurierbar für OpenAI, Anthropic, etc.)

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

Die App ist vorbereitet für echte LLM-APIs. Um eine echte KI-Integration zu nutzen:

1. Erstelle eine `.env` Datei im Root-Verzeichnis:
```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

2. Aktiviere die API-Calls in `src/services/llmService.js` (derzeit simuliert für Demo-Zwecke)

### Unterstützte LLM-Provider
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Lokale Modelle (Ollama, LM Studio)
- Weitere APIs können einfach integriert werden

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
