# Refresh Your English 🇬🇧

Eine moderne Vokabel-Trainings-App mit React, Tailwind CSS und LLM-gestützten Modulen für effektives Englischlernen.

## 🌟 Features

### 📝 Modul 1: Übersetzungsübung
- Übersetze deutsche Sätze ins Englische
- KI-basiertes Feedback mit GPT-4o-mini
- Detaillierte Bewertung auf einer Skala von 1-10
- Verbesserungsvorschläge für natürlichere Übersetzungen
- Fortschrittsanzeige und Punktesystem

### ⚡ Modul 2: Action Modus
- Zeitbasiertes Vokabeltraining mit Countdown
- **Einstellbare Wortanzahl** pro Runde (5-50 Wörter)
- **"I know" / "Forgot" Button-System** für schnelles Lernen
- **Inline-Vokabel-Editor** zum Bearbeiten während des Trainings
- **Detaillierte Auswertung** nach jeder Runde
- Drei Schwierigkeitsstufen (Einfach 15s / Normal 10s / Schwer 5s)
- Button "📚 Zum Trainer" zum Hinzufügen ins Lernrepertoire

### 📚 Modul 3: Vocabulary Trainer (NEU!)
- **Flashcard-System** mit 3D-Flip-Animation
- **Spaced Repetition (SM-2 Algorithmus)** für optimales Langzeitlernen
- 4 Schwierigkeitsstufen beim Review: Keine Ahnung → Perfekt
- Live-Statistiken: Gesamt, Fällig, Lernend, Gemeistert
- Automatische Berechnung der nächsten Wiederholungstermine

### 📱 Progressive Web App (PWA)
- **Installierbar** auf Android & iOS
- **Offline-fähig** mit Service Worker
- **App-Icon** auf dem Homescreen
- **Mobile-optimiert** für Touch-Bedienung

### 🔐 User Management & Backend
- **Benutzerregistrierung & Login** mit JWT-Authentication
- **Persönlicher Fortschritt** wird gespeichert
- **Session-Tracking** für alle Trainingsmodule
- **SQLite-Datenbank** mit 1500+ B2-C1 Vokabeln

---

## 🚀 Deployment

Die App ist bereit für Production-Deployment auf **Railway**, **Vercel** oder anderen Plattformen.

👉 **[Siehe DEPLOYMENT.md für detaillierte Anleitung](./DEPLOYMENT.md)**

### Quick Start (Railway):
1. Backend & Frontend jeweils als eigene Services deployen
2. Environment Variables setzen (siehe `.env.production.example`)
3. URLs verlinken und neu deployen
4. Fertig! 🎉

---

## 📚 Vokabeln anpassen

Die App lädt ihre Vokabeln aus der Datei `public/vocabulary.txt`.

**Format der Datei:**
```
Englisch ; Deutsch
```

**Beispiele:**
```
house ; Haus
car ; Auto
to understand ; verstehen
beautiful ; schön / wunderschön
```

### So bearbeitest du die Vokabeldatei:

1. Öffne die Datei `public/vocabulary.txt`
2. Füge neue Zeilen hinzu oder bearbeite bestehende
3. Achte darauf, dass jede Zeile dem Format `Englisch ; Deutsch` entspricht
4. Speichere die Datei
5. Lade die App neu (F5)

**Hinweise:**
- Verwende das Semikolon (`;`) als Trennzeichen
- Du kannst mehrere deutsche Übersetzungen mit `/` trennen
- Leere Zeilen werden ignoriert
- Die App lädt aktuell **über 500 B2-C1 Vokabeln**

## 🛠️ Technologie-Stack

- **React 18+** - UI-Framework
- **Vite** - Build-Tool
- **Tailwind CSS v3** - Styling
- **OpenAI GPT-4o-mini** - KI-basierte Bewertung
- **Custom CSS Animations** - Schwebende Texte, Fade-ins
- **Lokale Vokabeldatei** - Einfach anpassbar für persönliches Lernen

## 📦 Installation

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Production Build erstellen
npm run build
```

## 🤖 OpenAI Integration (ChatGPT Mini)

Die App nutzt **GPT-4o-mini** für KI-basierte Übersetzungsbewertungen.

### Setup:

1. **OpenAI API Key erhalten:**
   - Gehe zu https://platform.openai.com/api-keys
   - Erstelle einen neuen API Key
   - Kopiere den Key

2. **API Key konfigurieren:**
   
   **Option A - Lokale Entwicklung:**
   ```bash
   # Bearbeite die .env Datei im Projektverzeichnis
   VITE_OPENAI_API_KEY=sk-proj-...your-actual-key...
   ```

   **Option B - GitHub Codespaces:**
   ```bash
   # Setze das GitHub Secret "OPENAI_KEY"
   # Dann wird es automatisch als VITE_OPENAI_API_KEY verwendet
   ```

3. **Server neu starten:**
   ```bash
   npm run dev
   ```

### Wie es funktioniert:

- **Mit API Key**: Echte KI-Bewertungen durch GPT-4o-mini
- **Ohne API Key**: Automatischer Fallback auf simulierte Bewertungen
- Das Übersetzungsmodul sendet deine Übersetzung an OpenAI
- Du erhältst detailliertes Feedback, Punktzahl und Verbesserungsvorschläge

**Kosten:** GPT-4o-mini ist sehr günstig (~$0.15 pro 1M Input-Tokens)

## 🔧 Weitere LLM-Provider (Optional)

Die App kann auch mit anderen Providern erweitert werden:

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
