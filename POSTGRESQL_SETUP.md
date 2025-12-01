# Railway Volume Alternative: PostgreSQL Setup

## ⚠️ Problem: Volumes nicht verfügbar in Railway UI

Railway Volumes sind möglicherweise nur in bestimmten Plänen oder Regionen verfügbar.

## ✅ EMPFOHLENE LÖSUNG: PostgreSQL verwenden

PostgreSQL ist **kostenlos** auf Railway und **automatisch persistent**!

### Schritt-für-Schritt Anleitung:

#### 1. PostgreSQL-Service hinzufügen

1. Gehe zu deinem Railway-Projekt: https://railway.app
2. Klicke auf **"+ New"** (rechts oben)
3. Wähle **"Database"** → **"Add PostgreSQL"**
4. Railway erstellt automatisch:
   - PostgreSQL-Datenbank
   - Umgebungsvariable `DATABASE_URL`

#### 2. DATABASE_URL zum Backend-Service verknüpfen

Railway verbindet die Services automatisch, aber falls nicht:

1. Klicke auf deinen **Backend-Service**
2. Gehe zu **"Variables"**
3. Prüfe ob `DATABASE_URL` vorhanden ist
4. Falls nicht: Klicke auf **"+ New Variable"** → **"Reference"**
5. Wähle PostgreSQL-Service und `DATABASE_URL`

#### 3. Migration ausführen

Die App erkennt automatisch PostgreSQL:

```bash
# Deployment wird automatisch:
# 1. PostgreSQL erkennen (über DATABASE_URL)
# 2. Migration ausführen (migrate-to-postgres.js)
# 3. Vokabeln importieren
# 4. Admin-User anlegen
# 5. Server starten
```

#### 4. Redeploy auslösen

1. **Option A:** Warte auf automatisches Deployment
2. **Option B:** Manuell redeploy über Railway UI

### Was passiert beim ersten Start mit PostgreSQL:

```
🐘 Using PostgreSQL database
📋 Creating PostgreSQL tables...
✅ PostgreSQL tables created
🔧 Creating indexes...
📊 Found 1529 vocabulary items in SQLite
🔄 Migrating vocabulary from SQLite...
✅ Migrated 1529 vocabulary items
👤 Creating admin user...
✅ Admin user created
🎉 Migration to PostgreSQL completed successfully!
```

### Vorteile von PostgreSQL:

- ✅ **Automatisch persistent** - keine Konfiguration nötig
- ✅ **Kostenlos** auf Railway
- ✅ **Skalierbar** - besser für Produktion
- ✅ **Backups** - Railway macht automatische Backups
- ✅ **Schneller** für große Datenmengen

### Nach der Migration:

- ✅ Admin-User bleibt erhalten
- ✅ Fortschritt wird gespeichert
- ✅ Alle Daten bleiben bei jedem Deployment
- ✅ Neue User bleiben persistent

## 🔄 Aktuelle Situation (ohne PostgreSQL):

**SQLite wird verwendet:**
- ⚠️ Daten gehen bei jedem Deployment verloren
- ✅ Admin-User wird automatisch neu erstellt
- ✅ Vokabeln werden automatisch geladen
- ❌ Fortschritt geht verloren

## 📝 Login nach PostgreSQL-Setup:

```
E-Mail: andreasknopke@gmx.net
Passwort: England1
```

Dein Fortschritt bleibt jetzt dauerhaft gespeichert! 🎉

## 🆘 Support

Falls Probleme auftreten:
1. Prüfe Railway-Logs auf Fehler
2. Verifiziere dass `DATABASE_URL` gesetzt ist
3. Prüfe PostgreSQL-Service-Status

## 💡 Tipp

Du kannst die PostgreSQL-Datenbank auch lokal verbinden:
1. Kopiere `DATABASE_URL` aus Railway
2. Setze sie in deiner lokalen `.env`
3. Entwickle gegen die echte Railway-DB
