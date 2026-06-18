import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeSectionStatus, isSectionDueToday } from '../status-engine';

// Pin "today" to 2026-01-15 for all tests
const FIXED_TODAY = new Date('2026-01-15T12:00:00Z');

describe('computeSectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });
  afterEach(() => vi.useRealTimers());

  it('returns new when no last revision', () => {
    expect(computeSectionStatus(null, null, 30)).toBe('new');
  });

  it('returns overdue when nextRevisionDate is in the past', () => {
    expect(computeSectionStatus('2026-01-01', '2026-01-14', 30)).toBe('overdue');
  });

  it('returns today when nextRevisionDate is today', () => {
    expect(computeSectionStatus('2026-01-01', '2026-01-15', 30)).toBe('today');
  });

  it('returns upcoming when nextRevisionDate is in the future', () => {
    expect(computeSectionStatus('2026-01-10', '2026-01-20', 30)).toBe('upcoming');
  });

  it('returns overdue when no nextRevisionDate and daysSince >= cycleDays', () => {
    // revised 30 days ago → overdue
    expect(computeSectionStatus('2025-12-16', null, 30)).toBe('overdue');
  });

  it('returns today when no nextRevisionDate and daysSince === cycleDays - 1', () => {
    // revised 29 days ago with cycleDays=30 → due today
    expect(computeSectionStatus('2025-12-17', null, 30)).toBe('today');
  });

  it('returns upcoming when no nextRevisionDate and daysSince < cycleDays - 1', () => {
    // revised 5 days ago with cycleDays=30 → still upcoming
    expect(computeSectionStatus('2026-01-10', null, 30)).toBe('upcoming');
  });
});

describe('isSectionDueToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });
  afterEach(() => vi.useRealTimers());

  it('returns true for today status', () => {
    expect(isSectionDueToday('2026-01-01', '2026-01-15', 30)).toBe(true);
  });

  it('returns true for overdue status', () => {
    expect(isSectionDueToday('2026-01-01', '2026-01-14', 30)).toBe(true);
  });

  it('returns false for upcoming status', () => {
    expect(isSectionDueToday('2026-01-10', '2026-01-20', 30)).toBe(false);
  });

  it('returns false for new status', () => {
    expect(isSectionDueToday(null, null, 30)).toBe(false);
  });
});
