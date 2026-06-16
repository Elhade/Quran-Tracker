'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackedSection, RevisionLog, DailyProgress, SectionWithStatus } from '../types/tracker';
import type { SectionType } from '../types/quran';
import type { DifficultyLevel } from '../types/tracker';
import { today } from '../lib/utils/dates';
import { computeNextRevisionDate } from '../lib/tracker/cycle-engine';
import { computeSectionStatus } from '../lib/tracker/status-engine';
import { JUZS, HIZBS, RUBS } from '../data/quran/quran-structure';
import {
  localGetSections, localSaveSection, localSaveSections,
  localAddRevision, localUndoRevision, localGetRevisions,
  localGetDailyProgress, localSaveDailyProgress,
  localGetNote, localSaveNote,
} from '../lib/providers/LocalTrackerProvider';
import { generateId } from '../lib/utils/ids';

// ─── Cascade helpers ──────────────────────────────────────────────────────────

function typeFromId(id: string): SectionType {
  if (id.startsWith('juz-')) return 'juz';
  if (id.startsWith('hizb-')) return 'hizb';
  if (id.startsWith('rub-')) return 'rub';
  return 'sourate';
}

/**
 * Returns all IDs to mark when validating a given section:
 * - the section itself
 * - children (hizb→rubs, juz→hizbs+rubs)
 * - auto-propagated parents (all rubs done→hizb, all hizbs done→juz)
 * Only includes IDs that are tracked (in trackedIds) and not already done.
 */
function getMarkCascadeIds(
  sectionId: string,
  sectionType: SectionType,
  trackedIds: Set<string>,
  modeKey: string,
  doneKeys: Set<string>,
): { id: string; type: SectionType }[] {
  const toMark: { id: string; type: SectionType }[] = [];
  const willBeDone = new Set(doneKeys);

  const add = (id: string, type: SectionType) => {
    const key = `${modeKey}:${id}`;
    if (trackedIds.has(id) && !willBeDone.has(key)) {
      toMark.push({ id, type });
      willBeDone.add(key);
    }
  };

  // Mark this section
  add(sectionId, sectionType);

  // Downward: mark children
  if (sectionType === 'juz') {
    const juz = JUZS.find(j => j.id === sectionId);
    if (juz) {
      for (const hizbId of juz.childrenIds) {
        add(hizbId, 'hizb');
        const hizb = HIZBS.find(h => h.id === hizbId);
        if (hizb) hizb.childrenIds.forEach(rubId => add(rubId, 'rub'));
      }
    }
  } else if (sectionType === 'hizb') {
    const hizb = HIZBS.find(h => h.id === sectionId);
    if (hizb) hizb.childrenIds.forEach(rubId => add(rubId, 'rub'));
  }

  // Upward from rub: check if parent hizb is now fully done
  if (sectionType === 'rub') {
    const rub = RUBS.find(r => r.id === sectionId);
    if (rub) {
      const hizbId = `hizb-${rub.hizbNumber}`;
      const hizb = HIZBS.find(h => h.id === hizbId);
      if (hizb && hizb.childrenIds.every(rid => willBeDone.has(`${modeKey}:${rid}`))) {
        add(hizbId, 'hizb');
        // Check if parent juz is now fully done
        const juzId = `juz-${hizb.juzNumber}`;
        const juz = JUZS.find(j => j.id === juzId);
        if (juz && juz.childrenIds.every(hid => willBeDone.has(`${modeKey}:${hid}`))) {
          add(juzId, 'juz');
        }
      }
    }
  }

  // Upward from hizb: check if parent juz is now fully done
  if (sectionType === 'hizb') {
    const hizb = HIZBS.find(h => h.id === sectionId);
    if (hizb) {
      const juzId = `juz-${hizb.juzNumber}`;
      const juz = JUZS.find(j => j.id === juzId);
      if (juz && juz.childrenIds.every(hid => willBeDone.has(`${modeKey}:${hid}`))) {
        add(juzId, 'juz');
      }
    }
  }

  return toMark;
}

/**
 * Returns all IDs to remove when undoing a section:
 * - the section itself
 * - parents up the chain (hizb→juz for rub; juz for hizb)
 * - children down the chain (hizb undone → rubs undone; juz undone → hizbs+rubs)
 */
