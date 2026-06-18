import { describe, it, expect } from 'vitest';
import { JUZS, HIZBS } from '@/data/quran/quran-structure';

// ── Summary count helpers (from app/config/page.tsx) ──────────────────────

function selectedHizbCount(ids: Set<string>): number {
  return Array.from(ids).filter(id => id.startsWith('hizb-')).length;
}

function selectedJuzCount(ids: Set<string>): number {
  return Array.from(ids).filter(id => id.startsWith('juz-')).length;
}

function selectedPageCount(ids: Set<string>): number {
  return HIZBS
    .filter(h => ids.has(h.id))
    .reduce((sum, h) => sum + (h.pageEnd - h.pageStart + 1), 0);
}

function hizbPerDay(hizbCount: number, cycleDays: number): string {
  return cycleDays > 0 && hizbCount > 0
    ? (hizbCount / cycleDays).toFixed(1)
    : '0';
}

function pagesPerDay(pageCount: number, cycleDays: number): number {
  return cycleDays > 0 && pageCount > 0
    ? Math.round(pageCount / cycleDays)
    : 0;
}

function sectionLabel(
  ids: Set<string>,
  surahCount: number = 0,
): string {
  const juzCnt  = selectedJuzCount(ids);
  const hizbCnt = selectedHizbCount(ids);
  const pageCnt = selectedPageCount(ids);
  const parts: string[] = [];
  if (juzCnt > 0 && hizbCnt === juzCnt * 2) {
    parts.push(`${juzCnt} juz`);
  } else if (hizbCnt > 0) {
    parts.push(`${hizbCnt} hizb`);
  }
  if (surahCount > 0) parts.push(`${surahCount} sourate`);
  if (pageCnt > 0) parts.push(`${pageCnt} pages`);
  return parts.join(' · ');
}

// ── Count computations ─────────────────────────────────────────────────────

describe('selectedHizbCount / selectedJuzCount', () => {
  it('empty set → 0 each', () => {
    expect(selectedHizbCount(new Set())).toBe(0);
    expect(selectedJuzCount(new Set())).toBe(0);
  });

  it('juz-1 + hizb-1 + hizb-2 → 1 juz, 2 hizbs', () => {
    const ids = new Set(['juz-1', 'hizb-1', 'hizb-2']);
    expect(selectedJuzCount(ids)).toBe(1);
    expect(selectedHizbCount(ids)).toBe(2);
  });

  it('full Quran: 30 juzs + 60 hizbs', () => {
    const all = new Set([...JUZS.map(j => j.id), ...HIZBS.map(h => h.id)]);
    expect(selectedJuzCount(all)).toBe(30);
    expect(selectedHizbCount(all)).toBe(60);
  });

  it('only hizbs (no juz entries) → 0 juz count', () => {
    const ids = new Set(['hizb-1', 'hizb-2']);
    expect(selectedJuzCount(ids)).toBe(0);
    expect(selectedHizbCount(ids)).toBe(2);
  });
});

describe('selectedPageCount', () => {
  it('empty set → 0 pages', () => {
    expect(selectedPageCount(new Set())).toBe(0);
  });

  it('juz-1: hizb-1 (p.1-10=10) + hizb-2 (p.11-21=11) = 21 pages', () => {
    expect(selectedPageCount(new Set(['hizb-1', 'hizb-2']))).toBe(21);
  });

  it('juz-1 hizb-1 only → 10 pages', () => {
    expect(selectedPageCount(new Set(['hizb-1']))).toBe(10);
  });

  it('full Quran (all 60 hizbs) → 604 pages', () => {
    const allHizbs = new Set(HIZBS.map(h => h.id));
    expect(selectedPageCount(allHizbs)).toBe(604);
  });

  it('juz IDs in set are ignored (only hizb- IDs count)', () => {
    // Adding juz-1 ID should not change the page count already provided by hizbs
    const ids = new Set(['juz-1', 'hizb-1', 'hizb-2']);
    expect(selectedPageCount(ids)).toBe(21);
  });
});

// ── Daily target computations ──────────────────────────────────────────────

describe('hizbPerDay', () => {
  it('60 hizbs / 30 days = "2.0"', () => {
    expect(hizbPerDay(60, 30)).toBe('2.0');
  });

  it('2 hizbs / 7 days = "0.3"', () => {
    expect(hizbPerDay(2, 7)).toBe('0.3');
  });

  it('60 hizbs / 7 days = "8.6"', () => {
    expect(hizbPerDay(60, 7)).toBe('8.6');
  });

  it('0 hizbs → "0" regardless of cycle', () => {
    expect(hizbPerDay(0, 30)).toBe('0');
  });

  it('any hizbs / 0 days → "0" (guard against division by zero)', () => {
    expect(hizbPerDay(60, 0)).toBe('0');
  });

  it('1 hizb / 1 day = "1.0"', () => {
    expect(hizbPerDay(1, 1)).toBe('1.0');
  });
});

