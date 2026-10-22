/**
 * Migration Runner
 *
 * Führt SQL-Migrationen aus backend/migrations/ in alphabetischer Reihenfolge
 * aus und protokolliert sie in der Tabelle _migrations.
 *
 * Nutzung:
 *   node src/scripts/migrate-v2.js            (SQLite oder PG je nach DATABASE_URL)
 *
 * Prinzip: additiv, idempotent-safe (Migrationen selbst nutzen IF NOT EXISTS),
 * jede Migration läuft in einer Transaktion (SQLite) bzw. sequenziell (PG).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRES = !!DATABASE_URL;

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function runSqlite() {
  const { default: Database } = await import('better-sqlite3');
  const dbPath =
    process.env.DB_PATH || path.resolve(__dirname, '../../data/vocabulary.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((r) => r.name)
  );

  for (const file of listMigrationFiles()) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`⏳ Migration: ${file}`);
    const run = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    });
    run();
    console.log(`✅ Migration abgeschlossen: ${file}`);
  }

  db.close();
}

async function runPostgres() {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const { rows } = await pool.query('SELECT name FROM _migrations');
  const applied = new Set(rows.map((r) => r.name));

  for (const file of listMigrationFiles()) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`⏳ Migration: ${file}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✅ Migration abgeschlossen: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration fehlgeschlagen (${file}):`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

async function main() {
  console.log(
    USE_POSTGRES
      ? '🐘 Migrationen gegen PostgreSQL'
      : '💾 Migrationen gegen SQLite'
  );

  if (USE_POSTGRES) {
    await runPostgres();
  } else {
    await runSqlite();
  }

  console.log('🏁 Alle Migrationen angewendet.');
}

main().catch((err) => {
  console.error('❌ Migrationen fehlgeschlagen:', err);
  process.exit(1);
});
