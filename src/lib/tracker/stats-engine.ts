import type { AppStats, DailyProgress } from '../../types/tracker';
import { today, daysAgo } from '../utils/dates';

export function computeStreak(dailyProgress: DailyProgress[]): { current: number; best: number } {
  if (!dailyProgress.length) return { current: 0, best: 0 };

  const sorted = [...dailyProgress].sort((a, b) => b.date.localeCompare(a.date));
  let current = 0;
  let best = 0;
  let streak = 0;
  let previousDate: string | null = null;

  for (const dp of sorted) {
    if (!dp.isComplete) {
      if (streak > best) best = streak;
      streak = 0;
      previousDate = null;
      continue;
    }

    if (!previousDate) {
      streak = 1;
    } else {
      const diff = daysAgo(dp.date) - daysAgo(previousDate);
      if (Math.abs(diff) === 1) {
        streak++;
      } else {
        if (streak > best) best = streak;
        streak = 1;
      }
    }
    previousDate = dp.date;
  }

  if (streak > best) best = streak;
  if (sorted[0]?.isComplete) current = streak;

  return { current, best };
}

export function computeAppStats(params: {
  dailyProgress: DailyProgress[];
  totalRevisions: number;
  completedCycles: number;
  currentCycleProgress: number;
  difficultyDistribution: { facile: number; moyen: number; difficile: number };
}): AppStats {
  const { current, best } = computeStreak(params.dailyProgress);
  const activeDays = params.dailyProgress.filter(d => d.completedCount > 0).length;

  return {
    currentStreak: current,
    longestStreak: best,
    activeDays,
    totalRevisions: params.totalRevisions,
    completedCycles: params.completedCycles,
    currentCycleProgress: params.currentCycleProgress,
    difficultyDistribution: params.difficultyDistribution,
  };
}
