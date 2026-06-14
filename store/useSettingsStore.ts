'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackerSettings } from '../types/tracker';
import type { TrackingLevel } from '../types/tracker';

interface SettingsState {
  settings: TrackerSettings | null;
  isOnboardingCompleted: boolean;
  setSettings: (settings: TrackerSettings) => void;
  updateSettings: (partial: Partial<TrackerSettings>) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: TrackerSettings = {
  userId: 'local-user',
  activeMode: 'lecture',
  primaryTrackingLevel: 'hizb',
  groupedCycleDays: 7,
  groupedCycleStartDate: null,
  quranTextEnabled: true,
  mushafPagesEnabled: true,
  notificationsEnabled: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: null,
      isOnboardingCompleted: false,
      setSettings: (settings) => set({ settings }),
      updateSettings: (partial) => {
        const current = get().settings || DEFAULT_SETTINGS;
        set({ settings: { ...current, ...partial } });
      },
      completeOnboarding: () => set({ isOnboardingCompleted: true }),
      reset: () => set({ settings: null, isOnboardingCompleted: false }),
    }),
    { name: 'qt:settings-store' }
  )
);
