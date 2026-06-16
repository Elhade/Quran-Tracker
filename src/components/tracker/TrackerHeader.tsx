'use client';
import { RotateCcw, Settings } from 'lucide-react';
import Link from 'next/link';

interface TrackerHeaderProps {
  headerBg: string;
  cycleDays: number;
  cycleStartDate: string | null;
  onReset: () => void;
  daysRemaining: number;
  daysElapsed: number;
  targetPerDay: number;
  cycleDone: number;
  cycleTotal: number;
  todayDone: number;
  unit: string;
}

export default function TrackerHeader({
  headerBg, cycleDays, cycleStartDate, onReset,
  daysRemaining, daysElapsed, targetPerDay,
  cycleDone, cycleTotal, todayDone, unit,
}: TrackerHeaderProps) {
  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

  const cyclePercent = cycleTotal > 0 ? Math.round((cycleDone / cycleTotal) * 100) : 0;

  // KPI 3 — aujourd'hui + statut rythme
  const todayPct   = targetPerDay > 0 ? Math.min(100, Math.round((todayDone / targetPerDay) * 100)) : 0;
  const todayColor = todayDone >= targetPerDay && targetPerDay > 0 ? '#4ade80' : 'white';

  const hasElapsed  = daysElapsed > 0;
  const paceRef     = hasElapsed ? cycleDone : todayDone;
  const paceExp     = hasElapsed ? Math.round(targetPerDay * daysElapsed) : Math.round(targetPerDay);
  const paceDelta   = paceRef - paceExp;
  const paceLabel   = paceDelta > 0 ? 'en avance' : paceDelta < 0 ? 'en retard' : 'à jour';
  const paceColor   = paceDelta > 0 ? '#4ade80' : paceDelta < 0 ? '#f87171' : 'rgba(255,255,255,0.55)';
  const catchUp     = hasElapsed && paceDelta < 0 ? Math.abs(paceDelta) : 0;

  const startLabel = cycleStartDate
    ? `Démarré le ${new Date(cycleStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : `Cycle de ${cycleDays} jours`;

  const block = { background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.18)' };
  const sub   = { color: 'rgba(255,255,255,0.6)' };
  const muted = { color: 'rgba(255,255,255,0.4)' };

  return (
    <div style={{ background: headerBg }} className="px-5 pt-5 pb-4">
      {/* Title */}
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

      {cycleTotal > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2.5">

            {/* KPI 1 — Jours restants */}
            <div className="rounded-[13px] p-3 flex flex-col gap-0.5" style={block}>
              <div className="flex items-baseline gap-1 leading-none">
                <span className="text-[28px] font-bold text-white">{daysRemaining}</span>
                <span className="text-[11px] font-semibold" style={sub}>/ {cycleDays}j</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide mt-1" style={sub}>
                Jours restants
              </span>
            </div>

            {/* KPI 2 — Objectif par jour */}
            <div className="rounded-[13px] p-3 flex flex-col gap-0.5" style={block}>
              <div className="flex items-baseline gap-1 leading-none">
                <span className="text-[28px] font-bold text-white">{fmt(targetPerDay)}</span>
                <span className="text-[11px] font-semibold" style={sub}>{unit}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide mt-1" style={sub}>
                Par jour
              </span>
            </div>

            {/* KPI 3 — Aujourd'hui + statut rythme */}
            <div className="col-span-2 rounded-[13px] p-3 flex flex-col gap-0.5" style={block}>
              <div className="flex items-baseline justify-between leading-none">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[28px] font-bold" style={{ color: todayColor }}>{fmt(todayDone)}</span>
                  <span className="text-[12px] font-semibold" style={muted}>
                    {' '}/ {fmt(targetPerDay)} {unit}
                  </span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: paceColor }}>
                  {paceLabel}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={sub}>
                Aujourd'hui
              </span>
              <div className="h-[3px] rounded-full mt-1.5" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div className="h-full rounded-full" style={{ width: `${todayPct}%`, background: todayColor }} />
              </div>
              {catchUp > 0 && (
                <span className="text-[10px] font-semibold mt-1" style={{ color: '#f87171' }}>
                  retard : {fmt(targetPerDay + catchUp)} {unit} (+{fmt(catchUp)} à rattraper)
                </span>
              )}
            </div>

          </div>

          {/* Barre + reset */}
          <div className="rounded-[13px] px-3.5 pt-3 pb-2.5" style={{ background: 'rgba(0,0,0,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Avancement du cycle
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: paceColor }}>
                  · {paceLabel}
                </span>
              </div>
              <span className="text-[11px] font-bold text-white">
                {cycleDone} / {cycleTotal} {unit} · {cyclePercent}%
              </span>
            </div>
            <div className="h-[6px] rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${cyclePercent}%` }}
              />
            </div>
            <button
              onClick={onReset}
              className="w-full py-2 rounded-[9px] text-[12px] font-bold flex items-center justify-center gap-1.5"
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
