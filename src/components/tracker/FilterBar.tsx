'use client';
import type { SectionStatus } from '@/types/tracker';

export type ViewType = 'juz' | 'hizb' | 'sourate';
type StatusFilter = SectionStatus | 'all';

interface FilterBarProps {
  viewType: ViewType;
  onViewType: (v: ViewType) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (v: StatusFilter) => void;
  color: string;
  counts: Partial<Record<StatusFilter, number>>;
}

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'juz', label: 'Juz' },
  { key: 'hizb', label: 'Hizb' },
  { key: 'sourate', label: 'Sourate' },
];

const STATUS_CHIPS: { key: StatusFilter; label: string; dot: string }[] = [
  { key: 'all',      label: 'Tous',          dot: '#9c9890' },
  { key: 'today',    label: "Aujourd'hui",   dot: '#b8841a' },
  { key: 'new',      label: 'Non lu',        dot: '#9c9890' },
  { key: 'done',     label: 'Fait',          dot: '#2d7a4f' },
  { key: 'upcoming', label: 'À venir',       dot: '#5c8ef0' },
];

export default function FilterBar({
  viewType, onViewType, statusFilter, onStatusFilter, color, counts,
}: FilterBarProps) {
  return (
    <div className="space-y-2">
      {/* View type */}
      <div className="flex bg-white rounded-xl p-1 border border-[#e2ddd6]">
        {VIEWS.map(({ key, label }) => {
          const active = viewType === key;
          return (
            <button
              key={key}
              onClick={() => onViewType(key)}
              className="flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all"
              style={active ? { background: color, color: '#fff' } : { color: '#9c9890' }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {STATUS_CHIPS.map(({ key, label, dot }) => {
          const active = statusFilter === key;
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => onStatusFilter(key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border"
              style={active
                ? { background: color, color: '#fff', borderColor: color }
                : { background: '#fff', color: '#5c5852', borderColor: '#e2ddd6' }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: active ? 'rgba(255,255,255,0.75)' : dot }}
              />
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold"
                  style={active
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: `${dot}20`, color: dot }
                  }
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
