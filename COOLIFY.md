# Deployment auf Coolify

Dieses Repository ist für ein **Single-Container-Deployment** auf Coolify vorbereitet:
Ein Docker-Image enthält **Frontend (Vite/React) + Backend (Express)** und läuft auf **einem Port (3001)**.
Das Backend serviert das gebaute Frontend statisch – dadurch entfallen CORS-Probleme komplett.

## Was wurde vorbereitet?

| Datei | Zweck |
|-------|-------|
| `Dockerfile` | Multi-Stage-Build: Frontend bauen → Backend-Dependencies (native `better-sqlite3`) → schlankes Produktions-Image |
| `.dockerignore` | Hält `node_modules`, `.env`, lokale DB & Docs aus dem Build-Kontext |
| `docker-compose.yml` | Alternative für lokale Tests / Coolify "Docker Compose" |
| `backend/src/server.js` | Serviert `dist/` statisch + SPA-Fallback (nur wenn `dist/` existiert) |

## Architektur

```
Browser ──► https://deine-domain.de ──► Container (Port 3001)
                                          ├── /            → Frontend (dist/index.html)
                                          ├── /<spa-route> → Frontend (SPA-Fallback)
                                          ├── /api/*       → Express API
                                          └── /health      → Healthcheck
```

- **Frontend** ruft die API über den relativen Pfad `/api` auf (gleiche Origin → kein CORS).
- **Datenbank**: Standardmäßig **SQLite** unter `/app/backend/data` (per Volume persistieren).
  Optional **PostgreSQL** via `DATABASE_URL`.

---

## Option A: Coolify "Dockerfile" (empfohlen)

1. **Repository** in Coolify als Source verbinden (Git-Repo oder Upload).
2. **Service → Add Service → Dockerfile** wählen.
3. Einstellungen:
   - **Dockerfile-Pfad**: `Dockerfile`
   - **Build-Context**: Repository-Root
   - **Port**: `3001`
4. **Build-Args** (optional, Standard ist bereits `/api`):
   - `VITE_API_URL` = `/api`
5. **Umgebungsvariablen** setzen (siehe unten).
6. **Volume** anlegen für Persistenz:
   - Host-Pfad (oder named Volume) → Container-Pfad `/app/backend/data`
7. **Domain / Proxy** (Nginx/Traefik) auf Port `3001` zeigen lassen.
8. Deploy starten.

### Benötigte Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|----------|:-------:|--------------|
| `JWT_SECRET` | ✅ | Sicheres, zufälliges Secret (mind. 32 Zeichen). z. B. `openssl rand -hex 32` |
| `PORT` | – | Standard `3001` (bereits im Image gesetzt) |
| `NODE_ENV` | – | Standard `production` (bereits im Image gesetzt) |
| `DATABASE_URL` | – | Optional. Setzen → PostgreSQL, leer → SQLite |
| `CORS_ORIGIN` | – | Nur nötig, falls das Frontend von einer **anderen** Origin geladen wird |
| `VITE_API_URL` | – | Build-Arg. Standard `/api` (relativ, gleiche Origin) |
| `APP_URL` | – | Öffentliche URL der App (für E-Mail-Links), z. B. `https://refreshyourenglish.opnwork.de` |
| `LLM_BASE_URL` | – | OpenAI-kompatible Base URL, z. B. `https://api.mistral.ai/v1`, `https://api.openai.com/v1`, `http://localhost:11434/v1` (Ollama) |
| `LLM_API_KEY` | – | API-Key des LLM-Anbieters (bei lokalen Modellen oft beliebig) |
| `LLM_MODEL` | – | Modellname, z. B. `mistral-large-latest`, `gpt-4o-mini`, `llama3.1` |

> **LLM:** Die KI-Funktionen (Satzgenerierung, Bewertung, Dialog) laufen über eine
> **frei konfigurierbare OpenAI-kompatible Schnittstelle** – Base URL, API-Key und
> Modellname reichen, um Mistral, OpenAI oder ein lokales Modell zu nutzen.
> Ohne `LLM_API_KEY` nutzt die App automatisch Fallback-Bewertungen.

> **Sprachfunktionen:** Speech-to-Text und Text-to-Speech laufen ausschließlich über
> die **Browser Web Speech API** und benötigen keinerlei API-Key oder Konfiguration.

---

## Option B: Coolify "Docker Compose"

1. **Service → Add Service → Docker Compose** wählen.
2. **Compose-Datei**: `docker-compose.yml` (liegt im Repository-Root).
3. Umgebungsvariablen wie oben setzen (`JWT_SECRET` zwingend).
4. Deploy starten.

---

## Option C: Lokaler Test vor dem Deployment

```bash
# Image bauen
docker build -t refresh-your-english .

# Starten
docker run -d --name rye -p 3001:3001 \
  -e JWT_SECRET=dein-sicheres-secret \
  -v rye-data:/app/backend/data \
  refresh-your-english

# Prüfen
curl http://localhost:3001/health
curl -I http://localhost:3001/
```

Oder via Compose:

```bash
JWT_SECRET=dein-sicheres-secret docker compose up --build
```

---

## Datenbank

### SQLite (Standard, einfachste Option)
- Datei liegt unter `/app/backend/data/vocabulary.db`.
- **Volume binden** (Host-Pfad oder named Volume), damit Daten bei Re-Deploy erhalten bleiben.
- Kein separates DB-Service nötig.

### PostgreSQL (optional, empfohlen für mehrere Instanzen)
1. In Coolify ein **PostgreSQL-Service** anlegen.
2. `DATABASE_URL` im App-Service setzen, z. B.:
   ```
   postgres://user:pass@db-host:5432/refreshyouenglish
   ```
3. Beim ersten Start werden die Tabellen automatisch angelegt (Migrations-Skripte).
   Falls du Seed-Daten brauchst, einmalig ausführen:
   ```bash
   docker exec -it <container> node backend/src/scripts/seed.js
   ```

---

## Healthcheck

- Endpoint: `GET /health` → `{ "status": "ok", ... }`
- Im `Dockerfile` und `docker-compose.yml` bereits konfiguriert.
- Coolify kann diesen als Readiness-/Liveness-Check nutzen.

---

## Häufige Probleme

| Problem | Lösung |
|---------|--------|
| Frontend lädt, aber API-Requests schlagen fehl | `VITE_API_URL` muss `/api` sein (Build-Arg). Image neu bauen. |
| `better-sqlite3` Build-Fehler | Nutze den mitgelieferten `Dockerfile` (Stage `backend-deps` installiert Build-Tools). |
| Daten nach Re-Deploy weg | Volume für `/app/backend/data` (SQLite) binden. |
| CORS-Fehler | Tritt nur auf, wenn Frontend & API auf **verschiedenen** Origins laufen. Bei Single-Container nicht nötig. Falls doch: `CORS_ORIGIN` setzen. |
| Port nicht erreichbar | Port `3001` im Service + Proxy korrekt zuweisen. |
