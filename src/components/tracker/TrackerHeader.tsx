'use client';
import { RotateCcw, Settings } from 'lucide-react';
import Link from 'next/link';
import type { CycleStats } from '@/types/tracker';

interface TrackerHeaderProps {
  modeLabel: string;
  modeColor: string;
  headerBg: string;
  todayCount: number;
  stats: CycleStats | null;
  cycleDays: number;
  cycleStartDate: string | null;
  onReset: () => void;
}

export default function TrackerHeader({
  modeLabel, modeColor, headerBg, todayCount, stats, cycleDays, cycleStartDate, onReset,
}: TrackerHeaderProps) {
  const completed = stats?.completedSections ?? 0;
  const total = stats?.totalSections ?? 0;
  const daysRemaining = stats?.daysRemaining ?? cycleDays;
  const targetPerDay = total > 0 ? (total / cycleDays).toFixed(1) : '0';
  const progressPct = stats?.progressPercent ?? 0;
  const isOverdue = stats?.isOverdue ?? false;
  const adjustedTarget = stats?.adjustedTargetToday ?? Math.ceil(stats?.targetPerDay ?? 0);

  const startLabel = cycleStartDate
    ? `Démarré le ${new Date(cycleStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : `Cycle de ${cycleDays} jours`;

  return (
    <div style={{ background: headerBg }} className="px-5 pt-5 pb-4">
      {/* Title row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-tight leading-tight">
            Révision du Coran
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {startLabel}
          </p>
        </div>
        <Link
          href="/config"
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <Settings size={18} className="text-white" />
        </Link>
      </div>

      {total > 0 && (
        <>
          {/* Stats blocks */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div
              className="rounded-[14px] p-3.5 flex flex-col gap-1.5"
              style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <div className="text-[34px] font-bold text-white leading-none tracking-tight">
                {daysRemaining}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wide leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Jours<br />restants
              </div>
            </div>
            <div
              className="rounded-[14px] p-3.5 flex flex-col gap-1.5"
              style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <div className="text-[34px] font-bold text-white leading-none tracking-tight">
                {isOverdue ? adjustedTarget : targetPerDay}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wide leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {isOverdue ? 'Objectif\naujourd\'hui' : 'Section/jour\nobjectif'}
              </div>
            </div>
          </div>

          {/* Progress section */}
          <div className="rounded-[14px] px-3.5 pt-3 pb-2.5" style={{ background: 'rgba(0,0,0,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Avancement du cycle
              </span>
              <span className="text-[12px] font-bold text-white">
                {completed} / {total} · {progressPct}%
              </span>
            </div>
            <div className="h-[7px] rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <button
              onClick={onReset}
              className="w-full py-2 rounded-[9px] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{ border: '1.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }}
            >
              <RotateCcw size={13} />
              Réinitialiser le cycle
            </button>
          </div>
        </>
      )}
    </div>
  );
}
