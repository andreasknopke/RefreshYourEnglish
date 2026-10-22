/**
 * Entfernt die Alt-Tabellen der v1-App (Übersetzungs-/Flashcard-/Gamification-
 * Welt). Der Inhalt ist überflüssig: Der Englisch-Wortschatz wurde in den
 * en-Pack portiert (content/packs/en/vocab/sources/v1_english.csv), Lern-
 * fortschritt lebt in den v2-Tabellen (user_vocab, attempts, user_skill_state).
 *
 * Bewusst KEIN automatischer Migrationsschritt – erst nach bestätigtem Backup
 * ausführen:
 *   node src/scripts/drop-v1-tables.js --yes
 */
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/vocabulary.db');

const V1_TABLES = [
  'vocabulary',
  'user_progress',
  'flashcard_deck',
  'action_mode_reviews',
  'daily_activity',
  'daily_sessions',
  'session_details',
  'training_sessions',
  'user_trophies'
];

if (!process.argv.includes('--yes')) {
  console.log('Trockenlauf – betroffene Tabellen:');
  for (const t of V1_TABLES) console.log('  -', t);
  console.log('\nMit --yes ausführen (vorher Backup erstellen!).');
  process.exit(0);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');
for (const t of V1_TABLES) {
  db.prepare(`DROP TABLE IF EXISTS ${t}`).run();
  console.log('🗑️  entfernt:', t);
}
db.pragma('foreign_keys = ON');
console.log('✅ v1-Tabellen entfernt.');
