import {
  bulkUpsertSections,
  upsertSettings,
  addRevisionLog,
  upsertDailyProgress,
  upsertNote,
} from '../lib/supabase/queries';
import {
  localGetSections,
  localGetRevisions,
  localGetDailyProgress,
  localGetAllNotes,
} from '../lib/providers/LocalTrackerProvider';
import { useSettingsStore } from '../store/useSettingsStore';
import { LOCAL_USER_ID } from '../config/features';

const MODES = ['lecture', 'memorisation'] as const;

export async function pushLocalSections(userId: string): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  if (settings) {
    await upsertSettings({ ...settings, userId });
  }

  for (const modeKey of MODES) {
    // Sections
    const sections = localGetSections(LOCAL_USER_ID, modeKey).map(s => ({
      ...s,
      userId,
      modeKey,
    }));
    if (sections.length > 0) {
      await bulkUpsertSections(sections);
    }

    // Daily progress (up to 365 days)
    const progress = localGetDailyProgress(LOCAL_USER_ID, modeKey, 365);
    for (const dp of progress) {
      await upsertDailyProgress({ ...dp, userId }).catch(() => {});
    }
  }

  // User notes
  const notes = localGetAllNotes(LOCAL_USER_ID);
  for (const { sectionType, sectionId, note } of notes) {
    await upsertNote(userId, sectionType, sectionId, note).catch(() => {});
  }
}

export async function pushLocalToSupabase(userId: string): Promise<void> {
  await pushLocalSections(userId);

  for (const modeKey of MODES) {
    const revisions = localGetRevisions(LOCAL_USER_ID, modeKey, 2000);
    for (const rev of revisions) {
      await addRevisionLog({ ...rev, userId }).catch(() => {});
    }
  }
}
