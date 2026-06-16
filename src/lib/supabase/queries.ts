import { supabase, isSupabaseConfigured } from './client';
import type { DbTrackerSettings, DbTrackedSection, DbRevisionLog, DbDailyProgress, DbCycle, DbProfile } from '../../types/database';
import type { TrackerSettings, TrackedSection, RevisionLog, DailyProgress, Cycle, SectionWithStatus } from '../../types/tracker';
import type { SectionType, ModeKey } from '../../types/quran';
import { LOCAL_USER_ID } from '../../config/features';

function mapDbSettings(db: DbTrackerSettings): TrackerSettings {
  return {
    userId: db.user_id,
    activeMode: db.active_mode,
    primaryTrackingLevel: db.primary_tracking_level as TrackerSettings['primaryTrackingLevel'],
    groupedCycleDays: db.grouped_cycle_days,
    groupedCycleStartDate: db.grouped_cycle_start_date,
    quranTextEnabled: db.quran_text_enabled,
    mushafPagesEnabled: db.mushaf_pages_enabled,
    notificationsEnabled: db.notifications_enabled,
    modes: {
      lecture: { cycleDays: db.grouped_cycle_days, cycleStartDate: db.grouped_cycle_start_date },
      memorisation: { cycleDays: db.grouped_cycle_days, cycleStartDate: null },
    },
  };
}

function mapDbSection(db: DbTrackedSection): TrackedSection {
  return {
    id: db.id,
    userId: db.user_id,
    modeKey: db.mode_key,
    sectionType: db.section_type as SectionType,
    sectionId: db.section_id,
    isSelected: db.is_selected,
    groupedCycleEnabled: db.grouped_cycle_enabled,
    individualCycleEnabled: db.individual_cycle_enabled,
    individualCycleDays: db.individual_cycle_days,
    internalCycleMultiplier: db.internal_cycle_multiplier,
    difficulty: db.difficulty as TrackedSection['difficulty'],
    notes: db.notes,
    updatedAt: db.updated_at,
    createdAt: db.created_at,
  };
}

export async function getOrCreateProfile(userId: string): Promise<DbProfile> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (existing) return existing;

  const { data, error } = await supabase.from('profiles').insert({
    id: userId,
    display_name: 'Utilisateur',
    avatar_initials: 'U',
  }).select().single();

  if (error) throw error;
  return data;
}

export async function getSettings(userId: string): Promise<TrackerSettings | null> {
  if (!isSupabaseConfigured()) return null;

  const { data } = await supabase.from('tracker_settings').select('*').eq('user_id', userId).single();
  return data ? mapDbSettings(data) : null;
}

