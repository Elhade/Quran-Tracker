'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackerSettings, ModeSettings, TrackingLevel } from '../types/tracker';

const DEFAULT_MODE_SETTINGS: ModeSettings = { cycleDays: 7, cycleStartDate: null };

const DEFAULT_SETTINGS: TrackerSettings = {
  userId: 'local-user',
  activeMode: 'lecture',
  primaryTrackingLevel: 'hizb',
  groupedCycleDays: 7,
  groupedCycleStartDate: null,
  quranTextEnabled: true,
  mushafPagesEnabled: true,
  notificationsEnabled: false,
  modes: {
    lecture: { cycleDays: 7, cycleStartDate: null },
    memorisation: { cycleDays: 7, cycleStartDate: null },
  },
};

interface SettingsState {
  settings: TrackerSettings | null;
  isOnboardingCompleted: boolean;
  setSettings: (settings: TrackerSettings) => void;
  updateSettings: (partial: Partial<TrackerSettings>) => void;
  getModeSettings: (modeKey: string) => ModeSettings;
  updateModeSettings: (modeKey: string, partial: Partial<ModeSettings>) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

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
      getModeSettings: (modeKey) => {
        const s = get().settings || DEFAULT_SETTINGS;
        const perMode = s.modes?.[modeKey];
        if (perMode) return perMode;
        // backward-compat: migrate from old flat fields
        return { cycleDays: s.groupedCycleDays ?? 7, cycleStartDate: s.groupedCycleStartDate ?? null };
      },
      updateModeSettings: (modeKey, partial) => {
        const current = get().settings || DEFAULT_SETTINGS;
        const existing = current.modes?.[modeKey] || DEFAULT_MODE_SETTINGS;
        set({
          settings: {
            ...current,
            modes: { ...(current.modes || {}), [modeKey]: { ...existing, ...partial } },
          },
        });
      },
      completeOnboarding: () => set({ isOnboardingCompleted: true }),
      reset: () => set({ settings: null, isOnboardingCompleted: false }),
    }),
    { name: 'qt:settings-store' }
  )
);
