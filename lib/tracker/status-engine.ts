import type { SectionStatus } from '../../types/tracker';
import { today, isPastDate, isTodayDate, daysAgo } from '../utils/dates';

export function computeSectionStatus(
  lastRevisionDate: string | null,
  nextRevisionDate: string | null,
  cycleDays: number
): SectionStatus {
  if (!lastRevisionDate) return 'new';

  const daysSince = daysAgo(lastRevisionDate);

  if (nextRevisionDate) {
    if (isPastDate(nextRevisionDate) && !isTodayDate(nextRevisionDate)) return 'overdue';
    if (isTodayDate(nextRevisionDate) || isPastDate(nextRevisionDate)) return 'today';
    return 'upcoming';
  }

  if (daysSince >= cycleDays) return 'overdue';
  if (daysSince === cycleDays - 1) return 'today';
  return 'upcoming';
}

export function isSectionDueToday(
  lastRevisionDate: string | null,
  nextRevisionDate: string | null,
  cycleDays: number
): boolean {
  const status = computeSectionStatus(lastRevisionDate, nextRevisionDate, cycleDays);
  return status === 'today' || status === 'overdue';
}

export function getStatusLabel(status: SectionStatus): string {
  const labels: Record<SectionStatus, string> = {
    today: "A lire aujourd'hui",
    done: 'Deja lu ce cycle',
    upcoming: 'A venir',
    overdue: 'En retard',
    new: 'Nouveau',
  };
  return labels[status];
}

export function getStatusColor(status: SectionStatus): string {
  const colors: Record<SectionStatus, string> = {
    today: '#b8841a',
    done: '#2d7a4f',
    upcoming: '#9c9890',
    overdue: '#c92b2b',
    new: '#9c9890',
  };
  return colors[status];
}
