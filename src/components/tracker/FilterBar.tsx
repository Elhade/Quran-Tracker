'use client';

export type ViewType     = 'juz' | 'hizb' | 'sourate';
export type StatusFilter = 'all' | 'non_fait' | 'fait' | 'facile' | 'moyen' | 'difficile';

interface FilterBarProps {
  viewType: ViewType;
  onViewType: (v: ViewType) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (v: StatusFilter) => void;
  color: string;
  counts: Partial<Record<StatusFilter, number>>;
  mode?: string;
}

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'juz',     label: 'Juz' },
  { key: 'hizb',    label: 'Hizb' },
  { key: 'sourate', label: 'Sourate' },
];

const getStatusChips = (mode?: string): { key: StatusFilter; label: string; dot: string }[] => [
  { key: 'all',      label: 'Tout',                                          dot: '#9c9890' },
  { key: 'non_fait', label: 'En attente',                                    dot: '#b8841a' },
  { key: 'fait',     label: mode === 'lecture' ? 'Lu' : 'Revisé',           dot: '#2d7a4f' },
];

const DIFF_CHIPS: { key: StatusFilter; label: string; dot: string; activeColor: string }[] = [
  { key: 'facile',    label: 'Facile',    dot: '#1a7a3c', activeColor: '#1a7a3c' },
  { key: 'moyen',     label: 'Moyen',     dot: '#b8841a', activeColor: '#b8841a' },
  { key: 'difficile', label: 'Difficile', dot: '#c92b2b', activeColor: '#c92b2b' },
];

function Chip({
  label, dot, active, activeColor, count, color, onClick,
}: {
  label: string; dot: string; active: boolean;
  activeColor?: string; count?: number; color: string;
  onClick: () => void;
}) {
  const bg = active ? (activeColor ?? color) : '#fff';
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border"
      style={active
        ? { background: bg, color: '#fff', borderColor: 'transparent' }
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
}

export default function FilterBar({
  viewType, onViewType, statusFilter, onStatusFilter, color, counts, mode,
}: FilterBarProps) {
  const STATUS_CHIPS = getStatusChips(mode);
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

      {/* Row 1 — statut */}
      <div className="flex gap-1.5">
        {STATUS_CHIPS.map(({ key, label, dot }) => (
          <Chip
            key={key}
            label={label}
            dot={dot}
            active={statusFilter === key}
            count={counts[key]}
            color={color}
            onClick={() => onStatusFilter(key)}
          />
        ))}
      </div>

      {/* Row 2 — difficulté (hizb + sourate) */}
      {(viewType === 'hizb' || viewType === 'sourate') && <div className="flex gap-1.5">
        {DIFF_CHIPS.map(({ key, label, dot, activeColor }) => (
          <Chip
            key={key}
            label={label}
            dot={dot}
            active={statusFilter === key}
            activeColor={activeColor}
            count={counts[key]}
            color={color}
            onClick={() => onStatusFilter(key)}
          />
        ))}
      </div>}
    </div>
  );
}
