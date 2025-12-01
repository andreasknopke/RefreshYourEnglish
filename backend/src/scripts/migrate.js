import db from '../models/database.js';

console.log('🔄 Running database migration...');

try {
  // Prüfe ob Users existieren
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`👥 Current user count: ${userCount.count}`);
  
  if (userCount.count > 0) {
    // Normalisiere alle E-Mails zu lowercase
    console.log('📧 Normalizing email addresses...');
    const result = db.prepare('UPDATE users SET email = LOWER(TRIM(email))').run();
    console.log(`✅ Normalized ${result.changes} email addresses`);
  } else {
    console.log('ℹ️  No users found, skipping email normalization');
  }
  
  // Versuche neue Spalten hinzuzufügen (falls sie nicht existieren)
  console.log('🔧 Adding new columns if they don\'t exist...');
  
  const columns = [
    { name: 'email_verified', type: 'INTEGER DEFAULT 0' },
    { name: 'verification_token', type: 'TEXT' },
    { name: 'verification_token_expires', type: 'DATETIME' },
    { name: 'reset_token', type: 'TEXT' },
    { name: 'reset_token_expires', type: 'DATETIME' }
  ];
  
  for (const column of columns) {
    try {
      db.prepare(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`).run();
      console.log(`✅ Added column: ${column.name}`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`ℹ️  Column already exists: ${column.name}`);
      } else {
        throw error;
      }
    }
  }
  
  // Prüfe Vocabulary-Tabelle
  const vocabCount = db.prepare('SELECT COUNT(*) as count FROM vocabulary').get();
  console.log(`📚 Current vocabulary count: ${vocabCount.count}`);
  
  console.log('✅ Migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