function getUndoCascadeIds(sectionId: string, modeKey: string, doneKeys: Set<string>): string[] {
  const toRemove: string[] = [];
  const willBeUndone = new Set(doneKeys);

  const remove = (id: string) => {
    const key = `${modeKey}:${id}`;
    if (willBeUndone.has(key)) { toRemove.push(id); willBeUndone.delete(key); }
  };

  const type = typeFromId(sectionId);
  remove(sectionId);

  if (type === 'rub') {
    const rub = RUBS.find(r => r.id === sectionId);
    if (rub) {
      remove(`hizb-${rub.hizbNumber}`);
      const hizb = HIZBS.find(h => h.number === rub.hizbNumber);
      if (hizb) remove(`juz-${hizb.juzNumber}`);
    }
  } else if (type === 'hizb') {
    const hizb = HIZBS.find(h => h.id === sectionId);
    if (hizb) {
      hizb.childrenIds.forEach(rubId => remove(rubId));
      remove(`juz-${hizb.juzNumber}`);
    }
  } else if (type === 'juz') {
    const juz = JUZS.find(j => j.id === sectionId);
    if (juz) {
      for (const hizbId of juz.childrenIds) {
        remove(hizbId);
        const hizb = HIZBS.find(h => h.id === hizbId);
        if (hizb) hizb.childrenIds.forEach(rubId => remove(rubId));
      }
    }
  }

  return toRemove;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface TrackerState {
  sections: TrackedSection[];
  revisions: RevisionLog[];
  dailyProgress: DailyProgress[];
  todayRevisionIds: Set<string>;
  loaded: boolean;

  loadData: (userId: string, modeKey: string) => void;
  getSectionsWithStatus: (modeKey: string, cycleDays: number) => SectionWithStatus[];
  markAsRevised: (userId: string, modeKey: string, sectionId: string, sectionType: SectionType, cycleDays: number, difficulty?: DifficultyLevel) => void;
  undoRevision: (userId: string, modeKey: string, sectionId: string) => void;
  setDifficulty: (userId: string, modeKey: string, sectionId: string, sectionType: SectionType, difficulty: DifficultyLevel | null) => void;
  setInternalCycle: (userId: string, modeKey: string, sectionId: string, sectionType: SectionType, multiplier: number) => void;
  selectSections: (userId: string, modeKey: string, sectionIds: { id: string; type: SectionType }[]) => void;
  clearSelections: (userId: string, modeKey: string) => void;
  setNote: (userId: string, sectionType: string, sectionId: string, note: string) => void;
  getNote: (userId: string, sectionType: string, sectionId: string) => string;
  isSectionRevised: (sectionId: string, modeKey: string) => boolean;
  getTodayCount: (modeKey: string) => number;
  getTotalRevisionCount: (modeKey: string) => number;
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      sections: [],
      revisions: [],
      dailyProgress: [],
      todayRevisionIds: new Set(),
      loaded: false,

      loadData: (userId, _modeKey) => {
        const ALL_MODES = ['lecture', 'memorisation'];
        const allSections: TrackedSection[] = [];
        const allRevisions: RevisionLog[] = [];
        const allProgress: DailyProgress[] = [];

        for (const mk of ALL_MODES) {
          // Auto-migrate: ensure every tracked hizb also has its 4 rubs tracked.
          let modeSections = localGetSections(userId, mk);
          try {
            const trackedHizbIds = modeSections
              .filter(s => s.isSelected && s.sectionType === 'hizb')
              .map(s => s.sectionId);
            if (trackedHizbIds.length > 0) {
              const existingRubIds = new Set(
                modeSections.filter(s => s.sectionType === 'rub').map(s => s.sectionId)
              );
              const rubsToAdd: TrackedSection[] = [];
              for (const hizbId of trackedHizbIds) {
                const hizb = HIZBS.find(h => h.id === hizbId);
                if (!hizb) continue;
                for (const rubId of hizb.childrenIds) {
                  if (!existingRubIds.has(rubId)) {
                    rubsToAdd.push({
                      id: generateId(), userId, modeKey: mk, sectionType: 'rub', sectionId: rubId,
                      isSelected: true, groupedCycleEnabled: true, individualCycleEnabled: false,
                      individualCycleDays: 7, internalCycleMultiplier: 1, difficulty: null,
                      notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                    });
                  }
                }
              }
              if (rubsToAdd.length > 0) {
                localSaveSections([...modeSections, ...rubsToAdd]);
                modeSections = localGetSections(userId, mk);
              }
            }
          } catch (e) {
            console.error(`[loadData] migration error for ${mk}:`, e);
          }
          allSections.push(...modeSections);
          allRevisions.push(...localGetRevisions(userId, mk));
          allProgress.push(...localGetDailyProgress(userId, mk, 30));
        }

        const todayRevisions = allRevisions.filter(r => r.revisionDate === today());
        set({
          sections: allSections,
          revisions: allRevisions,
          dailyProgress: allProgress,
          todayRevisionIds: new Set(todayRevisions.map(r => `${r.modeKey}:${r.sectionId}`)),
          loaded: true,
        });
      },

      getSectionsWithStatus: (modeKey, cycleDays) => {
        const { sections, revisions } = get();
        const modeSections = sections.filter(s => s.modeKey === modeKey && s.isSelected);
        const modeRevisions = revisions.filter(r => r.modeKey === modeKey);
        const revisionMap = new Map<string, string>();
        for (const rev of modeRevisions) {
          if (!revisionMap.has(rev.sectionId)) revisionMap.set(rev.sectionId, rev.revisionDate);
        }
        return modeSections.map(s => {
          const lastRev = revisionMap.get(s.sectionId) || null;
          const effectiveDays = s.individualCycleEnabled ? s.individualCycleDays : cycleDays;
          const nextRev = lastRev ? computeNextRevisionDate(lastRev, effectiveDays, s.difficulty, s.internalCycleMultiplier) : null;
          const status = lastRev && revisionMap.get(s.sectionId) === today()
            ? 'done'
            : computeSectionStatus(lastRev, nextRev, effectiveDays);
          return {
            sectionId: s.sectionId,
            sectionType: s.sectionType,
            status,
            difficulty: s.difficulty,
            lastRevisionDate: lastRev,
            nextRevisionDate: nextRev,
            revisionCount: modeRevisions.filter(r => r.sectionId === s.sectionId).length,
            individualCycleDays: s.individualCycleDays,
            internalCycleMultiplier: s.internalCycleMultiplier,
            notes: s.notes,
          };
        });
      },

      markAsRevised: (userId, modeKey, sectionId, sectionType, cycleDays, difficulty) => {
        const state = get();
        const { sections, todayRevisionIds } = state;

        const trackedIds = new Set(
          sections.filter(s => s.modeKey === modeKey && s.isSelected).map(s => s.sectionId)
        );

        const cascade = getMarkCascadeIds(sectionId, sectionType, trackedIds, modeKey, todayRevisionIds);
        if (cascade.length === 0) return;

        const newIds = new Set(todayRevisionIds);
        let newRevisions = [...state.revisions];
        let addedCount = 0;

        for (const { id, type } of cascade) {
          const key = `${modeKey}:${id}`;
          if (newIds.has(key)) continue;
          const log: Omit<RevisionLog, 'id' | 'createdAt'> = {
            userId, modeKey, sectionType: type, sectionId: id,
            revisionDate: today(), cycleId: null,
            difficultyAtRevision: id === sectionId ? (difficulty || null) : null,
            sourceAction: id === sectionId ? 'manual' : 'cascade',
          };
          localAddRevision(log);
          newIds.add(key);
          newRevisions = [{ ...log, id: generateId(), createdAt: new Date().toISOString() }, ...newRevisions];
          addedCount++;
        }

        if (addedCount > 0) {
          const dp = localGetDailyProgress(userId, modeKey, 1);
          const todayDp = dp.find(d => d.date === today()) || {
            id: generateId(), userId, modeKey, date: today(),
            targetCount: 0, completedCount: 0, missedCount: 0, isComplete: false,
            createdAt: new Date().toISOString(),
          };
          todayDp.completedCount += addedCount;
          localSaveDailyProgress(todayDp);
        }

        set({ todayRevisionIds: newIds, revisions: newRevisions });
      },

      undoRevision: (userId, modeKey, sectionId) => {
        const { todayRevisionIds, revisions } = get();

        const toRemove = getUndoCascadeIds(sectionId, modeKey, todayRevisionIds);
        if (toRemove.length === 0) return;

        const newIds = new Set(todayRevisionIds);
        let newRevisions = [...revisions];

        for (const id of toRemove) {
          newIds.delete(`${modeKey}:${id}`);
          localUndoRevision(userId, modeKey, id);
          const idx = newRevisions.findIndex(r => r.modeKey === modeKey && r.sectionId === id);
          if (idx >= 0) newRevisions.splice(idx, 1);
        }

        set({ todayRevisionIds: newIds, revisions: newRevisions });
      },

      setDifficulty: (userId, modeKey, sectionId, sectionType, difficulty) => {
        const { sections } = get();
        let section = sections.find(s => s.sectionId === sectionId && s.modeKey === modeKey);
        if (!section) {
          section = {
            id: generateId(), userId, modeKey, sectionType, sectionId,
            isSelected: false, groupedCycleEnabled: false, individualCycleEnabled: false,
            individualCycleDays: 7, internalCycleMultiplier: 1, difficulty: null,
            notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          };
        }
        const updated = { ...section, difficulty, updatedAt: new Date().toISOString() };
        localSaveSection(updated);
        const newSections = sections.filter(s => !(s.sectionId === sectionId && s.modeKey === modeKey));
        set({ sections: [...newSections, updated] });
      },

      setInternalCycle: (userId, modeKey, sectionId, sectionType, multiplier) => {
        const { sections } = get();
        const section = sections.find(s => s.sectionId === sectionId && s.modeKey === modeKey);
        if (!section) return;
        const updated = { ...section, internalCycleMultiplier: multiplier, updatedAt: new Date().toISOString() };
        localSaveSection(updated);
        const newSections = sections.filter(s => !(s.sectionId === sectionId && s.modeKey === modeKey));
        set({ sections: [...newSections, updated] });
      },

      selectSections: (userId, modeKey, sectionIds) => {
        // Auto-expand: every selected hizb also tracks its 4 rubs
        const expanded: { id: string; type: SectionType }[] = [];
        for (const { id, type } of sectionIds) {
          expanded.push({ id, type });
          if (type === 'hizb') {
            const hizb = HIZBS.find(h => h.id === id);
            if (hizb) hizb.childrenIds.forEach(rubId => expanded.push({ id: rubId, type: 'rub' }));
          }
        }

        const existing = localGetSections(userId, modeKey);
        const existingMap = new Map(existing.map(s => [s.sectionId, s]));

        const newSections: TrackedSection[] = expanded.map(({ id, type }) => {
          const ex = existingMap.get(id);
          if (ex) return { ...ex, isSelected: true, groupedCycleEnabled: true };
          return {
            id: generateId(), userId, modeKey, sectionType: type, sectionId: id,
            isSelected: true, groupedCycleEnabled: true, individualCycleEnabled: false,
            individualCycleDays: 7, internalCycleMultiplier: 1, difficulty: null,
            notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          };
        });

        const deselected = existing
          .filter(s => !expanded.find(e => e.id === s.sectionId))
          .map(s => ({ ...s, isSelected: false, groupedCycleEnabled: false }));

        localSaveSections([...newSections, ...deselected]);
        set({ sections: localGetSections(userId, modeKey) });
      },

      clearSelections: (userId, modeKey) => {
        const existing = localGetSections(userId, modeKey);
        const cleared = existing.map(s => ({ ...s, isSelected: false, groupedCycleEnabled: false }));
        localSaveSections(cleared);
        set({ sections: cleared });
      },

      setNote: (userId, sectionType, sectionId, note) => {
        localSaveNote(userId, sectionType, sectionId, note);
      },

      getNote: (userId, sectionType, sectionId) => {
        return localGetNote(userId, sectionType, sectionId);
      },

      isSectionRevised: (sectionId, modeKey) => {
        return get().todayRevisionIds.has(`${modeKey}:${sectionId}`);
      },

      getTodayCount: (modeKey) => {
        return Array.from(get().todayRevisionIds).filter(k => k.startsWith(`${modeKey}:`)).length;
      },

      getTotalRevisionCount: (modeKey) => {
        return get().revisions.filter(r => r.modeKey === modeKey).length;
      },
    }),
    {
      name: 'qt:tracker-store',
      partialize: (state) => ({
        sections: state.sections,
        revisions: state.revisions,
        dailyProgress: state.dailyProgress,
      }),
    }
  )
);
