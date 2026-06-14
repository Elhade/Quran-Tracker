'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackedSection, RevisionLog, DailyProgress, SectionWithStatus } from '../types/tracker';
import type { SectionType } from '../types/quran';
import type { DifficultyLevel } from '../types/tracker';
import { today, addDaysToDate } from '../lib/utils/dates';
import { computeNextRevisionDate } from '../lib/tracker/cycle-engine';
import { computeSectionStatus } from '../lib/tracker/status-engine';
import { propagateCompletion, propagateUndoCompletion } from '../lib/tracker/hierarchy-engine';
import {
  localGetSections, localSaveSection, localSaveSections,
  localAddRevision, localUndoRevision, localGetRevisions,
  localGetDailyProgress, localSaveDailyProgress,
  localGetNote, localSaveNote,
} from '../lib/providers/LocalTrackerProvider';
import { generateId } from '../lib/utils/ids';

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

      loadData: (userId, modeKey) => {
        const sections = localGetSections(userId, modeKey);
        const revisions = localGetRevisions(userId, modeKey);
        const dailyProgress = localGetDailyProgress(userId, modeKey, 30);
        const todayRevisions = revisions.filter(r => r.revisionDate === today());
        set({
          sections,
          revisions,
          dailyProgress,
          todayRevisionIds: new Set(todayRevisions.map(r => `${r.modeKey}:${r.sectionId}`)),
          loaded: true,
        });
      },

      getSectionsWithStatus: (modeKey, cycleDays) => {
        const { sections, revisions } = get();
        const modeSections = sections.filter(s => s.modeKey === modeKey && s.isSelected);
        const revisionMap = new Map<string, string>();

        for (const rev of revisions) {
          if (!revisionMap.has(rev.sectionId)) {
            revisionMap.set(rev.sectionId, rev.revisionDate);
          }
        }

        return modeSections.map(s => {
          const lastRev = revisionMap.get(s.sectionId) || null;
          const nextRev = lastRev
            ? computeNextRevisionDate(lastRev, s.individualCycleEnabled ? s.individualCycleDays : cycleDays, s.difficulty, s.internalCycleMultiplier)
            : null;
          const revCount = revisions.filter(r => r.sectionId === s.sectionId).length;
          const status = lastRev && revisionMap.get(s.sectionId) === today() ? 'done' : computeSectionStatus(lastRev, nextRev, s.individualCycleEnabled ? s.individualCycleDays : cycleDays);

          return {
            sectionId: s.sectionId,
            sectionType: s.sectionType,
            status,
            difficulty: s.difficulty,
            lastRevisionDate: lastRev,
            nextRevisionDate: nextRev,
            revisionCount: revCount,
            individualCycleDays: s.individualCycleDays,
            internalCycleMultiplier: s.internalCycleMultiplier,
            notes: s.notes,
          };
        });
      },

      markAsRevised: (userId, modeKey, sectionId, sectionType, cycleDays, difficulty) => {
        const { sections, todayRevisionIds } = get();
        const key = `${modeKey}:${sectionId}`;

        if (todayRevisionIds.has(key)) return;

        const log: Omit<RevisionLog, 'id' | 'createdAt'> = {
          userId,
          modeKey,
          sectionType,
          sectionId,
          revisionDate: today(),
          cycleId: null,
          difficultyAtRevision: difficulty || null,
          sourceAction: 'manual',
        };
        localAddRevision(log);

        const newIds = new Set(todayRevisionIds);
        newIds.add(key);

        const newRevision: RevisionLog = { ...log, id: generateId(), createdAt: new Date().toISOString() };
        const revisions = [newRevision, ...get().revisions];

        const dp = localGetDailyProgress(userId, modeKey, 1);
        const todayDp = dp.find(d => d.date === today()) || {
          id: generateId(), userId, modeKey, date: today(),
          targetCount: 0, completedCount: 0, missedCount: 0, isComplete: false, createdAt: new Date().toISOString(),
        };
        todayDp.completedCount++;
        localSaveDailyProgress(todayDp);

        set({ todayRevisionIds: newIds, revisions });
      },

      undoRevision: (userId, modeKey, sectionId) => {
        const { todayRevisionIds, revisions } = get();
        const key = `${modeKey}:${sectionId}`;
        localUndoRevision(userId, modeKey, sectionId);

        const newIds = new Set(todayRevisionIds);
        newIds.delete(key);

        const idx = revisions.findIndex(r => r.modeKey === modeKey && r.sectionId === sectionId);
        const newRevisions = [...revisions];
        if (idx >= 0) newRevisions.splice(idx, 1);

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
        let section = sections.find(s => s.sectionId === sectionId && s.modeKey === modeKey);
        if (!section) return;
        const updated = { ...section, internalCycleMultiplier: multiplier, updatedAt: new Date().toISOString() };
        localSaveSection(updated);
        const newSections = sections.filter(s => !(s.sectionId === sectionId && s.modeKey === modeKey));
        set({ sections: [...newSections, updated] });
      },

      selectSections: (userId, modeKey, sectionIds) => {
        const existing = localGetSections(userId, modeKey);
        const existingMap = new Map(existing.map(s => [s.sectionId, s]));

        const newSections: TrackedSection[] = sectionIds.map(({ id, type }) => {
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
          .filter(s => !sectionIds.find(si => si.id === s.sectionId))
          .map(s => ({ ...s, isSelected: false, groupedCycleEnabled: false }));

        localSaveSections([...newSections, ...deselected]);
        const all = localGetSections(userId, modeKey);
        set({ sections: all });
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
