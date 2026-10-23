-- Phase 9: Leseverständnis-Quiz + Textübersetzungen
-- LLM-generierte Kontrollfragen pro Lesetext (gecacht) und Übersetzungen
-- der Textkörper in die Muttersprache des Lernenden.

CREATE TABLE IF NOT EXISTS text_quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_id INTEGER NOT NULL,
  questions TEXT NOT NULL,              -- JSON: [{q, options:[..], answer, hint?}]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
  UNIQUE(text_id)
);

-- Versuch eines Nutzers an einem Text-Quiz (für Session-Gating)
CREATE TABLE IF NOT EXISTS user_text_quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_language_id INTEGER NOT NULL,
  text_id INTEGER NOT NULL,
  score REAL,                           -- 0..1 Anteil richtiger Antworten
  passed INTEGER DEFAULT 0,
  answers TEXT,                         -- JSON: [{q, chosen, correct}]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_language_id) REFERENCES user_languages(id) ON DELETE CASCADE,
  FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
  UNIQUE(user_language_id, text_id)
);
CREATE INDEX IF NOT EXISTS idx_user_text_quizzes_lang ON user_text_quizzes(user_language_id);

-- Übersetzungen (Textkörper -> Muttersprache), gecacht pro Text+Sprachpaar
CREATE TABLE IF NOT EXISTS text_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_id INTEGER NOT NULL,
  native_lang TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
  UNIQUE(text_id, native_lang)
);
