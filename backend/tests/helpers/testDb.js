/**
 * Test-DB-Helper
 *
 * Muss VOR den Services importiert werden, damit DB_PATH gesetzt ist, bevor
 * database.js öffnet. Erstellt eine Temp-DB, legt v1-Tabellen (über
 * database.js) und v2-Tabellen (über die Migrationen) an.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tmpFile = path.join(os.tmpdir(), `rye-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = tmpFile;

// v1-Tabellen (users, vocabulary, ...) via database.js anlegen
await import('../../src/models/database.js');

// v2-Tabellen über die Migrationen anlegen
const { default: Database } = await import('better-sqlite3');
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const db = new Database(tmpFile);
db.pragma('journal_mode = WAL');
for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
  db.exec(sql);
}
db.close();

export const TEST_DB_PATH = tmpFile;

/**
 * Legt einen Testnutzer + eine Zielsprache an und gibt { userId, userLanguageId } zurück.
 */
export function seedUserAndLanguage({ targetLang = 'it', nativeLang = 'de', startCefr = 'A1' } = {}) {
  const db = new Database(tmpFile);
  const u = db
    .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
    .run(`t_${Math.random().toString(36).slice(2)}`, `t_${Math.random().toString(36).slice(2)}@x.dev`, 'x');
  const userId = u.lastInsertRowid;
  const l = db
    .prepare(
      `INSERT INTO user_languages (user_id, target_lang, native_lang, goal_type, target_cefr, start_cefr)
       VALUES (?, ?, ?, 'alltag', 'B1', ?)`
    )
    .run(userId, targetLang, nativeLang, startCefr);
  db.close();
  return { userId, userLanguageId: l.lastInsertRowid };
}

/**
 * Simuliert echte Aktivität für Sitzungs-Items, damit das Gating sie als
 * erledigt akzeptiert (Test-Helfer, schreibt direkt in attempts/progress).
 */
export function seedActivityForItems(userLanguageId, items) {
  const db = new Database(tmpFile);
  for (const it of items || []) {
    if (it.kind === 'reading' || it.kind === 'listening') {
      db.prepare(
        `INSERT INTO user_text_progress (user_language_id, text_id, completed_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(user_language_id, text_id) DO UPDATE SET completed_at = datetime('now')`
      ).run(userLanguageId, it.id);
    } else if (it.kind === 'grammar') {
      db.prepare(
        `INSERT INTO attempts (user_language_id, exercise_id, response, score)
         VALUES (?, ?, ?, 1)`
      ).run(userLanguageId, `${it.id}#0`, JSON.stringify({ kind: 'grammar', pointId: it.id, chosen: 0 }));
    } else if (it.kind === 'writing') {
      db.prepare(
        `INSERT INTO attempts (user_language_id, exercise_id, response, score)
         VALUES (?, ?, ?, 1)`
      ).run(userLanguageId, `writing:${it.id}`, JSON.stringify({ kind: 'writing', prompt: it.prompt, text: 'test' }));
    } else if (it.kind === 'speaking') {
      db.prepare(
        `INSERT INTO attempts (user_language_id, exercise_id, response, score)
         VALUES (?, ?, ?, 1)`
      ).run(userLanguageId, `dialog:${it.id}`, JSON.stringify({ kind: 'dialog', scenarioId: it.id, turns: 1 }));
    }
  }
  db.close();
}
