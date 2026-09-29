# Railway Deployment Guide - Refresh Your English

## 🚀 Deployment Schritte

### 1. Backend deployen

1. Gehe zu [Railway.app](https://railway.app) und logge dich ein
2. Klicke auf "New Project" → "Deploy from GitHub repo"
3. Wähle das Repository `andreasknopke/RefreshYourEnglish`
4. Railway erkennt automatisch Node.js
5. **Root Directory setzen**: `backend`
6. Setze folgende **Environment Variables**:

```bash
PORT=3001
NODE_ENV=production
JWT_SECRET=dein-super-sicherer-jwt-secret-min-32-zeichen
CORS_ORIGIN=https://deine-frontend-url.railway.app
DB_PATH=/app/data/vocabulary.db
```

7. Deploy starten! Railway deployed automatisch

### 2. Frontend deployen

1. Erstelle ein neues Railway Service im gleichen Projekt
2. Wähle wieder das Repository
3. **Root Directory**: `.` (Wurzel)
4. Setze folgende **Environment Variables**:

```bash
VITE_API_URL=https://dein-backend-url.railway.app/api
VITE_LLM_BASE_URL=https://api.mistral.ai/v1
VITE_LLM_API_KEY=dein-api-key
VITE_LLM_MODEL=mistral-large-latest
```

5. Deploy starten!

### 3. URLs verlinken

Nach dem ersten Deployment:

1. **Backend**: Kopiere die Railway-URL (z.B. `https://backend-production-abc123.up.railway.app`)
2. **Frontend**: Gehe zu den Environment Variables und setze:
   - `VITE_API_URL=https://backend-production-abc123.up.railway.app/api`
3. **Backend**: Gehe zu den Environment Variables und setze:
   - `CORS_ORIGIN=https://frontend-production-xyz789.up.railway.app`
4. Beide Services neu deployen (Redeploy)

---

## 🔐 Wichtige Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=production
JWT_SECRET=mindestens-32-zeichen-langer-zufälliger-string
CORS_ORIGIN=https://your-frontend.railway.app
DB_PATH=/app/data/vocabulary.db
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_LLM_BASE_URL=https://api.mistral.ai/v1
VITE_LLM_API_KEY=dein-api-key
VITE_LLM_MODEL=mistral-large-latest
```

---

## 📦 Railway Features

- ✅ **Automatisches Deployment** bei Git Push
- ✅ **HTTPS inklusive**
- ✅ **Logs & Monitoring**
- ✅ **Kostenlos**: $5/Monat Credit (reicht für kleine Apps)
- ✅ **Persistent Storage** für SQLite Database

---

## 🔧 Troubleshooting

### Backend startet nicht
- Prüfe Logs: "View Logs" in Railway
- Stelle sicher, dass `PORT` Variable gesetzt ist
- Prüfe ob `npm start` funktioniert

### Frontend kann Backend nicht erreichen
- Prüfe `VITE_API_URL` - muss mit `/api` enden
- Prüfe `CORS_ORIGIN` im Backend - muss Frontend-URL enthalten
- Beide Services neu deployen nach URL-Änderungen

### Database Fehler
- `DB_PATH=/app/data/vocabulary.db` muss gesetzt sein
- Railway erstellt automatisch persistenten Storage

---

## 🎯 Alternative: Vercel (Frontend) + Railway (Backend)

Falls du das Frontend lieber auf Vercel hosten möchtest:

### Vercel:
1. Importiere GitHub Repo
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variables wie oben

### Railway (nur Backend):
- Wie oben beschrieben

---

## 📱 Nach dem Deployment

Die App ist dann verfügbar unter:
- **Frontend**: `https://your-app.railway.app` oder `your-app.vercel.app`
- **Backend**: `https://your-backend.railway.app`

Die PWA kann direkt auf dem Handy installiert werden! 🎉
