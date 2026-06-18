import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeNextRevisionDate, computeCycleStats } from '../cycle-engine';

const FIXED_TODAY = new Date('2026-01-15T12:00:00Z');

describe('computeNextRevisionDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });
  afterEach(() => vi.useRealTimers());

  it('returns today when no last revision', () => {
    expect(computeNextRevisionDate(null, 30, null, 1)).toBe('2026-01-15');
  });

  it('adds cycleDays with no difficulty adjustment', () => {
    expect(computeNextRevisionDate('2026-01-15', 30, null, 1)).toBe('2026-02-14');
  });

  it('does not adjust days for facile difficulty', () => {
    expect(computeNextRevisionDate('2026-01-15', 30, 'facile', 1)).toBe('2026-02-14');
  });

  it('halves cycle days for difficile difficulty', () => {
    // round(30 * 0.5) = 15
    expect(computeNextRevisionDate('2026-01-15', 30, 'difficile', 1)).toBe('2026-01-30');
  });

  it('applies 0.75 factor for moyen difficulty', () => {
    // round(30 * 0.75) = 23 (round(22.5) = 23 in JS)
    expect(computeNextRevisionDate('2026-01-15', 30, 'moyen', 1)).toBe('2026-02-07');
  });

  it('divides adjusted days by multiplier=2', () => {
    // 30 / 2 = 15 days
    expect(computeNextRevisionDate('2026-01-15', 30, null, 2)).toBe('2026-01-30');
  });

  it('divides adjusted days by multiplier=3', () => {
    // round(30 / 3) = 10 days
    expect(computeNextRevisionDate('2026-01-15', 30, null, 3)).toBe('2026-01-25');
  });

  it('stacks difficile + multiplier=2', () => {
    // difficile: round(30 * 0.5) = 15, then / 2 = round(7.5) = 8 days
    expect(computeNextRevisionDate('2026-01-15', 30, 'difficile', 2)).toBe('2026-01-23');
  });

  it('never returns less than 1 day from last revision', () => {
    // cycleDays=1, difficile → max(1, round(1*0.5)) = max(1, 1) = 1
    expect(computeNextRevisionDate('2026-01-15', 1, 'difficile', 1)).toBe('2026-01-16');
  });
});

describe('computeCycleStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });
  afterEach(() => vi.useRealTimers());

  it('returns defaults when no startDate', () => {
    const stats = computeCycleStats({
      totalSections: 30,
      completedSections: 5,
      cycleDays: 30,
      startDate: null,
      revisionsToday: 0,
    });
    expect(stats.daysElapsed).toBe(0);
    expect(stats.isOverdue).toBe(false);
    expect(stats.progressPercent).toBe(0);
  });

  it('computes elapsed days and remaining correctly', () => {
    // startDate 5 days ago
    const stats = computeCycleStats({
      totalSections: 30,
      completedSections: 10,
      cycleDays: 30,
      startDate: '2026-01-10',
      revisionsToday: 0,
    });
    expect(stats.daysElapsed).toBe(5);
    expect(stats.daysRemaining).toBe(25);
    expect(stats.targetPerDay).toBe(1);
  });

  it('detects overdue when behind schedule', () => {
    // 5 days elapsed, target = 1/day → expected = 6 total, only 2 done → overdue
    const stats = computeCycleStats({
      totalSections: 30,
      completedSections: 2,
      cycleDays: 30,
      startDate: '2026-01-10',
      revisionsToday: 0,
    });
    expect(stats.isOverdue).toBe(true);
    expect(stats.overdueAmount).toBeGreaterThan(0);
  });

  it('not overdue when on schedule', () => {
    // 5 days elapsed, target = 1/day → expected ≤ 6, 6 done → on schedule
    const stats = computeCycleStats({
      totalSections: 30,
      completedSections: 6,
      cycleDays: 30,
      startDate: '2026-01-10',
      revisionsToday: 0,
    });
    expect(stats.isOverdue).toBe(false);
  });

  it('counts progressPercent correctly', () => {
    const stats = computeCycleStats({
      totalSections: 30,
      completedSections: 15,
      cycleDays: 30,
      startDate: '2026-01-10',
      revisionsToday: 0,
    });
    expect(stats.progressPercent).toBe(50);
  });
});
