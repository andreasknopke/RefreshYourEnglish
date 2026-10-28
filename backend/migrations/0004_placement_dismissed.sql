-- Phase 10: Einstufungstest optional
-- Nutzer können den Einstufungstest bewusst überspringen; dann wird das
-- "nicht abgeschlossen"-Banner nicht mehr angezeigt.
--
-- SQLite: ALTER TABLE ... ADD COLUMN ist idempotent-safe, weil der Runner
-- jede Migration nur einmal ausführt (_migrations).

ALTER TABLE user_languages ADD COLUMN placement_dismissed INTEGER DEFAULT 0;
