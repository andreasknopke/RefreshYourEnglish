import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/vocabulary.db');
const dbDir = path.dirname(dbPath);

// Erstelle data Verzeichnis falls nicht vorhanden
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Erstelle Tabellen
const createTables = () => {
  // Users Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      verification_token_expires DATETIME,
      reset_token TEXT,
      reset_token_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Vocabulary Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      english TEXT NOT NULL,
      german TEXT NOT NULL,
      level TEXT DEFAULT 'B2',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User Progress Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vocabulary_id INTEGER NOT NULL,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      last_practiced DATETIME DEFAULT CURRENT_TIMESTAMP,
      mastery_level INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE,
      UNIQUE(user_id, vocabulary_id)
    )
  `);

  // Training Sessions Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      mode TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      total_answers INTEGER DEFAULT 0,
      duration_seconds INTEGER,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Session Details Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      vocabulary_id INTEGER NOT NULL,
      was_correct BOOLEAN NOT NULL,
      response_time_ms INTEGER,
      FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE SET NULL
    )
  `);

  // Flashcard Learning System (Spaced Repetition)
  db.exec(`
    CREATE TABLE IF NOT EXISTS flashcard_deck (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vocabulary_id INTEGER NOT NULL,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review_date DATE NOT NULL,
      last_reviewed_date DATE,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE,
      UNIQUE(user_id, vocabulary_id)
    )
  `);

  // Indizes für Performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_progress_vocab ON user_progress(vocabulary_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON training_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_session_details_session ON session_details(session_id);
    CREATE INDEX IF NOT EXISTS idx_flashcard_user ON flashcard_deck(user_id);
    CREATE INDEX IF NOT EXISTS idx_flashcard_review ON flashcard_deck(user_id, next_review_date);
  `);

  // Gamification: Daily Activity Tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      seconds_practiced INTEGER DEFAULT 0,
      exercises_completed INTEGER DEFAULT 0,
      goal_achieved BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    )
  `);

  // Migration: Wenn alte Spalte minutes_practiced existiert, migriere zu seconds_practiced
  try {
    const tableInfo = db.prepare("PRAGMA table_info(daily_activity)").all();
    const hasMinutesColumn = tableInfo.some(col => col.name === 'minutes_practiced');
    const hasSecondsColumn = tableInfo.some(col => col.name === 'seconds_practiced');
    
    if (hasMinutesColumn && !hasSecondsColumn) {
      console.log('🔄 Migrating daily_activity from minutes to seconds...');
      db.exec(`
        ALTER TABLE daily_activity ADD COLUMN seconds_practiced INTEGER DEFAULT 0;
        UPDATE daily_activity SET seconds_practiced = minutes_practiced * 60;
      `);
      console.log('✅ Migration completed');
    } else if (hasMinutesColumn && hasSecondsColumn) {
      console.log('🔄 Syncing seconds_practiced from minutes_practiced...');
      db.exec(`UPDATE daily_activity SET seconds_practiced = minutes_practiced * 60 WHERE seconds_practiced = 0;`);
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Gamification: Trophies/Achievements
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_trophies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      trophy_type TEXT NOT NULL,
      earned_date DATE NOT NULL,
      streak_days INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Index für Daily Activity
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_trophies_user ON user_trophies(user_id);
  `);

  console.log('✅ Database tables created successfully');
};

createTables();

export default db;
