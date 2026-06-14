import { format, formatDistanceToNow, differenceInDays, parseISO, isToday, isBefore, isAfter, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM yyyy', { locale: fr });
}

export function daysAgo(date: string | null): number {
  if (!date) return 999;
  return differenceInDays(new Date(), parseISO(date));
}

export function daysUntil(date: string): number {
  return differenceInDays(parseISO(date), new Date());
}

export function addDaysToDate(date: string, days: number): string {
  return addDays(parseISO(date), days).toISOString().split('T')[0];
}

export function isTodayDate(date: string): boolean {
  return isToday(parseISO(date));
}

export function isPastDate(date: string): boolean {
  const d = parseISO(date);
  const tod = new Date();
  tod.setHours(0, 0, 0, 0);
  return isBefore(d, tod);
}

export function isFutureDate(date: string): boolean {
  const d = parseISO(date);
  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(0, 0, 0, 0);
  return isAfter(d, tomorrow) || d >= tomorrow;
}

export function relativeDays(date: string | null): string {
  if (!date) return 'Jamais';
  const days = daysAgo(date);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Il y a 1 jour';
  return `Il y a ${days} jours`;
}
