# Refresh Your English 🌍

Mehrsprachige Lern-App (React/Vite + Express/SQLite): sprachneutrale Engine
plus deklarative **Language Packs** unter `content/packs/<code>/`.
Aktive Packs: **Englisch (en)** und **Italienisch (it)**.

Lernweg: Onboarding (Zielsprache, Niveau, Ziel) → adaptiver Placement-Test
(6 Skills, IRT-artige Theta-Schätzung) → tägliche Session aus
Input (Lesen/Hören) · Grammatik-Fokus · Produktion (Schreiben/Sprechen) ·
Can-do-Check. Dazu FSRS-SRS-Review, Reader mit Wort-Abdeckung, Fortschritts-Dashboard.

## Schnellstart

```bash
npm install
cd backend && npm install

# 1. Migrationen + Content seeden (alle Packs aus content/packs/)
node backend/src/scripts/bootstrap.js

# 2. Backend (Port 3001) – JWT_SECRET ist Pflicht
cd backend && JWT_SECRET=devsecret node src/server.js

# 3. Frontend (Port 5173) – vom Repo-Root
npm run dev
```

Tests: `cd backend && npx vitest run` · Build: `npm run build`

## 🧩 Architektur

- **Engine** (`backend/src/services`, `src/features`): kennt keine Sprach-Codes,
  sondern nur Pack-Inhalte. Alles Sprachspezifische liegt im Pack.
- **Language Pack** (`content/packs/<code>/`):
  `manifest.json`, `vocab/seed.json`, `grammar/<code>_cefr.json`,
  `reader/seed.json`, `listening/seed.json`, `output/prompts.json`,
  `curriculum/units_*.json`, `placement/items.json`.
- **API:** ausschließlich `/api/v2/*` (+ `/api/auth`). v1 wurde mit dem
  Cut-over entfernt – Details und Rollback in [docs/CUTOVER-V2.md](docs/CUTOVER-V2.md).
- **Neue Sprache:** Pack-Verzeichnis nach Vorbild von `content/packs/it/`
  anlegen, seeden, fertig – kein Engine-Code nötig.

## 🔧 Konfiguration

Backend-ENV: `JWT_SECRET` (Pflicht), `DB_PATH` (Standard `backend/data/vocabulary.db`),
`PACKS_DIR` (Standard `content/packs`), `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`
(OpenAI-kompatibel: Mistral, OpenAI, Ollama, vLLM …).

Frontend-ENV: `VITE_API_URL` (Standard `http://localhost:3001/api`).

Speech-to-Text und Text-to-Speech laufen über die Browser **Web Speech API**
(konfigurationsfrei).

## 📚 Projektstruktur

```
content/packs/<code>/   # Language Packs (einzige Content-Quelle)
backend/src/
├── languages/          # Pack-Registry + Schema
├── llm/                # Provider, Prompts, Task-Runner
├── routes/v2/          # API v2 (languages, placement, vocab, reader,
│                       #   grammar, writing, speaking, session, progress, llm)
├── services/           # Engine: FSRS, Placement, Composer, Reader, …
└── scripts/            # migrate-v2, seed-*, gen-*, drop-v1-tables
src/
├── core/               # Auth-Context, Sprach-Kontext, v2Client
├── features/           # onboarding, placement, session, review, reader,
│                       #   grammar, writing, speaking, progress
└── components/         # Auth, Settings, LogViewer, TTS/STT
```

## 📝 Lizenz

MIT License
