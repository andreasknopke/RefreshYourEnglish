/**
 * Bootstrap für Container-Deployments: stellt sicher, dass v2-Schema und
 * Pack-Content in der DB liegen, bevor der Server startet.
 *
 * Führt der Reihe nach aus (alle Schritte idempotent):
 *   1. migrate-v2.js      – v2-Tabellen anlegen
 *   2. seed-vocab.js      – Vokabeln aller Packs in content/packs/
 *   3. seed-reader.js     – Lesetexte
 *   4. seed-listening.js  – Hörtexte
 *
 * Sprachen werden aus content/packs/<code>/manifest.json abgeleitet;
 * per Argument (z. B. `node bootstrap.js en it`) auf eine Auswahl begrenzen.
 * Seed-Skripte überspringen fehlende Dateien mit Warnung – ein unvollständiges
 * Pack bringt den Start nicht zu Fall.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_DIR =
  process.env.PACKS_DIR || path.resolve(__dirname, '../../../content/packs');

function detectLangs() {
  if (!fs.existsSync(PACKS_DIR)) {
    console.warn(`⚠️  PACKS_DIR existiert nicht: ${PACKS_DIR}`);
    return [];
  }
  return fs
    .readdirSync(PACKS_DIR)
    .filter((code) =>
      fs.existsSync(path.join(PACKS_DIR, code, 'manifest.json'))
    );
}

function run(script, args = []) {
  const file = path.join(__dirname, script);
  const res = spawnSync(process.execPath, [file, ...args], {
    stdio: 'inherit',
    env: process.env
  });
  if (res.status !== 0) {
    console.error(`❌ ${script} fehlgeschlagen (Exit ${res.status})`);
    process.exit(res.status ?? 1);
  }
}

const langs = process.argv.slice(2).length > 0 ? process.argv.slice(2) : detectLangs();

console.log(`🚀 Bootstrap: Sprachen [${langs.join(', ') || '—'}], Packs ${PACKS_DIR}`);
run('migrate-v2.js');
if (langs.length > 0) {
  run('seed-vocab.js', langs);
  run('seed-reader.js', langs);
  run('seed-listening.js', langs);
} else {
  console.warn('⚠️  Keine Packs gefunden – nur Migrationen ausgeführt.');
}
console.log('🏁 Bootstrap fertig.');
