'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useTrackerStore } from '@/store/useTrackerStore';
import { useModeStore } from '@/store/useModeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LOCAL_USER_ID } from '@/config/features';
import { computeStreak } from '@/lib/tracker/stats-engine';
import { computeCycleStats } from '@/lib/tracker/cycle-engine';
import { HIZBS } from '@/data/quran/quran-structure';
import type { SectionWithStatus } from '@/types/tracker';

type StatsView = 'juz' | 'hizb' | 'pages';

// ─── SVG ring ────────────────────────────────────────────────────────────────
function RingProgress({ pct, color, size = 128 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 11;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={11} opacity={0.14} />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none" stroke={color} strokeWidth={11}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

// ─── Status bar segment ───────────────────────────────────────────────────────
const STATUS_META = [
  { key: 'today',    label: 'À faire',  color: '#f97316' },
  { key: 'overdue',  label: 'En retard', color: '#c92b2b' },
  { key: 'done',     label: 'Fait',     color: '#1a7a3c' },
  { key: 'upcoming', label: 'Planifié', color: '#3b82f6' },
  { key: 'new',      label: 'Nouveau',  color: '#c4bfb8' },
] as const;

export default function StatsPage() {
  const [view, setView] = useState<StatsView>('hizb');
  const { activeMode, getModeColor } = useModeStore();
  const { getModeSettings } = useSettingsStore();
  const { loadData, revisions, dailyProgress, todayRevisionIds, getSectionsWithStatus } = useTrackerStore();

  const color = getModeColor();

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
  }, [activeMode, loadData]);

  const { cycleDays, cycleStartDate } = getModeSettings(activeMode);
  const withStatus = getSectionsWithStatus(activeMode, cycleDays);

  const hizbs  = withStatus.filter(s => s.sectionType === 'hizb');
  const juzs   = withStatus.filter(s => s.sectionType === 'juz');

  const cycled  = (s: SectionWithStatus) => s.status === 'done' || s.status === 'upcoming';
  const todayFn = (s: SectionWithStatus) => todayRevisionIds.has(`${activeMode}:${s.sectionId}`);

  const pageCount = (sectionId: string) => {
    const h = HIZBS.find(h => h.id === sectionId);
    return h ? h.pageEnd - h.pageStart + 1 : 0;
  };

  // Hizb
  const tH = hizbs.length;
  const dH = hizbs.filter(cycled).length;
  const dHt = hizbs.filter(todayFn).length;

  // Juz
  const tJ = juzs.length;
  const dJ = juzs.filter(cycled).length;
  const dJt = juzs.filter(todayFn).length;

  // Pages
  const tP  = hizbs.reduce((s, h) => s + pageCount(h.sectionId), 0);
  const dP  = hizbs.filter(cycled).reduce((s, h) => s + pageCount(h.sectionId), 0);
  const dPt = hizbs.filter(todayFn).reduce((s, h) => s + pageCount(h.sectionId), 0);

  const cycleStats = computeCycleStats({
    totalSections: tH,
    completedSections: dH,
    cycleDays,
    startDate: cycleStartDate,
    revisionsToday: dHt,
  });

  // View-resolved values
  const total      = view === 'juz' ? tJ : view === 'hizb' ? tH : tP;
  const done       = view === 'juz' ? dJ : view === 'hizb' ? dH : dP;
  const todayCount = view === 'juz' ? dJt : view === 'hizb' ? dHt : dPt;
  const target     = cycleDays > 0 ? total / cycleDays : 0;
  const unit       = view === 'pages' ? 'pages' : view;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;
  const fmt        = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

  // Revisions & streak
  const modeRevs = revisions.filter(r => r.modeKey === activeMode);
  const modeProg = dailyProgress.filter(d => d.modeKey === activeMode);
  const { current: streak, best: bestStreak } = computeStreak(modeProg);
  const totalRevs = modeRevs.length;
  const activeDays = modeProg.filter(d => d.completedCount > 0).length;
  const avgPerDay = activeDays > 0 ? (totalRevs / activeDays).toFixed(1) : '—';

  // Difficulty distribution
  const diff = { facile: 0, moyen: 0, difficile: 0, none: 0 };
  modeRevs.forEach(r => {
    if (r.difficultyAtRevision === 'facile') diff.facile++;
    else if (r.difficultyAtRevision === 'moyen') diff.moyen++;
    else if (r.difficultyAtRevision === 'difficile') diff.difficile++;
    else diff.none++;
  });

  // Status breakdown (hizb level)
  const statusCounts: Record<string, number> = {
    today:    hizbs.filter(s => s.status === 'today').length,
    overdue:  hizbs.filter(s => s.status === 'overdue').length,
    done:     hizbs.filter(s => s.status === 'done').length,
    upcoming: hizbs.filter(s => s.status === 'upcoming').length,
    new:      hizbs.filter(s => s.status === 'new').length,
  };

  // Activity chart (last 30 days)
  const last30 = modeProg.slice(0, 30).reverse();
  const maxAct = Math.max(...last30.map(d => d.completedCount), 1);

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-8 space-y-3">

        {/* ── Header ── */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-[18px] font-bold text-[#1a1714]">Statistiques</h1>
          <span className="text-[12px] font-medium" style={{ color }}>
            {activeMode === 'lecture' ? 'Lecture' : 'Mémorisation'}
          </span>
        </div>

        {/* ── View toggle ── */}
        <div className="flex bg-white rounded-xl p-1 border border-[#e2ddd6]">
          {(['juz', 'hizb', 'pages'] as StatsView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all capitalize"
              style={view === v ? { background: color, color: '#fff' } : { color: '#9c9890' }}
            >
              {v === 'juz' ? 'Juz' : v === 'hizb' ? 'Hizb' : 'Pages'}
            </button>
          ))}
        </div>

        {/* ── Hero: ring + cycle info ── */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-5">
          <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide mb-4">Progression du cycle</p>
          <div className="flex items-center gap-5">
            {/* Ring */}
            <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
              <RingProgress pct={pct} color={color} size={128} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[28px] font-bold leading-none" style={{ color }}>{pct}%</span>
                <span className="text-[10px] text-[#9c9890] mt-0.5">complété</span>
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] text-[#9c9890] uppercase tracking-wide font-bold">Révisé</p>
                <p className="text-[20px] font-bold text-[#1a1714] leading-tight">
                  {done}
                  <span className="text-[13px] font-normal text-[#9c9890]"> / {total} {unit}</span>
                </p>
              </div>
              <div className="w-full h-px bg-[#f5f3ef]" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-[#9c9890]">Restants</p>
                  <p className="text-[16px] font-bold text-[#1a1714]">{cycleStats.daysRemaining}j</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#9c9890]">Écoulés</p>
                  <p className="text-[16px] font-bold text-[#1a1714]">{cycleStats.daysElapsed}j</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Today / Streak / Days ── */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-3 flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-bold text-[#9c9890] uppercase tracking-wide">Auj.</span>
            <span className="text-[22px] font-bold leading-tight" style={{ color }}>{todayCount}</span>
            <span className="text-[9px] text-[#9c9890] text-center leading-tight">/ {fmt(target)} {unit}</span>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-3 flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-bold text-[#9c9890] uppercase tracking-wide">Série</span>
            <span className="text-[22px] font-bold leading-tight text-[#f97316]">{streak}🔥</span>
            <span className="text-[9px] text-[#9c9890]">jours</span>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-3 flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-bold text-[#9c9890] uppercase tracking-wide">Objectif</span>
            <span
              className="text-[22px] font-bold leading-tight"
              style={{ color: cycleStats.isOverdue ? '#c92b2b' : '#1a1714' }}
            >
              {cycleStats.adjustedTargetToday}
            </span>
            <span className="text-[9px] text-[#9c9890]">{unit}/jour</span>
          </div>
        </div>

        {/* ── Status breakdown ── */}
        {tH > 0 && (
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
            <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide mb-3">Répartition des hizbs</p>
            {/* Stacked bar */}
            <div className="flex rounded-lg overflow-hidden h-3.5 mb-3 gap-[2px]">
              {STATUS_META.filter(s => statusCounts[s.key] > 0).map(s => (
                <div
                  key={s.key}
                  className="rounded-sm"
                  style={{ flex: statusCounts[s.key], background: s.color }}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {STATUS_META.filter(s => statusCounts[s.key] > 0).map(s => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-[11px] text-[#5c5852]">
                    {s.label} <span className="font-bold text-[#1a1714]">{statusCounts[s.key]}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Activity chart ── */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide">Activité 30 jours</p>
            <span className="text-[12px] font-bold" style={{ color }}>{totalRevs} révisions</span>
          </div>
          {last30.length > 0 ? (
            <>
              <div className="flex gap-[3px] items-end" style={{ height: 64 }}>
                {last30.map((dp, i) => {
                  const isToday = i === last30.length - 1;
                  const h = dp.completedCount > 0
                    ? Math.max(6, Math.round((dp.completedCount / maxAct) * 56))
                    : 4;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-[3px]"
                      style={{
                        height: h,
                        background: dp.completedCount > 0
                          ? isToday ? color : `${color}88`
                          : '#ece8e2',
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px] text-[#c4bfb8]">-30 jours</span>
                <span className="text-[9px] text-[#c4bfb8]">Aujourd'hui</span>
              </div>
            </>
          ) : (
            <p className="text-[12px] text-[#9c9890] text-center py-6">Aucune activité enregistrée</p>
          )}
        </div>

        {/* ── Key metrics grid ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { emoji: '📖', val: totalRevs, label: 'Total révisions', sub: 'toutes sessions' },
            { emoji: '🏆', val: `${bestStreak}j`, label: 'Meilleure série', sub: 'jours consécutifs' },
            { emoji: '📅', val: activeDays, label: 'Jours actifs', sub: 'jours avec révision' },
            { emoji: '📈', val: avgPerDay, label: 'Moy. / jour actif', sub: `${activeDays} jours actifs` },
          ].map(({ emoji, val, label, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
              <span className="text-[20px] leading-none">{emoji}</span>
              <p className="text-[22px] font-bold text-[#1a1714] mt-2 leading-none">{val}</p>
              <p className="text-[11px] font-semibold text-[#5c5852] mt-1">{label}</p>
              <p className="text-[10px] text-[#9c9890] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Difficulty ── */}
        {totalRevs > 0 && (
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
            <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide mb-3">Niveau de difficulté</p>
            <div className="space-y-3">
              {[
                { label: 'Facile',    count: diff.facile,    color: '#1a7a3c' },
                { label: 'Moyen',     count: diff.moyen,     color: '#b8841a' },
                { label: 'Difficile', count: diff.difficile, color: '#c92b2b' },
              ].map(({ label, count, color: c }) => {
                const p = totalRevs > 0 ? Math.round((count / totalRevs) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[12px] font-semibold" style={{ color: c }}>{label}</span>
                      <span className="text-[11px] text-[#9c9890]">{count} · {p}%</span>
                    </div>
                    <div className="h-2 bg-[#f5f3ef] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p}%`, background: c, transition: 'width 0.5s ease' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
