import { describe, it, expect } from 'vitest';
import type { SectionWithStatus } from '@/types/tracker';

// Mirrors the formulas in app/page.tsx for viewType === 'juz'
const isDoneThisCycle = (s: SectionWithStatus) => s.status === 'done' || s.status === 'upcoming';
const isTodayRevised = (hizbs: SectionWithStatus[], activeMode: string, todayRevisionIds: Set<string>) =>
  hizbs.filter(h => todayRevisionIds.has(`${activeMode}:${h.sectionId}`)).length;

function makeHizb(id: string, status: SectionWithStatus['status']): SectionWithStatus {
  return {
    sectionId: id,
    sectionType: 'hizb',
    status,
    difficulty: null,
    lastRevisionDate: null,
    nextRevisionDate: null,
    revisionCount: 0,
    cycleRevisionCount: 0,
    individualCycleDays: 30,
    internalCycleMultiplier: 1,
    notes: '',
  };
}

describe('Header KPI — juz view (1 juz = 2 hizbs)', () => {
  describe('headerCycleDone = allHizbs.filter(isDoneThisCycle).length / 2', () => {
    it('returns 0 when no hizb is done', () => {
      const hizbs = [makeHizb('hizb-1', 'today'), makeHizb('hizb-2', 'overdue')];
      expect(hizbs.filter(isDoneThisCycle).length / 2).toBe(0);
    });

    it('returns 0.5 for 1 hizb done (partial juz)', () => {
      const hizbs = [makeHizb('hizb-1', 'done'), makeHizb('hizb-2', 'today')];
      expect(hizbs.filter(isDoneThisCycle).length / 2).toBe(0.5);
    });

    it('returns 1 when both hizbs of a juz are done', () => {
      const hizbs = [makeHizb('hizb-1', 'done'), makeHizb('hizb-2', 'done')];
      expect(hizbs.filter(isDoneThisCycle).length / 2).toBe(1);
    });

    it('counts upcoming as done-this-cycle', () => {
      const hizbs = [makeHizb('hizb-1', 'upcoming'), makeHizb('hizb-2', 'upcoming')];
      expect(hizbs.filter(isDoneThisCycle).length / 2).toBe(1);
    });

    it('returns 1.5 for 3 hizbs done from 3 different juzs', () => {
      const hizbs = [
        makeHizb('hizb-1', 'done'),   // juz-1
        makeHizb('hizb-2', 'today'),  // juz-1 (not done)
        makeHizb('hizb-3', 'done'),   // juz-2
        makeHizb('hizb-4', 'overdue'),// juz-2 (not done)
        makeHizb('hizb-5', 'done'),   // juz-3
        makeHizb('hizb-6', 'new'),    // juz-3 (not done)
      ];
      expect(hizbs.filter(isDoneThisCycle).length / 2).toBe(1.5);
    });

    it('returns 3 when 6 hizbs (3 full juzs) are done', () => {
      const hizbs = Array.from({ length: 6 }, (_, i) => makeHizb(`hizb-${i + 1}`, 'done'));
      expect(hizbs.filter(isDoneThisCycle).length / 2).toBe(3);
    });
  });

  describe('headerTodayDone = allHizbs.filter(isTodayRevised).length / 2', () => {
    const mode = 'lecture';

    it('returns 0 when no hizb was revised today', () => {
      const hizbs = [makeHizb('hizb-1', 'upcoming'), makeHizb('hizb-2', 'upcoming')];
      const todayIds = new Set<string>();
      expect(isTodayRevised(hizbs, mode, todayIds) / 2).toBe(0);
    });

    it('returns 0.5 when 1 hizb was revised today', () => {
      const hizbs = [makeHizb('hizb-1', 'done'), makeHizb('hizb-2', 'today')];
      const todayIds = new Set(['lecture:hizb-1']);
      expect(isTodayRevised(hizbs, mode, todayIds) / 2).toBe(0.5);
    });

    it('returns 1 when both hizbs of a juz were revised today', () => {
      const hizbs = [makeHizb('hizb-1', 'done'), makeHizb('hizb-2', 'done')];
      const todayIds = new Set(['lecture:hizb-1', 'lecture:hizb-2']);
      expect(isTodayRevised(hizbs, mode, todayIds) / 2).toBe(1);
    });

    it('returns 1.5 when 3 hizbs were revised today across 3 different juzs', () => {
      const hizbs = [
        makeHizb('hizb-1', 'done'),
        makeHizb('hizb-2', 'today'),
        makeHizb('hizb-3', 'done'),
        makeHizb('hizb-4', 'today'),
        makeHizb('hizb-5', 'done'),
        makeHizb('hizb-6', 'today'),
      ];
      const todayIds = new Set(['lecture:hizb-1', 'lecture:hizb-3', 'lecture:hizb-5']);
      expect(isTodayRevised(hizbs, mode, todayIds) / 2).toBe(1.5);
    });
  });

  describe('headerCycleTotal fallback', () => {
    it('uses allJuzs.length when juz-level sections exist', () => {
      const allJuzsLength = 3;
      const allHizbsLength = 6;
      const juzTotal = allJuzsLength > 0 ? allJuzsLength : allHizbsLength / 2;
      expect(juzTotal).toBe(3);
    });

    it('falls back to allHizbs / 2 when no juz-level sections', () => {
      const allJuzsLength = 0;
      const allHizbsLength = 6;
      const juzTotal = allJuzsLength > 0 ? allJuzsLength : allHizbsLength / 2;
      expect(juzTotal).toBe(3);
    });
  });
});
