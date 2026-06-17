-- ─────────────────────────────────────────────────────────────────────────────
-- Quran Tracker — Schéma initial
-- Tables actives : profiles, tracker_settings, tracked_sections,
--                  revision_logs, daily_progress, user_notes
-- ─────────────────────────────────────────────────────────────────────────────


-- ── profiles ──────────────────────────────────────────────────────────────────
-- Liée à auth.users : suppression en cascade, id = UUID Supabase Auth

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  nom             TEXT,
  prenom          TEXT,
  display_name    TEXT        NOT NULL DEFAULT 'Utilisateur',
  avatar_initials TEXT        NOT NULL DEFAULT 'U',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profiles" ON profiles
  FOR ALL
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Crée automatiquement la ligne profile dès qu'un utilisateur s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ── tracker_settings ──────────────────────────────────────────────────────────
-- Paramètres globaux de l'app (cycle, mode, options)

CREATE TABLE IF NOT EXISTS tracker_settings (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_mode              TEXT    NOT NULL DEFAULT 'lecture',
  primary_tracking_level   TEXT    NOT NULL DEFAULT 'hizb',
  grouped_cycle_days       INTEGER NOT NULL DEFAULT 7,
  grouped_cycle_start_date DATE,
  quran_text_enabled       BOOLEAN NOT NULL DEFAULT true,
  mushaf_pages_enabled     BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled    BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE tracker_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_tracker_settings" ON tracker_settings
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── tracked_sections ──────────────────────────────────────────────────────────
-- Sections sélectionnées + métadonnées (difficulté, multiplicateur, notes)

CREATE TABLE IF NOT EXISTS tracked_sections (
  id                        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_key                  TEXT    NOT NULL,
  section_type              TEXT    NOT NULL,
  section_id                TEXT    NOT NULL,
  is_selected               BOOLEAN NOT NULL DEFAULT true,
  grouped_cycle_enabled     BOOLEAN NOT NULL DEFAULT true,
  individual_cycle_enabled  BOOLEAN NOT NULL DEFAULT false,
  individual_cycle_days     INTEGER NOT NULL DEFAULT 7,
  internal_cycle_multiplier INTEGER NOT NULL DEFAULT 1,
  difficulty                TEXT,
  notes                     TEXT    NOT NULL DEFAULT '',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mode_key, section_type, section_id)
);

ALTER TABLE tracked_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_tracked_sections" ON tracked_sections
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tracked_sections_user_mode
  ON tracked_sections (user_id, mode_key);


-- ── revision_logs ─────────────────────────────────────────────────────────────
-- Historique de toutes les révisions

CREATE TABLE IF NOT EXISTS revision_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_key               TEXT NOT NULL,
  section_type           TEXT NOT NULL,
  section_id             TEXT NOT NULL,
  revision_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  cycle_id               UUID,
  difficulty_at_revision TEXT,
  source_action          TEXT NOT NULL DEFAULT 'manual',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE revision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_revision_logs" ON revision_logs
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_revision_logs_user_mode
  ON revision_logs (user_id, mode_key, created_at DESC);


-- ── daily_progress ────────────────────────────────────────────────────────────
-- Progression journalière (streak, stats d'activité)

CREATE TABLE IF NOT EXISTS daily_progress (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_key        TEXT    NOT NULL,
  date            DATE    NOT NULL DEFAULT CURRENT_DATE,
  target_count    FLOAT   NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  missed_count    INTEGER NOT NULL DEFAULT 0,
  is_complete     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mode_key, date)
);

ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_daily_progress" ON daily_progress
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_progress_user_mode
  ON daily_progress (user_id, mode_key, date DESC);


-- ── user_notes ────────────────────────────────────────────────────────────────
-- Notes libres par section

CREATE TABLE IF NOT EXISTS user_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  section_id   TEXT NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_type, section_id)
);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_user_notes" ON user_notes
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
