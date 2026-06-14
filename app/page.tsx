'use client';
import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import TrackerHeader from '../components/tracker/TrackerHeader';
import JuzCard from '../components/tracker/JuzCard';
import FilterChips from '../components/tracker/FilterChips';
import { useTrackerStore } from '../store/useTrackerStore';
import { useModeStore } from '../store/useModeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { LOCAL_USER_ID } from '../config/features';
import { JUZS } from '../data/quran/quran-structure';
import type { SectionWithStatus } from '../types/tracker';
import type { SectionStatus } from '../types/tracker';
import { computeCycleStats } from '../lib/tracker/cycle-engine';
import Link from 'next/link';
import { Plus } from 'lucide-react';

type FilterValue = SectionStatus | 'all';

export default function GroupTrackerPage() {
  const { activeMode, getModeColor } = useModeStore();
  const { settings } = useSettingsStore();
  const { loadData, getSectionsWithStatus, markAsRevised, undoRevision, getTodayCount, loaded } = useTrackerStore();
  const [filter, setFilter] = useState<FilterValue>('all');

  const cycleDays = settings?.groupedCycleDays ?? 7;
  const modeColor = getModeColor();
  const modeLabel = activeMode === 'lecture' ? 'Lecture' : 'Memorisation';

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
  }, [activeMode, loadData]);

  const sectionsWithStatus = getSectionsWithStatus(activeMode, cycleDays);
  const statusMap = new Map<string, SectionWithStatus>(sectionsWithStatus.map(s => [s.sectionId, s]));

  const todayCount = getTodayCount(activeMode);
  const doneSections = sectionsWithStatus.filter(s => s.status === 'done').length;
  const stats = sectionsWithStatus.length > 0 ? computeCycleStats({
    totalSections: sectionsWithStatus.length,
    completedSections: doneSections,
    cycleDays,
    startDate: settings?.groupedCycleStartDate ?? null,
    revisionsToday: todayCount,
  }) : null;

  const juzStatuses = JUZS.map(j => statusMap.get(j.id)).filter(Boolean) as SectionWithStatus[];
  const hizbStatusMap = new Map<string, SectionWithStatus>(
    sectionsWithStatus.filter(s => s.sectionType === 'hizb').map(s => [s.sectionId, s])
  );

  const filteredJuzs = JUZS.filter(juz => {
    if (filter === 'all') return statusMap.has(juz.id) || juz.childrenIds.some((hId: string) => statusMap.has(hId));
    const juzStatus = statusMap.get(juz.id);
    if (juzStatus?.status === filter) return true;
    return juz.childrenIds.some((hId: string) => hizbStatusMap.get(hId)?.status === filter);
  });

  const hasSections = sectionsWithStatus.length > 0;

  const filterCounts: Partial<Record<FilterValue, number>> = {
    today: sectionsWithStatus.filter(s => s.status === 'today').length,
    overdue: sectionsWithStatus.filter(s => s.status === 'overdue').length,
    done: sectionsWithStatus.filter(s => s.status === 'done').length,
    upcoming: sectionsWithStatus.filter(s => s.status === 'upcoming').length,
    new: sectionsWithStatus.filter(s => s.status === 'new').length,
  };

  const handleMark = (sectionId: string, sectionType: 'juz' | 'hizb' | 'rub') => {
    markAsRevised(LOCAL_USER_ID, activeMode, sectionId, sectionType, cycleDays);
  };

  const handleUndo = (sectionId: string) => {
    undoRevision(LOCAL_USER_ID, activeMode, sectionId);
  };

  return (
    <AppShell>
      <TrackerHeader
        modeLabel={modeLabel}
        modeColor={modeColor}
        todayCount={todayCount}
        stats={stats}
        cycleDays={cycleDays}
      />

      {hasSections && (
        <div className="px-4 pb-3">
          <FilterChips value={filter} onChange={setFilter} color={modeColor} counts={filterCounts} />
        </div>
      )}

      <div className="px-4 pb-4 space-y-3">
        {!hasSections ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${modeColor}15` }}
            >
              <Plus size={28} style={{ color: modeColor }} />
            </div>
            <h3 className="text-[16px] font-bold text-[#1a1714] mb-1">Aucune section configuree</h3>
            <p className="text-[13px] text-[#9c9890] mb-5 max-w-[260px]">
              Configurez les sections du Coran que vous souhaitez suivre
            </p>
            <Link
              href="/config"
              className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white"
              style={{ background: modeColor }}
            >
              Configurer
            </Link>
          </div>
        ) : filteredJuzs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[14px] text-[#9c9890]">Aucune section avec ce filtre</p>
          </div>
        ) : (
          filteredJuzs.map(juz => (
            <JuzCard
              key={juz.id}
              juz={juz}
              sectionStatus={statusMap.get(juz.id)}
              hizbStatuses={hizbStatusMap}
              modeColor={modeColor}
              onMark={handleMark}
              onUndo={handleUndo}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
