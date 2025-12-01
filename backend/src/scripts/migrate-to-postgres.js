import pg from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not found, skipping PostgreSQL migration');
  console.log('💡 Using SQLite (data will be ephemeral on Railway)');
  console.log('📝 To use persistent PostgreSQL:');
  console.log('   1. Add PostgreSQL service in Railway');
  console.log('   2. DATABASE_URL will be set automatically');
  console.log('   3. Redeploy the app');
  process.exit(0);
}

console.log('🔄 Migrating SQLite data to PostgreSQL...');

const { Pool } = pg;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

try {
  // Create PostgreSQL tables
  console.log('📋 Creating PostgreSQL tables...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      verification_token_expires TIMESTAMP,
      reset_token TEXT,
      reset_token_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id SERIAL PRIMARY KEY,
      english TEXT NOT NULL,
      german TEXT NOT NULL,
      level TEXT DEFAULT 'B2',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      last_practiced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mastery_level INTEGER DEFAULT 0,
      UNIQUE(user_id, vocabulary_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      total_answers INTEGER DEFAULT 0,
      duration_seconds INTEGER,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_details (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
      vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE SET NULL,
      was_correct BOOLEAN NOT NULL,
      response_time_ms INTEGER
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS flashcard_deck (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review_date DATE NOT NULL,
      last_reviewed_date DATE,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, vocabulary_id)
    )
  `);

  console.log('✅ PostgreSQL tables created');

  // Create indexes
  console.log('🔧 Creating indexes...');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_user_progress_vocab ON user_progress(vocabulary_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_user ON training_sessions(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_session_details_session ON session_details(session_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_flashcard_user ON flashcard_deck(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_flashcard_review ON flashcard_deck(user_id, next_review_date)');

  // Check if SQLite database exists
  const sqlitePath = path.join(__dirname, '../../data/vocabulary.db');
  let hasSqliteData = false;
  
  try {
    const sqlite = new Database(sqlitePath, { readonly: true });
    const count = sqlite.prepare('SELECT COUNT(*) as count FROM vocabulary').get();
    hasSqliteData = count.count > 0;
    sqlite.close();
    console.log(`📊 Found ${count.count} vocabulary items in SQLite`);
  } catch (error) {
    console.log('ℹ️  No SQLite database found, will create fresh data');
  }

  // Migrate vocabulary data if SQLite exists
  if (hasSqliteData) {
    console.log('🔄 Migrating vocabulary from SQLite...');
    const sqlite = new Database(sqlitePath, { readonly: true });
    const vocab = sqlite.prepare('SELECT * FROM vocabulary').all();
    
    for (const v of vocab) {
      await pool.query(
        'INSERT INTO vocabulary (english, german, level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [v.english, v.german, v.level]
      );
    }
    sqlite.close();
    console.log(`✅ Migrated ${vocab.length} vocabulary items`);
  }

  // Create admin user
  console.log('👤 Creating admin user...');
  const adminEmail = 'andreasknopke@gmx.net';
  const existingAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  
  if (existingAdmin.rows.length === 0) {
    const passwordHash = await bcrypt.hash('England1', 10);
    await pool.query(
      'INSERT INTO users (username, email, password_hash, email_verified) VALUES ($1, $2, $3, 1)',
      ['andreas', adminEmail, passwordHash]
    );
    console.log('✅ Admin user created');
  } else {
    console.log('✅ Admin user already exists');
  }

  console.log('🎉 Migration to PostgreSQL completed successfully!');
  await pool.end();
  process.exit(0);

} catch (error) {
  console.error('❌ Migration failed:', error);
  await pool.end();
  process.exit(1);
}
