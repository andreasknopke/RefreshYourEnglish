import pg from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRES = !!DATABASE_URL;

let db;

if (USE_POSTGRES) {
  console.log('🐘 Using PostgreSQL database');
  const { Pool } = pg;
  db = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // PostgreSQL query wrapper für SQLite-Kompatibilität
  db.prepare = (sql) => {
    // Konvertiere SQLite-Syntax zu PostgreSQL
    const pgSql = sql
      .replace(/\?/g, (match, offset) => {
        const paramIndex = sql.substring(0, offset).split('?').length;
        return `$${paramIndex}`;
      })
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME/gi, 'TIMESTAMP')
      .replace(/CURRENT_TIMESTAMP/gi, 'CURRENT_TIMESTAMP');
    
    return {
      run: async (...params) => {
        const result = await db.query(pgSql, params);
        return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
      },
      get: async (...params) => {
        const result = await db.query(pgSql, params);
        return result.rows[0];
      },
      all: async (...params) => {
        const result = await db.query(pgSql, params);
        return result.rows;
      }
    };
  };
  
  db.exec = async (sql) => {
    await db.query(sql);
  };
  
} else {
  console.log('💾 Using SQLite database (ephemeral on Railway)');
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/vocabulary.db');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
}

export { USE_POSTGRES };
export default db;
