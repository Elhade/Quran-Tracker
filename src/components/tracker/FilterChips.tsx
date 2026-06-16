'use client';
import type { SectionStatus } from '../../types/tracker';

type FilterValue = SectionStatus | 'all';

interface FilterChipsProps {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  color?: string;
  counts?: Partial<Record<FilterValue, number>>;
}

const CHIPS: { key: FilterValue; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'today', label: "Aujourd'hui" },
  { key: 'overdue', label: 'En retard' },
  { key: 'done', label: 'Faits' },
  { key: 'upcoming', label: 'A venir' },
  { key: 'new', label: 'Nouveau' },
];

export default function FilterChips({ value, onChange, color = '#c92b2b', counts }: FilterChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {CHIPS.map(chip => {
        const active = value === chip.key;
        const count = counts?.[chip.key];
        return (
          <button
            key={chip.key}
            onClick={() => onChange(chip.key)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border"
            style={
              active
                ? { background: color, color: '#fff', borderColor: color }
                : { background: '#fff', color: '#5c5852', borderColor: '#e2ddd6' }
            }
          >
            {chip.label}
            {count !== undefined && count > 0 && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                style={active ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: color, color: '#fff' }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
