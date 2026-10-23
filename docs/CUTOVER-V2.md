# Cut-over auf die Mehrsprachige Engine (v2)

Phase 8 hat die App von der englisch-only v1-App auf die sprachneutrale
v2-Engine (Language Packs unter `content/packs/<code>/`) umgestellt.
Das Feature-Flag `MULTILANG_ENGINE` ist entfallen – `/api/v2` ist die einzige API.

## Was aktiv ist

| Bereich | Route / Modul |
|---|---|
| Auth | `/api/auth/*` (unverändert) |
| Sprachen-Katalog | `GET /api/v2/languages` |
| Nutzerprofile | `/api/v2/me/languages` (Onboarding, Skills) |
| Placement | `/api/v2/placement/start|answer` |
| Vokabeln (FSRS) | `/api/v2/me/languages/:id/review|cards|stats` |
| Reader | `/api/v2/me/languages/:id/texts` |
| Grammatik | `/api/v2/me/languages/:id/grammar` |
| Schreiben/Sprechen | `/api/v2/me/languages/:id/writing|speaking` |
| Tages-Sitzung | `/api/v2/me/languages/:id/session/*` |
| Fortschritt | `/api/v2/me/languages/:id/progress[/export]` |
| LLM-Info | `GET /api/v2/llm/provider` |

Entfernt (v1): `/api/vocabulary`, `/api/progress`, `/api/flashcards`,
`/api/gamification`, `/api/action-mode`, `/api/llm/*` und die zugehörigen
Frontend-Module (Übersetzung, Action, Dialog, Trainer, Bibliothek, Statistiken,
Gamification-Banner).

## Content-Seeding (nach Deployment / auf neuer DB)

```bash
cd backend
node src/scripts/bootstrap.js        # Migrationen + Seeding aller Packs (idempotent)
```

Der Container-Start (Dockerfile-CMD, nixpacks `[start]`) führt den Bootstrap
automatisch vor dem Server aus. Einzelne Sprachen: `bootstrap.js en it`.
Manuell Schritt für Schritt:

```bash
node src/scripts/migrate-v2.js
node src/scripts/seed-vocab.js en it
node src/scripts/seed-reader.js en it
node src/scripts/seed-listening.js en it
```

Die Pack-Dateien (`content/packs/**`) sind die einzige Content-Quelle;
die Tabellen `vocab_items`, `vocab_senses`, `texts` sind daraus abgeleitet
(Seeding ist idempotent).

## Alt-Tabellen löschen

Der v1-Lernstand (`vocabulary`, `user_progress`, `flashcard_deck`,
`action_mode_reviews`, `daily_activity`, `daily_sessions`, `session_details`,
`training_sessions`, `user_trophies`) wurde nicht migriert – die tabelle
`user_progress` war leer, der Wortschatz ist als CSV in den en-Pack portiert.

```bash
cd backend
node src/scripts/drop-v1-tables.js        # Trockenlauf (zeigt Tabellen)
node src/scripts/drop-v1-tables.js --yes  # löschen – erst nach Backup!
```

## Backup vor dem Cut-over

```bash
# SQLite
cp backend/data/vocabulary.db backend/data/vocabulary.db.bak-$(date +%F)
# PostgreSQL (falls im Einsatz)
pg_dump "$DATABASE_URL" > backup-$(date +%F).sql
```

## Rollback

1. **Code:** Der komplette v1-Stand ist der Commit vor dem Phase-8-Cut-over.
   ```bash
   git checkout <phase8-parent-commit>   # oder Deployment auf dieses Image
   ```
   v1-Routen, Frontend-Module und das `MULTILANG_ENGINE`-Flag existieren dort
   wieder; `content/packs/` bleibt unangetastet (v2 ignoriert es nur).
2. **Datenbank:** v2-Tabellen sind additive Ergänzungen – ein Rollback des
   Codes braucht keinen DB-Rollback, solange `drop-v1-tables.js --yes` noch
   nicht ausgeführt wurde. Wurde es ausgeführt, das Backup von oben
   zurückspielen.
3. **Nutzerprofile:** `user_languages`/`placement_sessions` bleiben erhalten;
   nach Rollback einfach wieder auf v2 deployen – der Zustand passt.

## Betrieb

- Healthcheck: `GET /health`.
- LLM: `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` (OpenAI-kompatibel);
   Anzeige in den Einstellungen über `/api/v2/llm/provider`.
- Logs: Struktur-Logs via LogViewer (Frontend) und Backend-Console.