describe('pagesPerDay', () => {
  it('604 pages / 30 days = 20 pages (rounded)', () => {
    expect(pagesPerDay(604, 30)).toBe(20);
  });

  it('21 pages / 7 days = 3 pages', () => {
    expect(pagesPerDay(21, 7)).toBe(3);
  });

  it('604 pages / 7 days = 86 pages (rounded)', () => {
    expect(pagesPerDay(604, 7)).toBe(86);
  });

  it('0 pages → 0 regardless of cycle', () => {
    expect(pagesPerDay(0, 30)).toBe(0);
  });

  it('any pages / 0 days → 0 (guard against division by zero)', () => {
    expect(pagesPerDay(604, 0)).toBe(0);
  });

  it('rounds correctly: 10 pages / 3 days = 3 (not 3.33)', () => {
    expect(pagesPerDay(10, 3)).toBe(3);
  });

  it('rounds correctly: 11 pages / 3 days = 4 (round up)', () => {
    expect(pagesPerDay(11, 3)).toBe(4);
  });
});

// ── Section label smart display ────────────────────────────────────────────

describe('sectionLabel', () => {
  it('empty → empty string', () => {
    expect(sectionLabel(new Set())).toBe('');
  });

  it('1 juz (juz+2 hizbs) → "1 juz · 21 pages"', () => {
    const ids = new Set(['juz-1', 'hizb-1', 'hizb-2']);
    expect(sectionLabel(ids)).toBe('1 juz · 21 pages');
  });

  it('2 full juzs → "2 juz · N pages"', () => {
    const ids = new Set(['juz-1', 'hizb-1', 'hizb-2', 'juz-2', 'hizb-3', 'hizb-4']);
    const juz1Pages = 21; // hizb-1(10) + hizb-2(11)
    const juz2Pages = 20; // hizb-3(10) + hizb-4(10) → computed from data
    const expected = `2 juz · ${juz1Pages + juz2Pages} pages`;
    expect(sectionLabel(ids)).toBe(expected);
  });

  it('hizbs without parent juz → shows hizb count', () => {
    const ids = new Set(['hizb-1', 'hizb-2']); // no 'juz-1'
    expect(sectionLabel(ids)).toBe('2 hizb · 21 pages');
  });

  it('mixed: juz-1 + extra hizb from juz-2 → shows hizb count (not juz)', () => {
    // 1 juz but 3 hizbs → selectedHizbCount (3) ≠ juzCount (1) * 2 (2)
    const ids = new Set(['juz-1', 'hizb-1', 'hizb-2', 'hizb-3']);
    const pages = 10 + 11 + 10; // hizb-1(10) + hizb-2(11) + hizb-3(10)
    expect(sectionLabel(ids)).toBe(`3 hizb · ${pages} pages`);
  });

  it('with sourates: includes sourate count in label', () => {
    const ids = new Set(['juz-1', 'hizb-1', 'hizb-2']);
    expect(sectionLabel(ids, 2)).toBe('1 juz · 2 sourate · 21 pages');
  });

  it('full Quran: 30 juzs + 60 hizbs → "30 juz · 604 pages"', () => {
    const all = new Set([...JUZS.map(j => j.id), ...HIZBS.map(h => h.id)]);
    expect(sectionLabel(all)).toBe('30 juz · 604 pages');
  });

  it('only 1 hizb selected → shows hizb (not juz)', () => {
    expect(sectionLabel(new Set(['hizb-1']))).toBe('1 hizb · 10 pages');
  });
});

// ── Real cycle scenarios ───────────────────────────────────────────────────

describe('Full cycle reading targets', () => {
  it('full Quran in 30-day cycle: ~2 hizbs/day, ~20 pages/day', () => {
    const allHizbs = new Set(HIZBS.map(h => h.id));
    const pages = selectedPageCount(allHizbs); // 604
    expect(hizbPerDay(60, 30)).toBe('2.0');
    expect(pagesPerDay(pages, 30)).toBe(20);
  });

  it('full Quran in 7-day cycle: ~9 hizbs/day, ~86 pages/day', () => {
    const allHizbs = new Set(HIZBS.map(h => h.id));
    const pages = selectedPageCount(allHizbs); // 604
    expect(hizbPerDay(60, 7)).toBe('8.6');
    expect(pagesPerDay(pages, 7)).toBe(86);
  });

  it('Juz 1 only in 7-day cycle: 0.3 hizbs/day, 3 pages/day', () => {
    const ids = new Set(['hizb-1', 'hizb-2']);
    const hizbs = selectedHizbCount(ids); // 2
    const pages = selectedPageCount(ids); // 21
    expect(hizbPerDay(hizbs, 7)).toBe('0.3');
    expect(pagesPerDay(pages, 7)).toBe(3);
  });
});
