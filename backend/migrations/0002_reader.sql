-- Phase 3: Reader & Listening
-- Additive Tabellen für Lesetexte, Segmente (Audio-Sync) und Lesefortschritt.

CREATE TABLE IF NOT EXISTS texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT NOT NULL,
  title TEXT NOT NULL,
  level TEXT,                            -- CEFR A1..C1
  body TEXT NOT NULL,                    -- Volltext
  source TEXT,                           -- curated|import|llm
  topic TEXT,                            -- Interessenbezug
  est_minutes INTEGER,                   -- geschätzte Lesezeit
  metadata TEXT,                         -- JSON als TEXT
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_texts_lang ON texts(lang, level);

-- Segmente für Segment-Sync (Satz-für-Satz-Hervorhebung + Audio)
CREATE TABLE IF NOT EXISTS text_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,                  -- Reihenfolge im Text
  body TEXT NOT NULL,                    -- Satz / Segment
  audio_url TEXT,                        -- optional vorgefertigte TTS-Datei
  FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_text_segments_text ON text_segments(text_id, seq);

-- Lesefortschritt pro Nutzer+Sprache+Text
CREATE TABLE IF NOT EXISTS user_text_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_language_id INTEGER NOT NULL,
  text_id INTEGER NOT NULL,
  coverage REAL,                         -- Anteil bekannter Wörter (0..1)
  completed_at DATETIME,
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_language_id) REFERENCES user_languages(id) ON DELETE CASCADE,
  FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
  UNIQUE(user_language_id, text_id)
);
CREATE INDEX IF NOT EXISTS idx_user_text_progress_lang ON user_text_progress(user_language_id);
