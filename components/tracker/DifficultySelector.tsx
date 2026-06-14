'use client';
import type { DifficultyLevel } from '../../types/tracker';

interface DifficultySelectorProps {
  value: DifficultyLevel | null;
  onChange: (difficulty: DifficultyLevel | null) => void;
  compact?: boolean;
}

const OPTIONS: { key: DifficultyLevel; label: string; color: string }[] = [
  { key: 'facile', label: 'Facile', color: '#1a7a3c' },
  { key: 'moyen', label: 'Moyen', color: '#b8841a' },
  { key: 'difficile', label: 'Difficile', color: '#c92b2b' },
];

export default function DifficultySelector({ value, onChange, compact }: DifficultySelectorProps) {
  return (
    <div className={`flex gap-1.5 ${compact ? '' : 'w-full'}`}>
      {OPTIONS.map(opt => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(active ? null : opt.key)}
            className="flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all border"
            style={
              active
                ? { background: opt.color, color: '#fff', borderColor: opt.color }
                : { background: 'transparent', color: opt.color, borderColor: `${opt.color}40` }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
