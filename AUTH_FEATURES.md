# Auth Features - Setup und Verwendung

## Neue Funktionen

### 1. E-Mail-Verifikation
- Nach der Registrierung erhalten Nutzer eine Verifikations-E-Mail
- Link ist 24 Stunden gültig
- Nutzer können sich ohne Verifikation einloggen, aber bestimmte Features könnten eingeschränkt werden

### 2. Passwort zurücksetzen
- Nutzer können über "Passwort vergessen?" einen Reset-Link anfordern
- Link ist 1 Stunde gültig
- Nach erfolgreichem Reset wird das Passwort aktualisiert

### 3. Duplicate E-Mail Fix
- E-Mails werden jetzt konsistent normalisiert (lowercase + trim)
- Verhindert doppelte Registrierungen mit derselben E-Mail

## E-Mail-Konfiguration

### Entwicklungsmodus (Standard)
E-Mails werden in der Konsole ausgegeben:
```bash
EMAIL_MODE=console
```

### Produktionsmodus (zukünftig)
Für echten E-Mail-Versand mit SMTP:
```bash
EMAIL_MODE=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

## Migrations-Script ausführen

Für bestehende Datenbanken (lokal):
```bash
cd backend
npm run db:migrate
```

Auf Railway wird die Migration automatisch beim Server-Start ausgeführt, da die Datenbankschema-Änderungen in `database.js` enthalten sind.

## URL-Routen

- **E-Mail-Verifizierung**: `/?token=VERIFICATION_TOKEN` (wird als verify-email erkannt)
- **Passwort-Reset**: `/?reset-password&token=RESET_TOKEN`

## Testing (Entwicklung)

1. **Registrierung testen:**
   - Registriere einen neuen User
   - Check die Backend-Konsole für den Verifikationslink
   - Kopiere den Link und öffne ihn im Browser

2. **Passwort-Reset testen:**
   - Klicke auf "Passwort vergessen?"
   - Gib E-Mail ein
   - Check die Backend-Konsole für den Reset-Link
   - Setze neues Passwort

3. **Duplicate Email testen:**
   - Versuche denselben User zweimal zu registrieren
   - Sollte Fehler "User already exists" ausgeben

## Hinweise

- Tokens werden sicher mit `crypto.randomBytes(32)` generiert
- Abgelaufene Tokens werden beim Versuch zu verwenden erkannt
- Passwörter werden mit bcrypt gehashed (Stärke: 10)
- JWT-Tokens sind 7 Tage gültig
