import type { CycleStats } from '../../types/tracker';
import { today, addDaysToDate} from '../utils/dates';
import { differenceInDays, parseISO } from 'date-fns';

export function computeCycleStats(params: {
  totalSections: number;
  completedSections: number;
  cycleDays: number;
  startDate: string | null;
  revisionsToday: number;
}): CycleStats {
  const { totalSections, completedSections, cycleDays, startDate, revisionsToday } = params;

  if (!startDate || totalSections === 0) {
    return {
      totalSections,
      completedSections,
      remainingSections: totalSections - completedSections,
      daysElapsed: 0,
      daysRemaining: cycleDays,
      targetPerDay: totalSections / Math.max(cycleDays, 1),
      completedToday: revisionsToday,
      isOverdue: false,
      overdueAmount: 0,
      adjustedTargetToday: Math.ceil(totalSections / Math.max(cycleDays, 1)),
      progressPercent: 0,
    };
  }

  const elapsed = Math.max(0, differenceInDays(new Date(), parseISO(startDate)));
  const remaining = Math.max(0, cycleDays - elapsed);
  const targetPerDay = totalSections / cycleDays;
  const expectedCompleted = Math.min(totalSections, targetPerDay * (elapsed + 1));
  const overdue = Math.max(0, expectedCompleted - completedSections - revisionsToday);
  const remaining_sections = totalSections - completedSections;
  const daysLeft = Math.max(1, remaining);
  const adjustedTarget = Math.ceil((remaining_sections + overdue) / daysLeft);

  return {
    totalSections,
    completedSections,
    remainingSections: remaining_sections,
    daysElapsed: elapsed,
    daysRemaining: remaining,
    targetPerDay,
    completedToday: revisionsToday,
    isOverdue: overdue > 0.5,
    overdueAmount: Math.ceil(overdue),
    adjustedTargetToday: adjustedTarget,
    progressPercent: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
  };
}

export function computeNextRevisionDate(
  lastRevisionDate: string | null,
  cycleDays: number,
  difficulty: string | null,
  multiplier: number
): string {
  if (!lastRevisionDate) return today();

  let adjustedDays = cycleDays;
  if (difficulty === 'difficile') adjustedDays = Math.max(1, Math.round(cycleDays * 0.5));
  else if (difficulty === 'moyen') adjustedDays = Math.max(1, Math.round(cycleDays * 0.75));

  if (multiplier > 1) {
    adjustedDays = Math.max(1, Math.round(adjustedDays / multiplier));
  }

  return addDaysToDate(lastRevisionDate, adjustedDays);
}
