import type { TrackerSettings, TrackedSection, RevisionLog, DailyProgress } from '../../types/tracker';
import type { SectionType } from '../../types/quran';
import { today, addDaysToDate } from '../utils/dates';
import { generateId } from '../utils/ids';
import { computeNextRevisionDate } from '../tracker/cycle-engine';

const STORAGE_KEYS = {
  settings: 'qt:settings',
  sections: 'qt:sections',
  revisions: 'qt:revisions',
  dailyProgress: 'qt:daily',
  cycles: 'qt:cycles',
  notes: 'qt:notes',
  onboarding: 'qt:onboarding',
};

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSave(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function localGetSettings(userId: string): TrackerSettings | null {
  const stored = safeGet<Record<string, TrackerSettings>>(STORAGE_KEYS.settings, {});
  return stored[userId] || null;
}

export function localSaveSettings(settings: TrackerSettings): void {
  const stored = safeGet<Record<string, TrackerSettings>>(STORAGE_KEYS.settings, {});
  stored[settings.userId] = settings;
  safeSave(STORAGE_KEYS.settings, stored);
}

export function localIsOnboardingCompleted(userId: string): boolean {
  const done = safeGet<Record<string, boolean>>(STORAGE_KEYS.onboarding, {});
  return done[userId] === true;
}

export function localSetOnboardingCompleted(userId: string): void {
  const done = safeGet<Record<string, boolean>>(STORAGE_KEYS.onboarding, {});
  done[userId] = true;
  safeSave(STORAGE_KEYS.onboarding, done);
}

export function localGetSections(userId: string, modeKey: string): TrackedSection[] {
  const stored = safeGet<TrackedSection[]>(STORAGE_KEYS.sections, []);
  return stored.filter(s => s.userId === userId && s.modeKey === modeKey);
}

export function localSaveSection(section: TrackedSection): void {
  const stored = safeGet<TrackedSection[]>(STORAGE_KEYS.sections, []);
  const idx = stored.findIndex(s =>
    s.userId === section.userId &&
    s.modeKey === section.modeKey &&
    s.sectionType === section.sectionType &&
    s.sectionId === section.sectionId
  );
  if (idx >= 0) stored[idx] = section;
  else stored.push(section);
  safeSave(STORAGE_KEYS.sections, stored);
}

export function localSaveSections(sections: TrackedSection[]): void {
  const stored = safeGet<TrackedSection[]>(STORAGE_KEYS.sections, []);
  for (const section of sections) {
    const idx = stored.findIndex(s =>
      s.userId === section.userId &&
      s.modeKey === section.modeKey &&
      s.sectionType === section.sectionType &&
      s.sectionId === section.sectionId
    );
    if (idx >= 0) stored[idx] = section;
    else stored.push(section);
  }
  safeSave(STORAGE_KEYS.sections, stored);
}

export function localAddRevision(log: Omit<RevisionLog, 'id' | 'createdAt'>): void {
  const stored = safeGet<RevisionLog[]>(STORAGE_KEYS.revisions, []);
  stored.unshift({
    ...log,
    id: generateId(),
    createdAt: new Date().toISOString(),
  });
  safeSave(STORAGE_KEYS.revisions, stored.slice(0, 1000));
}

export function localUndoRevision(userId: string, modeKey: string, sectionId: string): void {
  const stored = safeGet<RevisionLog[]>(STORAGE_KEYS.revisions, []);
  const idx = stored.findIndex(r =>
    r.userId === userId && r.modeKey === modeKey && r.sectionId === sectionId
  );
  if (idx >= 0) stored.splice(idx, 1);
  safeSave(STORAGE_KEYS.revisions, stored);
}

export function localClearRevisions(userId: string, modeKey: string): void {
  const stored = safeGet<RevisionLog[]>(STORAGE_KEYS.revisions, []);
  safeSave(STORAGE_KEYS.revisions, stored.filter(r => !(r.userId === userId && r.modeKey === modeKey)));
}

export function localGetRevisions(userId: string, modeKey: string, limit = 200): RevisionLog[] {
  const stored = safeGet<RevisionLog[]>(STORAGE_KEYS.revisions, []);
  return stored
    .filter(r => r.userId === userId && r.modeKey === modeKey)
    .slice(0, limit);
}

export function localGetDailyProgress(userId: string, modeKey: string, days = 7): DailyProgress[] {
  const stored = safeGet<DailyProgress[]>(STORAGE_KEYS.dailyProgress, []);
  return stored
    .filter(d => d.userId === userId && d.modeKey === modeKey)
    .slice(0, days);
}

export function localSaveDailyProgress(progress: DailyProgress): void {
  const stored = safeGet<DailyProgress[]>(STORAGE_KEYS.dailyProgress, []);
  const idx = stored.findIndex(d =>
    d.userId === progress.userId && d.modeKey === progress.modeKey && d.date === progress.date
  );
  if (idx >= 0) stored[idx] = progress;
  else stored.unshift(progress);
  safeSave(STORAGE_KEYS.dailyProgress, stored.slice(0, 365));
}

export function localGetNote(userId: string, sectionType: string, sectionId: string): string {
  const stored = safeGet<Record<string, string>>(STORAGE_KEYS.notes, {});
  return stored[`${userId}:${sectionType}:${sectionId}`] || '';
}

export function localSaveNote(userId: string, sectionType: string, sectionId: string, note: string): void {
  const stored = safeGet<Record<string, string>>(STORAGE_KEYS.notes, {});
  stored[`${userId}:${sectionType}:${sectionId}`] = note;
  safeSave(STORAGE_KEYS.notes, stored);
}

export function localGetAllNotes(userId: string): Array<{ sectionType: string; sectionId: string; note: string }> {
  const stored = safeGet<Record<string, string>>(STORAGE_KEYS.notes, {});
  const prefix = `${userId}:`;
  return Object.entries(stored)
    .filter(([key, note]) => key.startsWith(prefix) && note.trim() !== '')
    .map(([key, note]) => {
      const rest = key.slice(prefix.length);
      const colonIdx = rest.indexOf(':');
      return {
        sectionType: rest.slice(0, colonIdx),
        sectionId: rest.slice(colonIdx + 1),
        note,
      };
    });
}
