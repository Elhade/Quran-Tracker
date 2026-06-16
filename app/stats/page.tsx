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
import { Flame, Award } from 'lucide-react';

type StatsView = 'juz' | 'hizb' | 'sourate';

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-2.5 bg-[#f5f3ef] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: pct >= 100 ? '#1a7a3c' : color }}
      />
    </div>
  );
}

export default function StatsPage() {
  const [viewMode, setViewMode] = useState<StatsView>('hizb');
  const { activeMode, getModeColor } = useModeStore();
  const { getModeSettings } = useSettingsStore();
  const { loadData, sections, revisions, dailyProgress, todayRevisionIds, getSectionsWithStatus } = useTrackerStore();

  const modeColor = getModeColor();

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
  }, [activeMode, loadData]);

  const { cycleDays, cycleStartDate } = getModeSettings(activeMode);
  const sectionsWithStatus = getSectionsWithStatus(activeMode, cycleDays);

  const selectedHizbs = sectionsWithStatus.filter(s => s.sectionType === 'hizb');
  const selectedJuzs  = sectionsWithStatus.filter(s => s.sectionType === 'juz');

  // Done ce cycle = revised within this cycle (status upcoming or done)
  const isDoneThisCycle = (s: SectionWithStatus) =>
    s.status === 'done' || s.status === 'upcoming';

  // Done aujourd'hui = revised today
  const isTodayDone = (s: SectionWithStatus) =>
    todayRevisionIds.has(`${activeMode}:${s.sectionId}`);

  const getHizbPages = (sectionId: string) => {
    const h = HIZBS.find(h => h.id === sectionId);
    return h ? h.pageEnd - h.pageStart + 1 : 0;
  };

  // Juz
  const totalJuz      = selectedJuzs.length;
  const doneJuzCycle  = selectedJuzs.filter(isDoneThisCycle).length;
  const doneJuzToday  = selectedJuzs.filter(isTodayDone).length;
  const targetJuzDay  = cycleDays > 0 ? totalJuz / cycleDays : 0;

  // Hizb
  const totalHizb      = selectedHizbs.length;
  const doneHizbCycle  = selectedHizbs.filter(isDoneThisCycle).length;
  const doneHizbToday  = selectedHizbs.filter(isTodayDone).length;
  const targetHizbDay  = cycleDays > 0 ? totalHizb / cycleDays : 0;

  // Pages
  const totalPages     = selectedHizbs.reduce((s, h) => s + getHizbPages(h.sectionId), 0);
  const donePagesCycle = selectedHizbs.filter(isDoneThisCycle).reduce((s, h) => s + getHizbPages(h.sectionId), 0);
  const donePagesToday = selectedHizbs.filter(isTodayDone).reduce((s, h) => s + getHizbPages(h.sectionId), 0);
  const targetPagesDay = cycleDays > 0 ? Math.round(totalPages / cycleDays) : 0;

  // Days remaining from cycle engine
  const cycleStats = computeCycleStats({
    totalSections: totalHizb,
    completedSections: doneHizbCycle,
    cycleDays,
    startDate: cycleStartDate,
    revisionsToday: doneHizbToday,
  });

  // View-specific values
  const cycleTotal   = viewMode === 'juz' ? totalJuz : viewMode === 'hizb' ? totalHizb : totalPages;
  const cycleDone    = viewMode === 'juz' ? doneJuzCycle : viewMode === 'hizb' ? doneHizbCycle : donePagesCycle;
  const todayDone    = viewMode === 'juz' ? doneJuzToday : viewMode === 'hizb' ? doneHizbToday : donePagesToday;
  const targetPerDay = viewMode === 'juz' ? targetJuzDay : viewMode === 'hizb' ? targetHizbDay : targetPagesDay;
  const unit         = viewMode === 'sourate' ? 'pages' : viewMode;
  const cyclePercent = cycleTotal > 0 ? Math.round((cycleDone / cycleTotal) * 100) : 0;

  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

  // Existing stats
  const modeRevisions = revisions.filter(r => r.modeKey === activeMode);
  const modeProgress  = dailyProgress.filter(d => d.modeKey === activeMode);
  const { current: streak, best: bestStreak } = computeStreak(modeProgress);
  const totalRevisions = modeRevisions.length;

  const diffCounts = { facile: 0, moyen: 0, difficile: 0 };
  modeRevisions.forEach(r => {
    if (r.difficultyAtRevision === 'facile') diffCounts.facile++;
    else if (r.difficultyAtRevision === 'moyen') diffCounts.moyen++;
    else if (r.difficultyAtRevision === 'difficile') diffCounts.difficile++;
  });

  const last30 = modeProgress.slice(0, 30).reverse();

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-8">
        <div className="mb-4">
          <h1 className="text-[18px] font-bold text-[#1a1714]">Statistiques</h1>
          <p className="text-[12px] text-[#9c9890] mt-0.5">
            Mode {activeMode === 'lecture' ? 'Lecture' : 'Mémorisation'}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex bg-white rounded-xl p-1 border border-[#e2ddd6] mb-4">
          {(['juz', 'hizb', 'sourate'] as StatsView[]).map(v => {
            const active = viewMode === v;
            const label = v === 'juz' ? 'Juz' : v === 'hizb' ? 'Hizb' : 'Pages';
            return (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all"
                style={active ? { background: modeColor, color: '#fff' } : { color: '#9c9890' }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Jours restants */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 mb-3 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
            style={{ background: `${modeColor}15` }}
          >
            <span className="text-[22px] font-bold leading-none" style={{ color: modeColor }}>
              {cycleStats.daysRemaining}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: `${modeColor}99` }}>
              jours
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide">Jours restants</p>
            <p className="text-[14px] font-semibold text-[#1a1714]">sur {cycleDays} jours de cycle</p>
            <p className="text-[11px] text-[#9c9890]">{cycleStats.daysElapsed} jour{cycleStats.daysElapsed > 1 ? 's' : ''} écoulé{cycleStats.daysElapsed > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Done ce cycle */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 mb-3">
          <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide mb-2.5">
            Done ce cycle
          </p>
          <div className="flex items-baseline gap-1.5 mb-2.5">
            <span className="text-[28px] font-bold leading-none text-[#1a1714]">{cycleDone}</span>
            <span className="text-[15px] font-semibold text-[#9c9890]">/ {cycleTotal} {unit}</span>
          </div>
          <ProgressBar value={cycleDone} total={cycleTotal} color={modeColor} />
          <p className="text-[11px] text-[#9c9890] mt-1.5">{cyclePercent}% complété</p>
        </div>

        {/* Done aujourd'hui */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 mb-4">
          <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide mb-2.5">
            Done aujourd'hui
          </p>
          <div className="flex items-baseline gap-1.5 mb-2.5">
            <span className="text-[28px] font-bold leading-none text-[#1a1714]">{todayDone}</span>
            <span className="text-[15px] font-semibold text-[#9c9890]">
              / {fmt(targetPerDay)} {unit}/jour
            </span>
          </div>
          <ProgressBar value={todayDone} total={targetPerDay} color={modeColor} />
        </div>

        {/* Streak */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { icon: Flame, label: 'Série actuelle', value: `${streak}j`, color: modeColor },
            { icon: Award, label: 'Meilleure série', value: `${bestStreak}j`, color: '#b8841a' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-[#e2ddd6] p-3 flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-[#9c9890] uppercase tracking-wide">{label}</p>
                <p className="text-[16px] font-bold text-[#1a1714]">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Activité 30 jours */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 mb-4">
          <h2 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">Activité (30 jours)</h2>
          <div className="flex gap-1 items-end h-14">
            {last30.length > 0 ? last30.map((dp, i) => {
              const maxCount = Math.max(...last30.map(d => d.completedCount), 1);
              const height = dp.completedCount > 0 ? Math.max(4, (dp.completedCount / maxCount) * 50) : 3;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height,
                    background: dp.completedCount > 0 ? modeColor : '#e2ddd6',
                    opacity: dp.completedCount > 0 ? 0.7 + (dp.completedCount / maxCount) * 0.3 : 1,
                  }}
                />
              );
            }) : (
              <p className="text-[12px] text-[#9c9890] w-full text-center self-center">Aucune activité</p>
            )}
          </div>
        </div>

        {/* Répartition difficultés */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
          <h2 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">Répartition des difficultés</h2>
          {totalRevisions === 0 ? (
            <p className="text-[12px] text-[#9c9890]">Aucune donnée disponible</p>
          ) : (
            <div className="space-y-3">
              {[
                { key: 'facile',   label: 'Facile',    color: '#1a7a3c', count: diffCounts.facile },
                { key: 'moyen',    label: 'Moyen',     color: '#b8841a', count: diffCounts.moyen },
                { key: 'difficile',label: 'Difficile', color: '#c92b2b', count: diffCounts.difficile },
              ].map(({ key, label, color, count }) => {
                const pct = Math.round((count / totalRevisions) * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px] font-semibold" style={{ color }}>{label}</span>
                      <span className="text-[12px] text-[#9c9890]">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#f5f3ef] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
