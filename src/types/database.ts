export interface DbProfile {
  id: string;
  email: string | null;
  display_name: string;
  avatar_initials: string;
  created_at: string;
  updated_at: string;
}

export interface DbTrackerSettings {
  id: string;
  user_id: string;
  active_mode: string;
  primary_tracking_level: string;
  grouped_cycle_days: number;
  grouped_cycle_start_date: string | null;
  quran_text_enabled: boolean;
  mushaf_pages_enabled: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTrackerMode {
  id: string;
  user_id: string;
  key: string;
  label: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DbTrackedSection {
  id: string;
  user_id: string;
  mode_key: string;
  section_type: string;
  section_id: string;
  is_selected: boolean;
  grouped_cycle_enabled: boolean;
  individual_cycle_enabled: boolean;
  individual_cycle_days: number;
  internal_cycle_multiplier: number;
  difficulty: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DbRevisionLog {
  id: string;
  user_id: string;
  mode_key: string;
  section_type: string;
  section_id: string;
  revision_date: string;
  cycle_id: string | null;
  difficulty_at_revision: string | null;
  source_action: string;
  created_at: string;
}

export interface DbCycle {
  id: string;
  user_id: string;
  mode_key: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  completion_percent: number;
  created_at: string;
  updated_at: string;
}

export interface DbDailyProgress {
  id: string;
  user_id: string;
  mode_key: string;
  date: string;
  target_count: number;
  completed_count: number;
  missed_count: number;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbUserNote {
  id: string;
  user_id: string;
  section_type: string;
  section_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}
