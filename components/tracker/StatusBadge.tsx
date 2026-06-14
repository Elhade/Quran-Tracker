'use client';
import type { SectionStatus } from '../../types/tracker';
import { getStatusLabel, getStatusColor } from '../../lib/tracker/status-engine';

interface StatusBadgeProps {
  status: SectionStatus;
  compact?: boolean;
}

export default function StatusBadge({ status, compact }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  const bgOpacity = 0.1;
  const bg = status === 'done' ? 'rgba(45,122,79,0.1)'
    : status === 'overdue' ? 'rgba(201,43,43,0.1)'
    : status === 'today' ? 'rgba(184,132,26,0.1)'
    : 'rgba(156,152,144,0.1)';

  if (compact) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: color }}
        title={label}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}
