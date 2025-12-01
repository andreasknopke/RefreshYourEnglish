# Standard-Admin-User Setup

## ✅ Automatische Erstellung

Der Standard-User wird **automatisch** beim Server-Start erstellt:

- **Username:** `andreas`
- **E-Mail:** `andreasknopke@gmx.net`
- **Passwort:** `England1`
- **E-Mail verifiziert:** Ja (automatisch)

## 🔄 Nach jedem Deployment

Die Migration erstellt den User automatisch, wenn er nicht existiert.
Du kannst dich sofort mit den oben genannten Credentials einloggen.

## ⚠️ WICHTIG: Fortschritt speichern

**Problem:** Ohne persistenten Storage wird die Datenbank bei jedem Deployment zurückgesetzt!

**Dein Fortschritt geht verloren, es sei denn du konfigurierst ein Railway Volume:**

### Railway Volume einrichten (ERFORDERLICH für Fortschritt):

1. **Öffne dein Railway-Projekt:**
   - Gehe zu: https://railway.app
   - Wähle dein Projekt aus

2. **Backend-Service öffnen:**
   - Klicke auf den Backend-Service

3. **Volume erstellen:**
   - Gehe zu `Settings` → `Volumes`
   - Klicke auf `+ New Volume`
   - **Name:** `database`
   - **Mount Path:** `/app/data`
   - Klicke auf `Add`

4. **Umgebungsvariable setzen (optional):**
   - Gehe zu `Variables`
   - Füge hinzu: `DB_PATH=/app/data/vocabulary.db`
   - (Standard ist bereits `/app/data/vocabulary.db`)

5. **Redeploy:**
   - Das Deployment wird automatisch neu gestartet
   - Die Datenbank wird nun auf dem Volume gespeichert
   - **Fortschritt bleibt erhalten!** 🎉

### Alternative: PostgreSQL (empfohlen für Produktion)

Für eine dauerhafte Lösung:
1. Füge PostgreSQL-Service in Railway hinzu
2. Konvertiere die App zu PostgreSQL
3. Siehe `RAILWAY_DATABASE_ISSUE.md` für Details

## 🧪 Testing ohne Volume

Ohne Volume-Konfiguration:
- ✅ Admin-User wird bei jedem Start neu erstellt
- ✅ Du kannst dich sofort einloggen
- ❌ Fortschritt geht bei jedem Deployment verloren
- ❌ Neue User werden zurückgesetzt

## 📊 Login-Daten

Nach dem Setup kannst du dich einloggen mit:
```
E-Mail: andreasknopke@gmx.net
Passwort: England1
```

Der User hat automatisch:
- Verifizierten E-Mail-Status
- Zugriff auf alle Features
- Keine Einschränkungen
