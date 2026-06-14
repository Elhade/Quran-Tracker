import type { TrackerMode } from './tracker';

export const DEFAULT_MODES: TrackerMode[] = [
  {
    key: 'lecture',
    label: 'Lecture',
    color: '#c92b2b',
    isDefault: true,
    isActive: true,
  },
  {
    key: 'memorisation',
    label: 'Memorisation',
    color: '#1a5cd4',
    isDefault: true,
    isActive: true,
  },
];

export const MODE_COLORS: Record<string, { primary: string; bg: string; border: string; header: string }> = {
  lecture: {
    primary: '#c92b2b',
    bg: '#f9e6e6',
    border: '#e8c0c0',
    header: '#c92b2b',
  },
  memorisation: {
    primary: '#1a5cd4',
    bg: '#e6effe',
    border: '#b3cdfc',
    header: '#1a3a6b',
  },
  individuel: {
    primary: '#1a2a1e',
    bg: '#e8f5ee',
    border: '#b8e0c9',
    header: '#1a2a1e',
  },
};
