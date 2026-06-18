import { describe, it, expect } from 'vitest';
import type { SectionStatus } from '@/types/tracker';

// Mirrors sectionMatches + filteredJuzs logic from app/page.tsx

type StatusFilter = 'all' | 'today' | 'fait';

function sectionMatches(status: SectionStatus, filter: StatusFilter): boolean {
  if (filter === 'all')   return true;
  if (filter === 'fait')  return status === 'done' || status === 'upcoming';
  if (filter === 'today') return status === 'today' || status === 'overdue';
  return false;
}

function juzMatchesFilter(hizbStatuses: SectionStatus[], filter: StatusFilter): boolean {
  if (filter === 'all')   return true;
  if (filter === 'fait')  return hizbStatuses.every(s => sectionMatches(s, filter));
  return hizbStatuses.some(s => sectionMatches(s, filter));
}

describe('juz filter — "fait" (revisé)', () => {
  it('juz with ALL hizbs done → matches', () => {
    expect(juzMatchesFilter(['done', 'done'], 'fait')).toBe(true);
  });

  it('juz with ALL hizbs upcoming → matches', () => {
    expect(juzMatchesFilter(['upcoming', 'upcoming'], 'fait')).toBe(true);
  });

  it('juz with mixed done+upcoming → matches', () => {
    expect(juzMatchesFilter(['done', 'upcoming'], 'fait')).toBe(true);
  });

  it('juz with ONE hizb not done → does NOT match', () => {
    expect(juzMatchesFilter(['done', 'today'], 'fait')).toBe(false);
  });

  it('juz with ALL hizbs overdue → does NOT match', () => {
    expect(juzMatchesFilter(['overdue', 'overdue'], 'fait')).toBe(false);
  });

  it('juz with ALL hizbs new → does NOT match', () => {
    expect(juzMatchesFilter(['new', 'new'], 'fait')).toBe(false);
  });
});

describe('juz filter — "today"', () => {
  it('juz with one hizb due today → matches', () => {
    expect(juzMatchesFilter(['upcoming', 'today'], 'today')).toBe(true);
  });

  it('juz with one hizb overdue → matches', () => {
    expect(juzMatchesFilter(['done', 'overdue'], 'today')).toBe(true);
  });

  it('juz with all hizbs done/upcoming → does NOT match', () => {
    expect(juzMatchesFilter(['done', 'upcoming'], 'today')).toBe(false);
  });

  it('juz with all hizbs new → does NOT match today filter', () => {
    expect(juzMatchesFilter(['new', 'new'], 'today')).toBe(false);
  });
});

describe('juz filter — "all"', () => {
  it('always returns true regardless of statuses', () => {
    expect(juzMatchesFilter(['new', 'overdue'], 'all')).toBe(true);
    expect(juzMatchesFilter(['done', 'done'], 'all')).toBe(true);
  });
});
