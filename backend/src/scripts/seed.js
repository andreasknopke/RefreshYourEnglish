import db from '../models/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths for the vocabulary file
const possiblePaths = [
  path.join(__dirname, '../../vocabulary.txt'),  // Backend root
  path.join(__dirname, '../../../public/vocabulary.txt'),
  path.join(__dirname, '../../public/vocabulary.txt'),
  path.join(process.cwd(), 'vocabulary.txt'),
  path.join(process.cwd(), 'public/vocabulary.txt'),
  path.join(process.cwd(), '../public/vocabulary.txt'),
];

let vocabFilePath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    vocabFilePath = p;
    console.log(`📁 Found vocabulary file at: ${p}`);
    break;
  }
}

if (!vocabFilePath) {
  console.error('❌ Could not find vocabulary.txt file. Tried:');
  possiblePaths.forEach(p => console.error(`   - ${p}`));
  process.exit(1);
}

try {
  const content = fs.readFileSync(vocabFilePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
  
  console.log(`📚 Importing ${lines.length} vocabulary items...`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const line of lines) {
    const parts = line.split(';').map(part => part.trim());
    
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const english = parts[0];
      const german = parts[1];
      
      // Check if already exists (case-insensitive)
      const existing = db.prepare('SELECT id FROM vocabulary WHERE LOWER(english) = LOWER(?) AND LOWER(german) = LOWER(?)').get(english, german);
      
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
