# 🚀 Quick Deployment auf Railway

## Schritt 1: Railway Account erstellen
1. Gehe zu [railway.app](https://railway.app)
2. Klicke "Login with GitHub"
3. Autorisiere Railway

## Schritt 2: Neues Projekt erstellen
1. Klicke "New Project"
2. Wähle "Deploy from GitHub repo"
3. Suche und wähle `andreasknopke/RefreshYourEnglish`
4. Railway erstellt automatisch ein Service - das ist fürs **Backend**

## Schritt 3: Backend Service konfigurieren

### Root Directory setzen:
1. Klicke auf den erstellten Service
2. Gehe zu **"Settings"** (oben rechts)
3. Scrolle zu **"Service"** Sektion
4. Bei **"Root Directory"** trage ein: **`backend`**
5. Klicke "Update" oder Railway speichert automatisch

### Environment Variables setzen:
1. Gehe zum Tab **"Variables"** (oben)
2. Klicke "+ New Variable" und füge hinzu:
Klicke auf "Variables" und füge hinzu:

```
PORT=3001
NODE_ENV=production
JWT_SECRET=erzeuge-einen-sicheren-32-zeichen-string-hier
DB_PATH=/app/data/vocabulary.db
```

⚠️ **CORS_ORIGIN** kommt später (nach Frontend-Deployment)

### Deploy starten:
1. Gehe zum Tab **"Deployments"**
2. Railway startet automatisch den ersten Deploy
3. Warte bis Status "✅ Success" ist (kann 2-3 Minuten dauern)
4. **WICHTIG**: Wenn Deploy fehlschlägt, prüfe die **Logs**:
   - Klicke auf das fehlgeschlagene Deployment
   - Schaue dir die Build- und Deploy-Logs an
   - Häufige Fehler: `npm install` schlägt fehl → Root Directory falsch gesetzt
5. Gehe zu **"Settings"** → **"Networking"**
6. Klicke **"Generate Domain"**
7. Railway fragt: **"Enter the port your app is listening on"**
   - Trage ein: **`3001`**
8. Klicke "Save" oder bestätige
9. **Kopiere die Backend-URL** (z.B. `https://backend-production-abc123.up.railway.app`)
10. **Teste die URL** im Browser - du solltest JSON mit API-Info sehen!

## Schritt 4: Frontend Service hinzufügen

### Neuen Service erstellen:
1. Im gleichen Projekt: Klicke **"+ New"** (oben rechts)
2. Wähle **"GitHub Repo"**
3. Wähle wieder `andreasknopke/RefreshYourEnglish`
4. Railway erstellt einen zweiten Service

### Root Directory setzen:
1. Klicke auf den neuen Service
2. Gehe zu **"Settings"**
3. Bei **"Root Directory"** lass es **leer** oder trage **`.`** ein
4. Railway erkennt automatisch Vite

### Environment Variables:
```
VITE_API_URL=https://DEINE-BACKEND-URL.railway.app/api
VITE_LLM_BASE_URL=https://api.mistral.ai/v1
VITE_LLM_API_KEY=dein-api-key
VITE_LLM_MODEL=mistral-large-latest
```

⚠️ **WICHTIG**: 
- Ersetze `DEINE-BACKEND-URL` mit der URL aus Schritt 3!
- URL **muss** mit `https://` beginnen und mit `/api` enden!
- **Beispiel**: `VITE_API_URL=https://refreshyourenglish-production.up.railway.app/api`

### Deploy & Domain:
1. Railway deployed automatisch
2. Warte bis "✅ Success"
3. Gehe zu **"Settings"** → **"Networking"**
4. Klicke **"Generate Domain"**
5. Railway fragt: **"Enter the port your app is listening on"**
   - Trage ein: **`5173`**
6. Klicke "Save" oder bestätige
7. **Kopiere die Frontend-URL** (z.B. `https://frontend-production-xyz789.up.railway.app`)

## Schritt 5: URLs verlinken

### Backend updaten:
1. Gehe zum **Backend Service**
2. Klicke "Variables"
3. Füge hinzu:
   ```
   CORS_ORIGIN=https://DEINE-FRONTEND-URL.railway.app
   ```
4. Service wird automatisch neu deployed

### Testen:
1. Öffne deine Frontend-URL im Browser
2. Registriere einen Account
3. Teste alle Module! 🎉

---

## 🔧 Troubleshooting

### CORS-Fehler: "No 'Access-Control-Allow-Origin' header"
→ **Das Backend blockiert das Frontend**:
   1. Gehe zum **Backend Service** → **Variables**
   2. Füge hinzu: `CORS_ORIGIN=https://deine-frontend-url.railway.app`
   3. **Wichtig**: Muss die **exakte Frontend-URL** sein!
   4. Backend wird automatisch neu deployed
   5. Nach 1-2 Minuten erneut versuchen

### "Unexpected end of JSON input" beim Registrieren
→ **Backend nicht erreichbar** - Prüfe die Backend-URL:
   1. Öffne die Backend-URL direkt im Browser (z.B. `https://dein-backend.railway.app`)
   2. Du solltest JSON sehen mit "name": "RefreshYourEnglish API"
   3. Wenn nicht, prüfe Backend-Logs in Railway
   4. Stelle sicher, dass `VITE_API_URL` im Frontend korrekt ist (mit `/api` am Ende!)

→ **CORS-Fehler** - Prüfe Browser-Console (F12):
   1. Wenn "CORS error" erscheint, fehlt die Frontend-URL in `CORS_ORIGIN`
   2. Backend Variables → `CORS_ORIGIN=https://deine-frontend-url.railway.app`
   3. Backend neu deployen

### "Failed to fetch" Fehler
→ Prüfe `VITE_API_URL` im Frontend (muss `/api` am Ende haben)  
→ Prüfe `CORS_ORIGIN` im Backend (muss Frontend-URL sein)

### Backend startet nicht
→ Prüfe Logs im Railway Dashboard (klicke auf das Deployment)  
→ Stelle sicher, dass alle Environment Variables gesetzt sind
→ Wichtig: `PORT=3001` muss gesetzt sein!
→ **Root Directory muss `backend` sein** in Settings → Service
→ Wenn "module not found" Fehler: Root Directory ist falsch
→ Versuche "Redeploy" nach dem Setzen der Variables

### Backend erreichbar aber "Application failed to respond"
→ Prüfe ob `PORT` Environment Variable gesetzt ist
→ Schaue in die Deployment-Logs ob der Server wirklich startet
→ Sollte sehen: "🚀 Server running on http://localhost:3001"
→ Wenn nicht, prüfe ob `npm start` funktionieren würde

### Database Fehler
→ `DB_PATH=/app/data/vocabulary.db` muss gesetzt sein  
→ Railway erstellt automatisch persistenten Storage

---

## 💰 Kosten

- **Railway Free Tier**: $5/Monat Credit (wird verbraucht)
- **Schätzung**: ~$3-4/Monat für beide Services
- **Tipp**: Idle-Services verbrauchen weniger

---

## 🎯 Fertig!

Deine App läuft jetzt auf:
- **Frontend**: https://deine-app.railway.app
- **Backend API**: https://dein-backend.railway.app

Die PWA kann auf dem Handy installiert werden! 📱
