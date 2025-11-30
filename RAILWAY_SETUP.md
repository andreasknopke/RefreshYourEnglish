# 🚀 Quick Deployment auf Railway

## Schritt 1: Railway Account erstellen
1. Gehe zu [railway.app](https://railway.app)
2. Klicke "Login with GitHub"
3. Autorisiere Railway

## Schritt 2: Neues Projekt erstellen
1. Klicke "New Project"
2. Wähle "Deploy from GitHub repo"
3. Suche und wähle `andreasknopke/RefreshYourEnglish`

## Schritt 3: Backend Service einrichten

### Service erstellen:
1. Railway fragt nach dem Root Directory
2. Setze Root Directory auf: **`backend`**
3. Railway erkennt automatisch Node.js

### Environment Variables setzen:
Klicke auf "Variables" und füge hinzu:

```
PORT=3001
NODE_ENV=production
JWT_SECRET=erzeuge-einen-sicheren-32-zeichen-string-hier
DB_PATH=/app/data/vocabulary.db
```

⚠️ **CORS_ORIGIN** kommt später (nach Frontend-Deployment)

### Deploy:
- Railway deployed automatisch
- Warte bis Status "✅ Deployed" ist
- **Kopiere die Backend-URL** (z.B. `https://web-production-abc123.up.railway.app`)

## Schritt 4: Frontend Service einrichten

### Neuen Service im gleichen Projekt:
1. Klicke "+ New" → "GitHub Repo"
2. Wähle wieder `andreasknopke/RefreshYourEnglish`
3. Setze Root Directory: **`.`** (Root/leer lassen)

### Environment Variables:
```
VITE_API_URL=https://DEINE-BACKEND-URL.railway.app/api
VITE_OPENAI_API_KEY=sk-proj-dein-openai-key
```

⚠️ Ersetze `DEINE-BACKEND-URL` mit der URL aus Schritt 3!

### Deploy:
- Railway deployed automatisch
- **Kopiere die Frontend-URL** (z.B. `https://web-production-xyz789.up.railway.app`)

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

### "Failed to fetch" Fehler
→ Prüfe `VITE_API_URL` im Frontend (muss `/api` am Ende haben)  
→ Prüfe `CORS_ORIGIN` im Backend (muss Frontend-URL sein)

### Backend startet nicht
→ Prüfe Logs im Railway Dashboard  
→ Stelle sicher, dass alle Environment Variables gesetzt sind

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
