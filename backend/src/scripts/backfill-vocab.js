/**
 * Backfill: überführt v1-Vokabeln (vocabulary) und deren Lernfortschritt
 * (flashcard_deck, user_progress) in das v2-Modell (vocab_items, vocab_senses,
 * user_vocab) – für Nutzer, deren Zielsprache Englisch ist.
 *
 * Idempotent: Karten, die bereits existieren, werden nicht dupliziert.
 *
 * Nutzung: node src/scripts/backfill-vocab.js
 */

import db from '../models/database.js';
import { upsertVocabItem, addSense, addCard } from '../services/vocabRepository.js';

/**
 * Wandelt ein SM-2-Interval (Tage) grob in einen FSRS-Review-Zustand um, damit
 * der Alt-Fortschritt sichtbar und fällig bleibt.
 */
function mapFlashcardToCard(intervalDays, repetitions, easeFactor) {
  const interval = Number(intervalDays) || 0;
  const reps = Number(repetitions) || 0;
  if (reps === 0 || interval === 0) {
    return { state: 'new', stability: 0, difficulty: 0 };
  }
  // Stabilität ≈ Intervall (bei 90 % Retention ist S ≈ Intervall/FACTOR-Kurve);
  // pragmatische Näherung: S ~ interval / 0.9
  const stability = Math.max(0.5, interval / 0.9);
  // Difficulty aus Ease-Faktor ableiten (EF 2.5 → ~5, EF 1.3 → ~9, EF 3+ → ~3)
  const ef = Number(easeFactor) || 2.5;
  const difficulty = Math.min(10, Math.max(1, 13 - ef * 2.6));
  return { state: 'review', stability, difficulty };
}

function toSqliteDate(dateStr) {
  if (!dateStr) return null;
  // Akzeptiert 'YYYY-MM-DD' oder ISO; normalisiert auf SQLite DATETIME (UTC)
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function main() {
  // Alle englischen Zielsprachen (aus Phase-1-Backfill)
  const userLangs = db
    .prepare("SELECT id, user_id FROM user_languages WHERE target_lang = 'en'")
    .all();

  console.log(`🔁 Vokabel-Backfill für ${userLangs.length} en-Sprachprofile …`);

  let cards = 0;
  let skipped = 0;
  let items = 0;

  for (const ul of userLangs) {
    // v1-Fortschritt dieses Nutzers: Flashcards + Progress
    const flashcards = db
      .prepare('SELECT * FROM flashcard_deck WHERE user_id = ?')
      .all(ul.user_id);
    const progress = db
      .prepare('SELECT * FROM user_progress WHERE user_id = ?')
      .all(ul.user_id);

    // Vereinige die Vokabel-IDs, die dieser Nutzer kennt
    const vocabIds = new Set([
      ...flashcards.map((f) => f.vocabulary_id),
      ...progress.map((p) => p.vocabulary_id)
    ]);

    const flashByVocab = new Map(flashcards.map((f) => [f.vocabulary_id, f]));
    const progByVocab = new Map(progress.map((p) => [p.vocabulary_id, p]));

    for (const vocabId of vocabIds) {
      const v1 = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(vocabId);
      if (!v1) continue;

      const item = upsertVocabItem({
        lang: 'en',
        lemma: v1.english,
        level: v1.level || null,
        metadata: { source: 'v1', v1_id: v1.id }
      });
      items += 1;

      if (v1.german) {
        addSense({
          vocabId: item.id,
          nativeLang: 'de',
          translation: v1.german
        });
      }

      const { userVocabId, created } = addCard(ul.id, item.id, 'v1');
      if (!created) {
        skipped += 1;
        continue;
      }

      // Fortschritt übernehmen, falls vorhanden
      const fc = flashByVocab.get(vocabId);
      const pr = progByVocab.get(vocabId);
      if (fc) {
        const mapped = mapFlashcardToCard(fc.interval_days, fc.repetitions, fc.ease_factor);
        db.prepare(
          `UPDATE user_vocab
             SET state = ?, stability = ?, difficulty = ?, reps = ?, due_at = ?, last_review = ?
           WHERE id = ?`
        ).run(
          mapped.state,
          mapped.stability,
          mapped.difficulty,
          fc.repetitions || 0,
          toSqliteDate(fc.next_review_date),
          toSqliteDate(fc.last_reviewed_date),
          userVocabId
        );
      } else if (pr) {
        // Nur Progress ohne Flashcard → grob als Review-Karte mit niedriger Stabilität
        const correct = pr.correct_count || 0;
        const stability = Math.max(0.5, correct * 0.5);
        db.prepare(
          `UPDATE user_vocab
             SET state = ?, stability = ?, difficulty = ?, reps = ?, due_at = ?, last_review = ?
           WHERE id = ?`
        ).run(
          'review',
          stability,
          5,
          correct,
          toSqliteDate(pr.last_practiced),
          toSqliteDate(pr.last_practiced),
          userVocabId
        );
      }
      cards += 1;
    }
  }

  console.log(
    `✅ Vokabel-Backfill fertig: ${items} Items, ${cards} Karten übernommen, ${skipped} übersprungen.`
  );
}

main();
