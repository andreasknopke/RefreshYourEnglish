-- Schema v2: Kern-Tabellen für die sprachneutrale Lern-Engine
-- Phase 0: additiv, ändert nichts an bestehenden v1-Tabellen.
-- Dialekt: SQLite (aktuelle Runtime). PG-Variante folgt, wenn PG CI-Ziel wird.
-- JSON-Felder werden als TEXT gespeichert (portabel über SQLite/PG).

-- Zielsprache pro Nutzer (Profil); mehrere parallele Sprachen möglich
CREATE TABLE IF NOT EXISTS user_languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_lang TEXT NOT NULL,
  native_lang TEXT NOT NULL DEFAULT 'de',
  goal_type TEXT,                       -- reisen|alltag|arbeit|studium|pruefung|familie
  target_cefr TEXT,                     -- A2|B1|B2|C1
  start_cefr TEXT,                      -- Einstufung
  daily_minutes INTEGER DEFAULT 30,
  deadline TEXT,                        -- ISO-Datum oder NULL
  interests TEXT,                       -- JSON-Array als TEXT
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_languages_user ON user_languages(user_id, active);
CREATE INDEX IF NOT EXISTS idx_user_languages_lang ON user_languages(user_id, target_lang);

-- Skill-Modell pro Sprache und Fähigkeit
CREATE TABLE IF NOT EXISTS user_skill_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_language_id INTEGER NOT NULL,
  skill TEXT NOT NULL,                  -- reading|listening|speaking|writing|grammar|vocabulary
  score REAL DEFAULT 0,
  cefr_band TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_language_id) REFERENCES user_languages(id) ON DELETE CASCADE,
  UNIQUE(user_language_id, skill)
);

-- Vokabel-Lemma in der Zielsprache (sprachneutral, ersetzt vocabulary.english)
CREATE TABLE IF NOT EXISTS vocab_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT NOT NULL,
  lemma TEXT NOT NULL,
  pos TEXT,                             -- part of speech
  gender TEXT,                          -- m|f|n|NULL
  ipa TEXT,
  frequency_rank INTEGER,
  level TEXT,
  audio_url TEXT,
  metadata TEXT,                        -- JSON als TEXT
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vocab_items_lang ON vocab_items(lang, level);
CREATE INDEX IF NOT EXISTS idx_vocab_items_freq ON vocab_items(lang, frequency_rank);

-- Bedeutung in der Muttersprache (ersetzt vocabulary.german)
CREATE TABLE IF NOT EXISTS vocab_senses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocab_id INTEGER NOT NULL,
  native_lang TEXT NOT NULL,
  translation TEXT NOT NULL,
  example TEXT,
  notes TEXT,
  FOREIGN KEY (vocab_id) REFERENCES vocab_items(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vocab_senses_vocab ON vocab_senses(vocab_id);

-- FSRS-basierter Karten-Zustand pro Nutzer+Sprache+Vokabel
CREATE TABLE IF NOT EXISTS user_vocab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_language_id INTEGER NOT NULL,
  vocab_id INTEGER NOT NULL,
  state TEXT DEFAULT 'new',             -- new|learning|review|relearning
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0,
  due_at DATETIME,
  last_review DATETIME,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  source TEXT,                          -- reader|mining|curriculum|manual
  suspended INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_language_id) REFERENCES user_languages(id) ON DELETE CASCADE,
  FOREIGN KEY (vocab_id) REFERENCES vocab_items(id) ON DELETE CASCADE,
  UNIQUE(user_language_id, vocab_id)
);
CREATE INDEX IF NOT EXISTS idx_user_vocab_due ON user_vocab(user_language_id, due_at);

-- Review-Log für FSRS-Historie und Analytics
CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_vocab_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,              -- 1..4 (again|hard|good|easy)
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  elapsed_ms INTEGER,
  prev_stability REAL,
  next_stability REAL,
  prev_difficulty REAL,
  next_difficulty REAL,
  FOREIGN KEY (user_vocab_id) REFERENCES user_vocab(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_review_logs_vocab ON review_logs(user_vocab_id);

-- Antworten auf Übungen (Schreiben, Grammatik, etc.)
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_language_id INTEGER NOT NULL,
  exercise_id INTEGER,
  response TEXT,                        -- JSON als TEXT
  score REAL,
  error_tags TEXT,                      -- JSON-Array als TEXT
  duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_language_id) REFERENCES user_languages(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attempts_userlang ON attempts(user_language_id);

-- Fehlerprofil pro Sprache und Kategorie
CREATE TABLE IF NOT EXISTS error_profile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_language_id INTEGER NOT NULL,
  category TEXT NOT NULL,               -- agreement|tense|preposition|gender|spelling|word_order|lexis
  count INTEGER DEFAULT 0,
  last_seen DATETIME,
  examples TEXT,                        -- JSON als TEXT
  FOREIGN KEY (user_language_id) REFERENCES user_languages(id) ON DELETE CASCADE,
  UNIQUE(user_language_id, category)
);

-- Einstufungstest
CREATE TABLE IF NOT EXISTS placement_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_language_id INTEGER NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  theta TEXT,                           -- JSON: Fähigkeitsschätzungen
  result TEXT,                          -- JSON: Endergebnis
  FOREIGN KEY (user_language_id) REFERENCES user_languages(id) ON DELETE CASCADE
);

-- Tagesplan / Session
CREATE TABLE IF NOT EXISTS daily_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_language_id INTEGER NOT NULL,
  date DATE NOT NULL,
  plan TEXT,                            -- JSON als TEXT
  completed TEXT,                       -- JSON als TEXT
  minutes INTEGER DEFAULT 0,
  FOREIGN KEY (user_language_id) REFERENCES user_languages(id) ON DELETE CASCADE,
  UNIQUE(user_language_id, date)
);

-- LLM-Antwort-Cache
CREATE TABLE IF NOT EXISTS llm_cache (
  prompt_hash TEXT PRIMARY KEY,
  prompt_version TEXT,
  model TEXT,
  response TEXT,                        -- JSON als TEXT
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
