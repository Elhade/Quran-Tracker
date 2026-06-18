import { describe, it, expect } from 'vitest';
import type { SectionStatus } from '@/types/tracker';

// Border color logic used in HizbCard, JuzCard (effectiveStatus), SourateCard
const DONE_COLOR  = '#2d7a4f';
const TODAY_COLOR = '#eab308';
const RED         = '#c92b2b';
const GREY        = '#e2ddd6';

function computeBorderColor(status: SectionStatus, daysToNext: number | null): string {
  const isRevised = status === 'done' || status === 'upcoming';
  return isRevised        ? DONE_COLOR
    : daysToNext !== null && daysToNext < 0 ? RED
    : daysToNext === 0    ? TODAY_COLOR
    : GREY;
}

// JuzCard: effectiveStatus = worst status among juz + all tracked hizbs
const STATUS_PRIORITY: Record<string, number> = { overdue: 4, today: 3, new: 2, upcoming: 1, done: 0 };

function computeJuzEffectiveStatus(
  juzStatus: SectionStatus | undefined,
  hizbStatuses: SectionStatus[]
): SectionStatus {
  const base: SectionStatus = juzStatus ?? 'new';
  return hizbStatuses.reduce<SectionStatus>((worst, hs) => {
    return (STATUS_PRIORITY[hs] ?? 0) > (STATUS_PRIORITY[worst] ?? 0) ? hs : worst;
  }, base);
}

describe('Card border color', () => {
  it('done → green', () => {
    expect(computeBorderColor('done', 0)).toBe(DONE_COLOR);
  });

  it('upcoming → green (already revised this cycle)', () => {
    expect(computeBorderColor('upcoming', 10)).toBe(DONE_COLOR);
  });

  it('daysToNext < 0 → red (overdue)', () => {
    expect(computeBorderColor('today', -3)).toBe(RED);
    expect(computeBorderColor('overdue', -1)).toBe(RED);
  });

  it('daysToNext === 0 → yellow (due today)', () => {
    expect(computeBorderColor('today', 0)).toBe(TODAY_COLOR);
  });

  it('new, no nextRevisionDate → grey', () => {
    expect(computeBorderColor('new', null)).toBe(GREY);
  });

  it('upcoming hizb with future daysToNext → green (isRevised takes priority)', () => {
    expect(computeBorderColor('upcoming', 5)).toBe(DONE_COLOR);
  });
});

describe('JuzCard effectiveStatus (worst-child rule)', () => {
  it('all hizbs done → juz effectiveStatus is done', () => {
    const eff = computeJuzEffectiveStatus('done', ['done', 'done']);
    expect(eff).toBe('done');
  });

  it('one hizb overdue → effectiveStatus escalates to overdue', () => {
    const eff = computeJuzEffectiveStatus('upcoming', ['upcoming', 'overdue']);
    expect(eff).toBe('overdue');
  });

  it('one hizb today → effectiveStatus escalates to today', () => {
    const eff = computeJuzEffectiveStatus('done', ['done', 'today']);
    expect(eff).toBe('today');
  });

  it('overdue wins over today', () => {
    const eff = computeJuzEffectiveStatus('today', ['today', 'overdue']);
    expect(eff).toBe('overdue');
  });

  it('all upcoming, juz undefined → effective is new (untracked juz has priority 2 > upcoming priority 1)', () => {
    // STATUS_PRIORITY: overdue=4 > today=3 > new=2 > upcoming=1 > done=0
    // When juz has no section, base is 'new'. 'upcoming' (1) < 'new' (2) → 'new' wins
    const eff = computeJuzEffectiveStatus(undefined, ['upcoming', 'upcoming']);
    expect(eff).toBe('new');
  });

  it('isRevised true when effectiveStatus is done or upcoming', () => {
    expect(['done', 'upcoming'].includes(computeJuzEffectiveStatus('done', ['done', 'done']))).toBe(true);
    expect(['done', 'upcoming'].includes(computeJuzEffectiveStatus('upcoming', ['upcoming', 'upcoming']))).toBe(true);
  });

  it('isRevised false when effectiveStatus is overdue', () => {
    const eff = computeJuzEffectiveStatus('done', ['done', 'overdue']);
    expect(['done', 'upcoming'].includes(eff)).toBe(false);
  });
});
