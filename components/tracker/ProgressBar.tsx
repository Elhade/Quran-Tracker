'use client';
import type { CycleStats } from '../../types/tracker';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  stats?: CycleStats;
}

export default function ProgressBar({ value, max = 100, color = '#c92b2b', height = 4, showLabel, stats }: ProgressBarProps) {
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="w-full">
      <div
        className="w-full rounded-full overflow-hidden bg-[#e2ddd6]"
        style={{ height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-[11px] text-[#9c9890]">{value} / {max}</span>
          <span className="text-[11px] font-semibold" style={{ color }}>{percent}%</span>
        </div>
      )}
    </div>
  );
}
