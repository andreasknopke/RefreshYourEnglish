# Refresh Your English - Backend API

Backend-Server für die Vokabel-Trainings-App mit User-Management und Fortschritt-Tracking.

## Features

- **User Authentication**: Registrierung, Login mit JWT
- **Vocabulary Management**: CRUD-Operationen für Vokabeln
- **Progress Tracking**: Speichert User-Fortschritt pro Vokabel
- **Training Sessions**: Verfolgt Training-Sessions mit detaillierten Statistiken
- **SQLite Database**: Leichtgewichtige Datenbank mit Better-SQLite3

## Installation

```bash
cd backend
npm install
```

## Konfiguration

Erstelle eine `.env` Datei:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=dein_super_geheimer_schluessel
DB_PATH=./data/vocabulary.db
CORS_ORIGIN=http://localhost:5173
```

## Datenbank initialisieren

```bash
# Vokabeln aus vocabulary.txt importieren
npm run db:seed
```

## Server starten

```bash
# Development mit Auto-Reload
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Neuen User registrieren
- `POST /api/auth/login` - User Login

### Vocabulary
- `GET /api/vocabulary` - Alle Vokabeln abrufen
- `GET /api/vocabulary/:id` - Einzelne Vokabel
- `POST /api/vocabulary` - Neue Vokabel erstellen (auth required)
- `PUT /api/vocabulary/:id` - Vokabel bearbeiten (auth required)
- `DELETE /api/vocabulary/:id` - Vokabel löschen (auth required)

### Progress
- `GET /api/progress` - User-Fortschritt abrufen (auth required)
- `POST /api/progress/:vocabularyId` - Fortschritt updaten (auth required)
- `POST /api/progress/session/start` - Training-Session starten (auth required)
- `POST /api/progress/session/:id/complete` - Session abschließen (auth required)
- `GET /api/progress/stats` - User-Statistiken (auth required)

### Health
- `GET /api/health` - Server Health Check

## Datenbank Schema

### Users
- id, username, email, password_hash, created_at, last_login

### Vocabulary
- id, english, german, level, created_at, updated_at

### User Progress
- user_id, vocabulary_id, correct_count, incorrect_count, mastery_level, last_practiced

### Training Sessions
- user_id, mode, score, correct_answers, total_answers, duration_seconds, started_at, completed_at

### Session Details
- session_id, vocabulary_id, was_correct, response_time_ms

## Technologie-Stack

- **Express.js** - Web Framework
- **Better-SQLite3** - Synchrone SQLite Datenbank
- **JWT** - Authentifizierung
- **bcryptjs** - Password Hashing
- **express-validator** - Input Validation
