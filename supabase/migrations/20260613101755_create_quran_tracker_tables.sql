
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT NOT NULL DEFAULT 'Utilisateur',
  avatar_initials TEXT NOT NULL DEFAULT 'U',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_profiles" ON profiles FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_own_profiles" ON profiles FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_own_profiles" ON profiles FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_profiles" ON profiles FOR DELETE
  TO anon USING (true);

CREATE TABLE IF NOT EXISTS tracker_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  active_mode TEXT NOT NULL DEFAULT 'lecture',
  primary_tracking_level TEXT NOT NULL DEFAULT 'hizb',
  grouped_cycle_days INTEGER NOT NULL DEFAULT 7,
  grouped_cycle_start_date DATE,
  quran_text_enabled BOOLEAN NOT NULL DEFAULT true,
  mushaf_pages_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE tracker_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tracker_settings" ON tracker_settings FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_own_tracker_settings" ON tracker_settings FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_own_tracker_settings" ON tracker_settings FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_tracker_settings" ON tracker_settings FOR DELETE
  TO anon USING (true);

CREATE TABLE IF NOT EXISTS tracker_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE tracker_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tracker_modes" ON tracker_modes FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_own_tracker_modes" ON tracker_modes FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_own_tracker_modes" ON tracker_modes FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_tracker_modes" ON tracker_modes FOR DELETE
  TO anon USING (true);

CREATE TABLE IF NOT EXISTS tracked_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mode_key TEXT NOT NULL,
  section_type TEXT NOT NULL,
  section_id TEXT NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  grouped_cycle_enabled BOOLEAN NOT NULL DEFAULT true,
  individual_cycle_enabled BOOLEAN NOT NULL DEFAULT false,
  individual_cycle_days INTEGER NOT NULL DEFAULT 7,
  internal_cycle_multiplier INTEGER NOT NULL DEFAULT 1,
  difficulty TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, mode_key, section_type, section_id)
);

ALTER TABLE tracked_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tracked_sections" ON tracked_sections FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_own_tracked_sections" ON tracked_sections FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_own_tracked_sections" ON tracked_sections FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_tracked_sections" ON tracked_sections FOR DELETE
  TO anon USING (true);

CREATE TABLE IF NOT EXISTS revision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mode_key TEXT NOT NULL,
  section_type TEXT NOT NULL,
  section_id TEXT NOT NULL,
  revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cycle_id UUID,
  difficulty_at_revision TEXT,
  source_action TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE revision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_revision_logs" ON revision_logs FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_own_revision_logs" ON revision_logs FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_own_revision_logs" ON revision_logs FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_revision_logs" ON revision_logs FOR DELETE
  TO anon USING (true);

CREATE TABLE IF NOT EXISTS cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mode_key TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'grouped',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'active',
  completion_percent FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_cycles" ON cycles FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_own_cycles" ON cycles FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_own_cycles" ON cycles FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_cycles" ON cycles FOR DELETE
  TO anon USING (true);

CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mode_key TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_count FLOAT NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  missed_count INTEGER NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, mode_key, date)
);

ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_daily_progress" ON daily_progress FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_own_daily_progress" ON daily_progress FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_own_daily_progress" ON daily_progress FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_daily_progress" ON daily_progress FOR DELETE
  TO anon USING (true);

CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  section_type TEXT NOT NULL,
  section_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, section_type, section_id)
);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_user_notes" ON user_notes FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_own_user_notes" ON user_notes FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_own_user_notes" ON user_notes FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_user_notes" ON user_notes FOR DELETE
  TO anon USING (true);
