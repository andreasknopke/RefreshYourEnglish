/**
 * Backfill: legt für jeden Bestandsnutzer eine Zielsprache Englisch (Muttersprache
 * Deutsch) an, damit der v1-Fortschritt im neuen Modell sichtbar bleibt.
 *
 * Idempotent: überspringt Nutzer, die bereits eine user_language haben.
 *
 * Nutzung: node src/scripts/backfill-user-languages.js
 */

import db from '../models/database.js';
import { createUserLanguage } from '../services/userLanguageService.js';

function main() {
  const users = db.prepare('SELECT id, username FROM users').all();
  console.log(`🔁 Backfill für ${users.length} Nutzer …`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const existing = db
      .prepare('SELECT id FROM user_languages WHERE user_id = ?')
      .get(user.id);
    if (existing) {
      skipped += 1;
      continue;
    }

    createUserLanguage(user.id, {
      targetLang: 'en',
      nativeLang: 'de',
      goalType: 'alltag',
      targetCefr: 'B2',
      dailyMinutes: 30,
      interests: []
    });
    created += 1;
  }

  console.log(`✅ Backfill fertig: ${created} angelegt, ${skipped} übersprungen.`);
}

main();
