# Railway Volume Setup - Schritt-für-Schritt Anleitung

## 🎯 Ziel
Persistenter Speicher für SQLite-Datenbank auf Railway, damit Benutzerdaten nicht bei jedem Deployment verloren gehen.

## ⚠️ Wichtiges Grundverständnis

Railway's Dateisystem ist **ephemeral** (flüchtig):
- Bei jedem Deployment wird das Container-Dateisystem neu erstellt
- ALLE Dateien, die während der Laufzeit erstellt werden, gehen beim nächsten Deployment verloren
- **Lösung:** Volume = persistenter Speicher, der zwischen Deployments erhalten bleibt

## 📋 Schritt-für-Schritt Anleitung

### 1. Volume über Railway UI erstellen

**WICHTIG:** Volumes können NICHT in `railway.json` konfiguriert werden - nur über die Web-UI!

1. Öffne dein Railway-Projekt: https://railway.app
2. Klicke auf deinen **Backend-Service** (nicht Database!)
3. Klicke oben auf **"Settings"**
4. Scrolle zu **"Volumes"** Sektion
5. Klicke auf **"+ New Volume"** oder **"Add Volume"**
6. Konfiguriere:
   - **Name:** Beliebiger Name (z.B. `database` oder `data`)
   - **Mount Path:** **WICHTIG!** Der absolute Pfad im Container
     - Für dieses Projekt: `/app/data`
     - Warum `/app`? → Railway deployed Code nach `/app` im Container
     - Warum `/data`? → Unser `DB_PATH` ist `/app/data/vocabulary.db`
7. Klicke **"Add"** oder **"Create"**

### 2. Environment Variable prüfen/setzen

1. Klicke auf **"Variables"** Tab
2. Prüfe ob `DB_PATH` gesetzt ist:
   ```
   DB_PATH=/app/data/vocabulary.db
   ```
3. Falls nicht: Füge die Variable hinzu
4. **Wichtig:** Der Pfad muss mit dem Volume Mount Path übereinstimmen!
   - Volume Mount: `/app/data`
   - Database File: `/app/data/vocabulary.db` ✅

### 3. Code muss Directory erstellen

**Kritisch:** Der Code muss das Verzeichnis erstellen, falls es nicht existiert!

In `backend/src/models/database.js`:
```javascript
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/vocabulary.db');
const dbDir = path.dirname(dbPath);

// Erstelle data Verzeichnis falls nicht vorhanden
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
```

**Warum wichtig?**
- Bei erstem Start existiert das Volume-Verzeichnis, aber Subdirectories nicht
- `mkdirSync` mit `recursive: true` erstellt fehlende Parent-Directories
- Ohne diese Zeilen: `ENOENT: no such file or directory` Fehler

### 4. Deployment

- Railway startet automatisch ein Redeploy nach Volume-Erstellung
- Oder: Manuell über "Deployments" → "Redeploy"

### 5. Verifizieren

Nach erfolgreichem Deployment:
1. Öffne die Railway Logs
2. Suche nach: "Admin user created" oder ähnlichen DB-Logs
3. Registriere einen Test-User
4. Triggere ein neues Deployment (z.B. durch Git Push)
5. **Test:** Der User sollte noch existieren! ✅

## 🔍 Häufige Fehler & Lösungen

### Fehler 1: "ENOENT: no such file or directory"
**Problem:** Volume-Pfad existiert, aber Subdirectory nicht
**Lösung:** `fs.mkdirSync(dbDir, { recursive: true })`

### Fehler 2: Datenbank immer noch zurückgesetzt
**Problem:** Mount Path stimmt nicht mit DB_PATH überein
**Prüfen:**
- Volume Mount Path: `/app/data` 
- DB_PATH: `/app/data/vocabulary.db`
- Code deployed nach: `/app/`

### Fehler 3: Volume-Option nicht sichtbar
**Problem:** Volumes evtl. nur in bestimmten Plänen verfügbar
**Lösung:** PostgreSQL als Alternative nutzen (siehe unten)

### Fehler 4: Schreibrechte fehlen
**Problem:** Volume ist read-only
**Lösung:** Railway Volumes sind standardmäßig read-write - kein chmod nötig!

## 🔄 Alternative: PostgreSQL (empfohlen!)

Falls Volumes nicht verfügbar oder Probleme auftreten:

### Warum PostgreSQL besser ist:
- ✅ Automatisch persistent (kein Volume-Setup nötig)
- ✅ Bessere Performance bei vielen Nutzern
- ✅ Kostenlos auf Railway (Starter Plan)
- ✅ Production-ready
- ✅ Backups inklusive

### Quick Setup:
1. Railway Projekt öffnen
2. **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway erstellt automatisch `DATABASE_URL` Variable
4. Backend-Service nutzt automatisch PostgreSQL wenn `DATABASE_URL` vorhanden

Siehe `POSTGRESQL_SETUP.md` für Details!

## 📊 Vergleich: SQLite + Volume vs PostgreSQL

| Aspekt | SQLite + Volume | PostgreSQL |
|--------|----------------|------------|
| Setup | Manuell (Volume UI) | Automatisch |
| Persistenz | ✅ Mit Volume | ✅ Nativ |
| Performance | Gut (single user) | Besser (multi user) |
| Backups | Manuell | Automatisch |
| Skalierung | Begrenzt | Unbegrenzt |
| **Empfehlung** | Development | Production |

## ✅ Erfolgreicher Setup Check

Dein Volume funktioniert, wenn:
- [x] Volume in Railway UI erstellt (Settings → Volumes)
- [x] Mount Path = `/app/data`
- [x] `DB_PATH` Variable = `/app/data/vocabulary.db`
- [x] Code erstellt Directory mit `fs.mkdirSync`
- [x] Deployment erfolgreich
- [x] User-Daten bleiben nach Redeploy erhalten

## 🚨 Wenn es bei anderem Projekt nicht funktioniert

### Checkliste:
1. **Mount Path prüfen:** Wo wird der Code deployed?
   - Nixpacks: meist `/app`
   - Dockerfile: oft `/usr/src/app`
   - Native Builder: variiert
   
2. **DB_PATH absolut setzen:** Nicht relativ!
   - ❌ `./data/db.sqlite`
   - ✅ `/app/data/db.sqlite`

3. **Directory-Erstellung im Code:**
   ```javascript
   const dir = path.dirname(dbPath);
   if (!fs.existsSync(dir)) {
     fs.mkdirSync(dir, { recursive: true });
   }
   ```

4. **Deployment-Methode:** Nixpacks vs Dockerfile?
   - Bei Dockerfile: `WORKDIR` beachten!

5. **Logs checken:** Railway Logs zeigen genaue Fehlermeldungen
   - Settings → Logs → Filtern nach "error" oder "ENOENT"

## 🎓 Fazit

**Das Volume funktioniert in diesem Projekt, weil:**
1. ✅ Volume Mount Path (`/app/data`) passt zum Deploy Path (`/app`)
2. ✅ Environment Variable `DB_PATH` ist korrekt gesetzt
3. ✅ Code erstellt Directory automatisch
4. ✅ SQLite wird korrekt initialisiert

**Für neue Projekte:**
→ Direkt PostgreSQL nutzen, spart Zeit und ist zuverlässiger!