export async function upsertSettings(settings: Partial<TrackerSettings> & { userId: string }): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.from('tracker_settings').upsert({
    user_id: settings.userId,
    active_mode: settings.activeMode,
    primary_tracking_level: settings.primaryTrackingLevel,
    grouped_cycle_days: settings.groupedCycleDays,
    grouped_cycle_start_date: settings.groupedCycleStartDate,
    quran_text_enabled: settings.quranTextEnabled,
    mushaf_pages_enabled: settings.mushafPagesEnabled,
    notifications_enabled: settings.notificationsEnabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

export async function isOnboardingCompleted(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { data } = await supabase
    .from('tracker_settings')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .single();

  return data?.onboarding_completed === true;
}

export async function setOnboardingCompleted(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.from('tracker_settings').upsert({
    user_id: userId,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

export async function getTrackedSections(userId: string, modeKey: string): Promise<TrackedSection[]> {
  if (!isSupabaseConfigured()) return [];

  const { data } = await supabase
    .from('tracked_sections')
    .select('*')
    .eq('user_id', userId)
    .eq('mode_key', modeKey);

  return (data || []).map(mapDbSection);
}

export async function upsertTrackedSection(section: Omit<TrackedSection, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.from('tracked_sections').upsert({
    user_id: section.userId,
    mode_key: section.modeKey,
    section_type: section.sectionType,
    section_id: section.sectionId,
    is_selected: section.isSelected,
    grouped_cycle_enabled: section.groupedCycleEnabled,
    individual_cycle_enabled: section.individualCycleEnabled,
    individual_cycle_days: section.individualCycleDays,
    internal_cycle_multiplier: section.internalCycleMultiplier,
    difficulty: section.difficulty,
    notes: section.notes,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,mode_key,section_type,section_id' });
}

export async function bulkUpsertSections(sections: Omit<TrackedSection, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
  if (!isSupabaseConfigured() || sections.length === 0) return;

  const rows = sections.map(s => ({
    user_id: s.userId,
    mode_key: s.modeKey,
    section_type: s.sectionType,
    section_id: s.sectionId,
    is_selected: s.isSelected,
    grouped_cycle_enabled: s.groupedCycleEnabled,
    individual_cycle_enabled: s.individualCycleEnabled,
    individual_cycle_days: s.individualCycleDays,
    internal_cycle_multiplier: s.internalCycleMultiplier,
    difficulty: s.difficulty,
    notes: s.notes,
    updated_at: new Date().toISOString(),
  }));

  await supabase.from('tracked_sections').upsert(rows, { onConflict: 'user_id,mode_key,section_type,section_id' });
}

export async function addRevisionLog(log: Omit<RevisionLog, 'id' | 'createdAt'>): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.from('revision_logs').insert({
    user_id: log.userId,
    mode_key: log.modeKey,
    section_type: log.sectionType,
    section_id: log.sectionId,
    revision_date: log.revisionDate,
    cycle_id: log.cycleId,
    difficulty_at_revision: log.difficultyAtRevision,
    source_action: log.sourceAction,
  });
}

export async function deleteLastRevisionLog(userId: string, modeKey: string, sectionId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { data } = await supabase
    .from('revision_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('mode_key', modeKey)
    .eq('section_id', sectionId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (data?.[0]) {
    await supabase.from('revision_logs').delete().eq('id', data[0].id);
  }
}

export async function getRevisionLogs(userId: string, modeKey: string, limit = 100): Promise<RevisionLog[]> {
  if (!isSupabaseConfigured()) return [];

  const { data } = await supabase
    .from('revision_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('mode_key', modeKey)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map(d => ({
    id: d.id,
    userId: d.user_id,
    modeKey: d.mode_key,
    sectionType: d.section_type as SectionType,
    sectionId: d.section_id,
    revisionDate: d.revision_date,
    cycleId: d.cycle_id,
    difficultyAtRevision: d.difficulty_at_revision,
    sourceAction: d.source_action,
    createdAt: d.created_at,
  }));
}

export async function getActiveCycle(userId: string, modeKey: string): Promise<Cycle | null> {
  if (!isSupabaseConfigured()) return null;

  const { data } = await supabase
    .from('cycles')
    .select('*')
    .eq('user_id', userId)
    .eq('mode_key', modeKey)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    modeKey: data.mode_key,
    type: data.type as Cycle['type'],
    startDate: data.start_date,
    endDate: data.end_date,
    days: data.days,
    status: data.status as Cycle['status'],
    completionPercent: data.completion_percent,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function upsertCycle(cycle: Omit<Cycle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!isSupabaseConfigured()) return '';

  const endDate = new Date(cycle.startDate);
  endDate.setDate(endDate.getDate() + cycle.days);

  const { data } = await supabase.from('cycles').insert({
    user_id: cycle.userId,
    mode_key: cycle.modeKey,
    type: cycle.type,
    start_date: cycle.startDate,
    end_date: endDate.toISOString().split('T')[0],
    days: cycle.days,
    status: cycle.status,
    completion_percent: cycle.completionPercent,
  }).select().single();

  return data?.id || '';
}

export async function updateCycleProgress(cycleId: string, percent: number): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.from('cycles').update({
    completion_percent: percent,
    updated_at: new Date().toISOString(),
  }).eq('id', cycleId);
}

export async function getDailyProgress(userId: string, modeKey: string, date: string): Promise<DailyProgress | null> {
  if (!isSupabaseConfigured()) return null;

  const { data } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('mode_key', modeKey)
    .eq('date', date)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    modeKey: data.mode_key,
    date: data.date,
    targetCount: data.target_count,
    completedCount: data.completed_count,
    missedCount: data.missed_count,
    isComplete: data.is_complete,
    createdAt: data.created_at,
  };
}

export async function getRecentDailyProgress(userId: string, modeKey: string, days = 7): Promise<DailyProgress[]> {
  if (!isSupabaseConfigured()) return [];

  const { data } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('mode_key', modeKey)
    .order('date', { ascending: false })
    .limit(days);

  return (data || []).map(d => ({
    id: d.id,
    userId: d.user_id,
    modeKey: d.mode_key,
    date: d.date,
    targetCount: d.target_count,
    completedCount: d.completed_count,
    missedCount: d.missed_count,
    isComplete: d.is_complete,
    createdAt: d.created_at,
  }));
}

export async function upsertDailyProgress(progress: Omit<DailyProgress, 'id' | 'createdAt'>): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.from('daily_progress').upsert({
    user_id: progress.userId,
    mode_key: progress.modeKey,
    date: progress.date,
    target_count: progress.targetCount,
    completed_count: progress.completedCount,
    missed_count: progress.missedCount,
    is_complete: progress.isComplete,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,mode_key,date' });
}

export async function getNote(userId: string, sectionType: string, sectionId: string): Promise<string> {
  if (!isSupabaseConfigured()) return '';

  const { data } = await supabase
    .from('user_notes')
    .select('note')
    .eq('user_id', userId)
    .eq('section_type', sectionType)
    .eq('section_id', sectionId)
    .single();

  return data?.note || '';
}

export async function upsertNote(userId: string, sectionType: string, sectionId: string, note: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.from('user_notes').upsert({
    user_id: userId,
    section_type: sectionType,
    section_id: sectionId,
    note,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,section_type,section_id' });
}
