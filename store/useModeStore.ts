'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackerMode } from '../types/tracker';
import { DEFAULT_MODES } from '../types/modes';

interface ModeState {
  activeMode: string;
  modes: TrackerMode[];
  setActiveMode: (mode: string) => void;
  getModeColor: (modeKey?: string) => string;
  getModeHeaderBg: (modeKey?: string) => string;
}

const MODE_COLORS: Record<string, string> = {
  lecture: '#c92b2b',
  memorisation: '#1a5cd4',
};

const MODE_HEADER_BG: Record<string, string> = {
  lecture: '#c92b2b',
  memorisation: '#1a3a6b',
};

export const useModeStore = create<ModeState>()(
  persist(
    (set, get) => ({
      activeMode: 'lecture',
      modes: DEFAULT_MODES,
      setActiveMode: (mode) => set({ activeMode: mode }),
      getModeColor: (modeKey) => {
        const key = modeKey || get().activeMode;
        return MODE_COLORS[key] || '#c92b2b';
      },
      getModeHeaderBg: (modeKey) => {
        const key = modeKey || get().activeMode;
        return MODE_HEADER_BG[key] || '#c92b2b';
      },
    }),
    { name: 'qt:mode-store' }
  )
);
