import type { SectionType, ModeKey } from './quran';

export type DifficultyLevel = 'facile' | 'moyen' | 'difficile';

export type SectionStatus =
  | 'today'
  | 'done'
  | 'upcoming'
  | 'overdue'
  | 'new';

export type TrackingLevel = 'juz' | 'hizb' | 'rub' | 'sourate' | 'page' | 'ayah';

export type CycleType = 'grouped' | 'individual';

export interface TrackerMode {
  key: ModeKey;
  label: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface ModeSettings {
  cycleDays: number;
  cycleStartDate: string | null;
}

export interface TrackerSettings {
  userId: string;
  activeMode: ModeKey;
  primaryTrackingLevel: TrackingLevel;
  groupedCycleDays: number;         // kept for backward-compat migration
  groupedCycleStartDate: string | null; // kept for backward-compat migration
  quranTextEnabled: boolean;
  mushafPagesEnabled: boolean;
  notificationsEnabled: boolean;
  modes: Record<string, ModeSettings>;
}

export interface TrackedSection {
  id: string;
  userId: string;
  modeKey: ModeKey;
  sectionType: SectionType;
  sectionId: string;
  isSelected: boolean;
  groupedCycleEnabled: boolean;
  individualCycleEnabled: boolean;
  individualCycleDays: number;
  internalCycleMultiplier: number;
  difficulty: DifficultyLevel | null;
  notes: string;
  updatedAt: string;
  createdAt: string;
}

export interface RevisionLog {
  id: string;
  userId: string;
  modeKey: ModeKey;
  sectionType: SectionType;
  sectionId: string;
  revisionDate: string;
  cycleId: string | null;
  difficultyAtRevision: DifficultyLevel | null;
  sourceAction: string;
  createdAt: string;
}

export interface Cycle {
  id: string;
  userId: string;
  modeKey: ModeKey;
  type: CycleType;
  startDate: string;
  endDate: string;
  days: number;
  status: 'active' | 'completed' | 'abandoned';
  completionPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyProgress {
  id: string;
  userId: string;
  modeKey: ModeKey;
  date: string;
  targetCount: number;
  completedCount: number;
  missedCount: number;
  isComplete: boolean;
  createdAt: string;
}

export interface UserNote {
  id: string;
  userId: string;
  sectionType: SectionType;
  sectionId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionWithStatus {
  sectionId: string;
  sectionType: SectionType;
  status: SectionStatus;
  difficulty: DifficultyLevel | null;
  lastRevisionDate: string | null;
  nextRevisionDate: string | null;
  revisionCount: number;
  cycleRevisionCount: number;
  individualCycleDays: number;
  internalCycleMultiplier: number;
  notes: string;
}

export interface CycleStats {
  totalSections: number;
  completedSections: number;
  remainingSections: number;
  daysElapsed: number;
  daysRemaining: number;
  targetPerDay: number;
  completedToday: number;
  isOverdue: boolean;
  overdueAmount: number;
  adjustedTargetToday: number;
  progressPercent: number;
}

export interface AppStats {
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  totalRevisions: number;
  completedCycles: number;
  currentCycleProgress: number;
  difficultyDistribution: {
    facile: number;
    moyen: number;
    difficile: number;
  };
}

export interface OnboardingData {
  trackingLevel: TrackingLevel;
  activeModes: ModeKey[];
  defaultCycleDays: number;
  scope: 'full' | 'partial';
  selectedJuzIds?: string[];
  quranTextEnabled: boolean;
  mushafPagesEnabled: boolean;
  dailyGoal?: number;
}
