'use client';
import type { CycleStats } from '../../types/tracker';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import ProgressBar from './ProgressBar';

interface TrackerHeaderProps {
  modeLabel: string;
  modeColor: string;
  todayCount: number;
  stats: CycleStats | null;
  cycleDays: number;
}

export default function TrackerHeader({ modeLabel, modeColor, todayCount, stats, cycleDays }: TrackerHeaderProps) {
  const completed = stats?.completedSections ?? 0;
  const total = stats?.totalSections ?? 0;
  const adjustedTarget = stats?.adjustedTargetToday ?? stats?.targetPerDay ?? 0;
  const isOverdue = stats?.isOverdue ?? false;

  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-[18px] font-bold text-[#1a1714]">
            Revision {modeLabel}
          </h1>
          <p className="text-[12px] text-[#9c9890] mt-0.5">
            {total > 0
              ? `${completed} / ${total} sections revisees`
              : 'Configurez vos sections a reviser'}
          </p>
        </div>
        <Link
          href="/config"
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-[#e2ddd6] hover:bg-[#f5f3ef] transition-colors"
        >
          <Settings size={16} className="text-[#5c5852]" />
        </Link>
      </div>

      {total > 0 && (
        <div className="bg-white rounded-2xl p-3.5 border border-[#e2ddd6]">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <span className="text-[11px] font-semibold text-[#9c9890] uppercase tracking-wide">Objectif aujourd'hui</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[22px] font-bold" style={{ color: modeColor }}>{todayCount}</span>
                <span className="text-[13px] text-[#9c9890]">/ {adjustedTarget}</span>
                {isOverdue && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#c92b2b15] text-[#c92b2b]">
                    EN RETARD
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-[#9c9890] uppercase tracking-wide">Cycle</span>
              <div className="text-[13px] font-semibold text-[#1a1714] mt-0.5">
                {cycleDays}j
              </div>
            </div>
          </div>
          <ProgressBar
            value={completed}
            max={total}
            color={modeColor}
            height={5}
          />
        </div>
      )}
    </div>
  );
}
