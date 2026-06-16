'use client';
import { useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useTrackerStore } from '@/store/useTrackerStore';
import { useModeStore } from '@/store/useModeStore';
import { LOCAL_USER_ID } from '@/config/features';
import { computeStreak, computeAppStats } from '@/lib/tracker/stats-engine';
import { BarChart2, TrendingUp, Calendar, BookOpen, Flame, Award } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide">{label}</p>
        <p className="text-[18px] font-bold text-[#1a1714]">{value}</p>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { activeMode, getModeColor } = useModeStore();
  const { loadData, dailyProgress, revisions, sections, getTotalRevisionCount } = useTrackerStore();

  const modeColor = getModeColor();
  const modeLabel = activeMode === 'lecture' ? 'Lecture' : 'Memorisation';

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
  }, [activeMode, loadData]);

  const modeRevisions = revisions.filter(r => r.modeKey === activeMode);
  const modeProgress = dailyProgress.filter(d => d.modeKey === activeMode);
  const { current: streak, best: bestStreak } = computeStreak(modeProgress);
  const activeDays = modeProgress.filter(d => d.completedCount > 0).length;
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
      <div className="px-4 pt-4 pb-6">
        <div className="mb-5">
          <h1 className="text-[18px] font-bold text-[#1a1714]">Statistiques</h1>
          <p className="text-[12px] text-[#9c9890] mt-0.5">Mode {modeLabel}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard icon={Flame} label="Serie actuelle" value={`${streak}j`} color={modeColor} />
          <StatCard icon={Award} label="Meilleure serie" value={`${bestStreak}j`} color="#b8841a" />
          <StatCard icon={BookOpen} label="Total revisions" value={totalRevisions} color={modeColor} />
          <StatCard icon={Calendar} label="Jours actifs" value={activeDays} color="#1a7a3c" />
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 mb-5">
          <h2 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">Activite (30 jours)</h2>
          <div className="flex gap-1 items-end h-16">
            {last30.map((dp, i) => {
              const maxCount = Math.max(...last30.map(d => d.completedCount), 1);
              const height = dp.completedCount > 0 ? Math.max(4, (dp.completedCount / maxCount) * 56) : 3;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height,
                    background: dp.completedCount > 0 ? modeColor : '#e2ddd6',
                    opacity: dp.completedCount > 0 ? 0.7 + (dp.completedCount / maxCount) * 0.3 : 1,
                  }}
                  title={`${dp.date}: ${dp.completedCount} revisions`}
                />
              );
            })}
            {last30.length === 0 && (
              <p className="text-[12px] text-[#9c9890] w-full text-center py-4">Aucune activite</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
          <h2 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">Repartition des difficultes</h2>
          {totalRevisions === 0 ? (
            <p className="text-[12px] text-[#9c9890]">Aucune donnee disponible</p>
          ) : (
            <div className="space-y-3">
              {[
                { key: 'facile', label: 'Facile', color: '#1a7a3c', count: diffCounts.facile },
                { key: 'moyen', label: 'Moyen', color: '#b8841a', count: diffCounts.moyen },
                { key: 'difficile', label: 'Difficile', color: '#c92b2b', count: diffCounts.difficile },
              ].map(({ key, label, color, count }) => {
                const pct = totalRevisions > 0 ? Math.round((count / totalRevisions) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px] font-semibold" style={{ color }}>{label}</span>
                      <span className="text-[12px] text-[#9c9890]">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#f5f3ef] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
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
