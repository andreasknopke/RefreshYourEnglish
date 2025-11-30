import db from '../models/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lade Vokabeln aus der vocabulary.txt
const vocabFilePath = path.join(__dirname, '../../../public/vocabulary.txt');

try {
  const content = fs.readFileSync(vocabFilePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  console.log(`📚 Importing ${lines.length} vocabulary items...`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const line of lines) {
    const parts = line.split(';').map(part => part.trim());
    
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const english = parts[0];
      const german = parts[1];
      
      // Check if already exists
      const existing = db.prepare('SELECT id FROM vocabulary WHERE english = ? AND german = ?').get(english, german);
      
      if (!existing) {
        db.prepare('INSERT INTO vocabulary (english, german, level) VALUES (?, ?, ?)').run(english, german, 'B2');
        imported++;
      } else {
        skipped++;
      }
    }
  }
  
  console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped`);
  
  const total = db.prepare('SELECT COUNT(*) as count FROM vocabulary').get();
  console.log(`📊 Total vocabulary in database: ${total.count}`);
  
} catch (error) {
  console.error('❌ Error importing vocabulary:', error);
  process.exit(1);
}

process.exit(0);
