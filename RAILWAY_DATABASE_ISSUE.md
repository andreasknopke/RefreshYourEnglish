# Railway Deployment - Datenbank-Persistenz Problem

## ⚠️ Problem: SQLite-Datenbank wird bei jedem Deployment zurückgesetzt

Railway's Dateisystem ist **ephemeral** (flüchtig). Das bedeutet:
- Bei jedem Deployment wird das Dateisystem neu erstellt
- Die SQLite-Datenbank (`data/vocabulary.db`) geht verloren
- Alle registrierten User und Progress-Daten werden gelöscht

## 🔧 Lösungen

### Option 1: PostgreSQL verwenden (EMPFOHLEN für Produktion)

1. **PostgreSQL-Service auf Railway hinzufügen:**
   - Gehe zu deinem Railway-Projekt
   - Klicke auf "New Service" → "Database" → "Add PostgreSQL"
   - Railway erstellt automatisch eine `DATABASE_URL` Umgebungsvariable

2. **PostgreSQL-Adapter installieren:**
   ```bash
   cd backend
   npm install pg
   ```

3. **Datenbank-Code anpassen:**
   - Ersetze `better-sqlite3` durch einen PostgreSQL-Client
   - Alternative: Verwende ein ORM wie Prisma oder TypeORM

### Option 2: Railway Volume verwenden

Railway unterstützt Volumes über die UI (nicht railway.json):

1. **Volume erstellen:**
   - Gehe zu deinem Backend-Service auf Railway
   - Klicke auf "Settings" → "Volumes"
   - Klicke auf "New Volume"
   - Name: `database`
   - Mount Path: `/data`

2. **Umgebungsvariable setzen:**
   - Gehe zu "Variables"
   - Füge hinzu: `DB_PATH=/data/vocabulary.db`

### Option 3: Externe Datenbank (z.B. Supabase, PlanetScale)

1. Erstelle eine kostenlose PostgreSQL-Datenbank bei:
   - [Supabase](https://supabase.com) (PostgreSQL)
   - [PlanetScale](https://planetscale.com) (MySQL)
   - [Neon](https://neon.tech) (PostgreSQL)

2. Verwende die Connection-URL in Railway als `DATABASE_URL`

## 🚀 Temporäre Lösung für Testing

Falls du nur testen möchtest und Datenverlust okay ist:

Die aktuelle Konfiguration funktioniert, aber:
- **User-Daten gehen bei jedem Deployment verloren**
- **Vokabeln werden automatisch neu geladen** (via seed.js)
- Du musst dich nach jedem Deployment **neu registrieren**

## 📝 Aktueller Status

Die App ist voll funktionsfähig, aber:
- ✅ Vokabeln werden automatisch geladen
- ✅ Registrierung funktioniert
- ✅ Login funktioniert
- ❌ Daten bleiben NICHT erhalten zwischen Deployments

## 🎯 Empfehlung

Für eine produktive Anwendung: **Verwende PostgreSQL** (Option 1)

Für lokale Entwicklung und Testing: **Aktuelle SQLite-Lösung ist OK**
