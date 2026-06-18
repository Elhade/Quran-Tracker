'use client';
import { useState } from 'react';
import { RotateCcw, Settings } from 'lucide-react';
import Link from 'next/link';

interface TrackerHeaderProps {
  headerBg: string;
  mode: string;
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
  headerBg, mode, cycleDays, cycleStartDate, onReset,
  daysRemaining, daysElapsed, targetPerDay,
  cycleDone, cycleTotal, todayDone, unit,
}: TrackerHeaderProps) {
  const [confirming, setConfirming] = useState(false);

  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

  const cyclePercent = cycleTotal > 0 ? Math.round((cycleDone / cycleTotal) * 100) : 0;

  const todayPct   = targetPerDay > 0 ? Math.min(100, Math.round((todayDone / targetPerDay) * 100)) : 0;
  const accent     = mode === 'memorisation' ? '#86efac' : '#1e3a8a';
  const todayColor = todayDone >= targetPerDay && targetPerDay > 0 ? accent : '#ffffff';

  const hasElapsed = daysElapsed > 0;
  const paceRef    = hasElapsed ? cycleDone : todayDone;
  const paceExp    = hasElapsed ? Math.round(targetPerDay * daysElapsed) : Math.round(targetPerDay);
  const paceDelta  = paceRef - paceExp;
  const isLate     = hasElapsed && paceDelta < 0;
  const paceLabel  = paceDelta > 0 ? 'en avance' : isLate ? 'en retard' : 'à jour';
  const paceColor  = paceDelta > 0 ? accent : isLate ? '#fde68a' : '#ffffff';
  const catchUp    = isLate ? Math.abs(paceDelta) : 0;

  const title      = mode === 'lecture' ? 'Lecture du Coran' : 'Révision du Coran';
  const startLabel = cycleStartDate
    ? `Démarré le ${new Date(cycleStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : `Cycle de ${cycleDays} jours`;

  const block = { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' };
  const sub   = { color: '#ffffff' };
  const muted = { color: '#ffffff' };

  const handleReset = () => {
    onReset();
    setConfirming(false);
  };

  return (
    <div style={{ background: headerBg }} className="px-5 pt-5 pb-4">
      {/* Title */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-[12px] mt-0.5 text-white/80">
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
              <div className="h-[3px] rounded-full mt-1.5" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${todayPct}%`, background: todayColor }} />
              </div>
              {catchUp > 0 && (
                <span className="text-[10px] font-semibold mt-1" style={{ color: '#fde68a' }}>
                  {fmt(targetPerDay)} d'aujourd'hui + {fmt(catchUp)} à rattraper
                </span>
              )}
            </div>

          </div>

          {/* Barre + reset */}
          <div className="rounded-[13px] px-3.5 pt-3 pb-2.5" style={{ background: 'rgba(0,0,0,0.22)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-white">
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

            {confirming ? (
              <div className="space-y-2">
                <p className="text-center text-[12px] font-semibold text-white">
                  Réinitialiser le cycle ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    className="flex-1 py-2 rounded-[9px] text-[12px] font-bold text-white"
                    style={{ border: '1.5px solid rgba(255,255,255,0.3)' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 rounded-[9px] text-[12px] font-bold"
                    style={{ background: 'rgba(255,255,255,0.9)', color: headerBg }}
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="w-full py-2 rounded-[9px] text-[12px] font-bold text-white flex items-center justify-center gap-1.5"
                style={{ border: '1.5px solid rgba(255,255,255,0.5)' }}
              >
                <RotateCcw size={13} />
                Réinitialiser le cycle
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
