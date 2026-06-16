'use client';
import { useEffect, useState, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import TrackerHeader from '@/components/tracker/TrackerHeader';
import JuzCard from '@/components/tracker/JuzCard';
import HizbCard from '@/components/tracker/HizbCard';
import SourateCard from '@/components/tracker/SourateCard';
import FilterBar, { type ViewType } from '@/components/tracker/FilterBar';
import { useTrackerStore } from '@/store/useTrackerStore';
import { useModeStore } from '@/store/useModeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LOCAL_USER_ID } from '@/config/features';
import { JUZS, HIZBS, RUBS, SURAHS, getRubsForSurah } from '@/data/quran/quran-structure';
import type { SectionWithStatus, SectionStatus, DifficultyLevel } from '@/types/tracker';
import type { SectionType } from '@/types/quran';
import { computeCycleStats } from '@/lib/tracker/cycle-engine';
import Link from 'next/link';
import { Plus } from 'lucide-react';

type StatusFilter = SectionStatus | 'all';

export default function GroupTrackerPage() {
  const { activeMode, getModeColor, getModeHeaderBg } = useModeStore();
  const { getModeSettings, updateModeSettings } = useSettingsStore();
  const { loadData, getSectionsWithStatus, markAsRevised, undoRevision, setDifficulty } = useTrackerStore();

  const [viewType, setViewType] = useState<ViewType>('juz');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { cycleDays, cycleStartDate } = getModeSettings(activeMode);
  const modeColor = getModeColor();
  const headerBg = getModeHeaderBg();
  const modeLabel = activeMode === 'lecture' ? 'Lecture' : 'Memorisation';

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
  }, [activeMode, loadData]);

  // All tracked sections with status
  const allSections = getSectionsWithStatus(activeMode, cycleDays);

  // Derive sourate sections from tracked hizbs/rubs
  const derivedSurahSections = useMemo<SectionWithStatus[]>(() => {
    const hizbMap = new Map(allSections.filter(s => s.sectionType === 'hizb').map(s => [s.sectionId, s]));
    const rubMap  = new Map(allSections.filter(s => s.sectionType === 'rub').map(s => [s.sectionId, s]));

    const pickStatus = (ss: SectionStatus[]): SectionStatus => {
      if (ss.some(s => s === 'overdue')) return 'overdue';
      if (ss.some(s => s === 'today'))   return 'today';
      if (ss.every(s => s === 'done'))   return 'done';
      if (ss.some(s => s === 'new'))     return 'new';
      return 'upcoming';
    };

    return SURAHS.flatMap(surah => {
      const rubsInSurah = getRubsForSurah(surah.number);
      const hizbNumbers = Array.from(new Set(rubsInSurah.map(r => r.hizbNumber)));
      const trackedHizbNumbers = hizbNumbers.filter(n => {
        const h = HIZBS.find(h => h.number === n);
        return h && hizbMap.has(h.id);
      });
      if (trackedHizbNumbers.length === 0) return [];

      const statuses: SectionStatus[] = [];
      for (const hn of trackedHizbNumbers) {
        const hizb     = HIZBS.find(h => h.number === hn)!;
        const allRubs  = RUBS.filter(r => r.hizbNumber === hn);
        const surahRubs = rubsInSurah.filter(r => r.hizbNumber === hn);
        if (surahRubs.length >= allRubs.length) {
          // Full hizb → hizb status
          const hs = hizbMap.get(hizb.id);
          if (hs) statuses.push(hs.status);
        } else {
          // Sub-hizb → individual rub statuses
          for (const rub of surahRubs) {
            const rs = rubMap.get(rub.id);
            if (rs) statuses.push(rs.status);
          }
        }
      }
      if (statuses.length === 0) return [];

      return [{
        sectionId: surah.id, sectionType: 'sourate' as const,
        status: pickStatus(statuses),
        difficulty: null, lastRevisionDate: null, nextRevisionDate: null,
        revisionCount: 0, individualCycleDays: cycleDays,
        internalCycleMultiplier: 1, notes: '',
      }];
    });
  }, [allSections, cycleDays]);

  // Sections scoped to current view type
  const viewSections: SectionWithStatus[] = viewType === 'juz'
    ? allSections.filter(s => s.sectionType === 'juz')
    : viewType === 'hizb'
      ? allSections.filter(s => s.sectionType === 'hizb')
      : derivedSurahSections;

  // KPI stats scoped to current view type (exclude rubs from counts)
  const doneSections = viewSections.filter(s => s.status === 'done').length;
  const todayCount = doneSections;
  const stats = viewSections.length > 0 ? computeCycleStats({
    totalSections: viewSections.length,
    completedSections: doneSections,
    cycleDays,
    startDate: cycleStartDate,
    revisionsToday: todayCount,
  }) : null;

  // 'today' chip covers both today + overdue (read now to stay on track)
  const counts: Partial<Record<StatusFilter, number>> = {
    today: viewSections.filter(s => s.status === 'today' || s.status === 'overdue').length,
    done: viewSections.filter(s => s.status === 'done').length,
    upcoming: viewSections.filter(s => s.status === 'upcoming').length,
    new: viewSections.filter(s => s.status === 'new').length,
  };

  const statusMatches = (status: SectionStatus | undefined): boolean => {
    if (!status) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'today') return status === 'today' || status === 'overdue';
    return status === statusFilter;
  };

  const filteredSections = statusFilter === 'all'
    ? viewSections
    : viewSections.filter(s => statusMatches(s.status));

  // Status maps by type
  const statusMap = new Map<string, SectionWithStatus>(allSections.map(s => [s.sectionId, s]));
  const hizbStatusMap = new Map<string, SectionWithStatus>(
    allSections.filter(s => s.sectionType === 'hizb').map(s => [s.sectionId, s])
  );
  const rubStatusMap = new Map<string, SectionWithStatus>(
    allSections.filter(s => s.sectionType === 'rub').map(s => [s.sectionId, s])
  );

  const filteredJuzSectionIds = new Set(filteredSections.map(s => s.sectionId));
  const filteredJuzs = JUZS.filter(juz => {
    if (statusFilter === 'all') {
      return statusMap.has(juz.id) || juz.childrenIds.some((hId: string) => statusMap.has(hId));
    }
    return filteredJuzSectionIds.has(juz.id) ||
      juz.childrenIds.some((hId: string) => statusMatches(hizbStatusMap.get(hId)?.status));
  });

  // For hizb view: match filteredSections to HIZBS static data
  const filteredHizbs = HIZBS
    .map(h => ({ hizb: h, status: filteredSections.find(s => s.sectionId === h.id) }))
    .filter(({ status }) => !!status) as { hizb: typeof HIZBS[0]; status: SectionWithStatus }[];

  // For sourate view: match filteredSections to SURAHS static data
  const filteredSurahs = SURAHS
    .map(s => ({ surah: s, status: filteredSections.find(fs => fs.sectionId === s.id) }))
    .filter(({ status }) => !!status) as { surah: typeof SURAHS[0]; status: SectionWithStatus }[];

  const hasSections = allSections.length > 0;
  const hasViewSections = viewSections.length > 0;

  const handleMark = (sectionId: string, sectionType: 'juz' | 'hizb' | 'rub' | 'sourate') => {
    if (sectionType === 'sourate') {
      const surah = SURAHS.find(s => s.id === sectionId);
      if (!surah) return;
      const rubsInSurah = getRubsForSurah(surah.number);
      const hizbNumbers = Array.from(new Set(rubsInSurah.map(r => r.hizbNumber)));
      for (const hn of hizbNumbers) {
        const allRubs   = RUBS.filter(r => r.hizbNumber === hn);
        const surahRubs = rubsInSurah.filter(r => r.hizbNumber === hn);
        if (surahRubs.length >= allRubs.length) {
          const hizb = HIZBS.find(h => h.number === hn);
          if (hizb) markAsRevised(LOCAL_USER_ID, activeMode, hizb.id, 'hizb', cycleDays);
        } else {
          for (const rub of surahRubs) {
            markAsRevised(LOCAL_USER_ID, activeMode, rub.id, 'rub', cycleDays);
          }
        }
      }
    } else {
      markAsRevised(LOCAL_USER_ID, activeMode, sectionId, sectionType, cycleDays);
    }
  };

  const handleUndo = (sectionId: string) => {
    if (sectionId.startsWith('surah-')) {
      const surah = SURAHS.find(s => s.id === sectionId);
      if (!surah) return;
      const rubsInSurah = getRubsForSurah(surah.number);
      const hizbNumbers = Array.from(new Set(rubsInSurah.map(r => r.hizbNumber)));
      for (const hn of hizbNumbers) {
        const allRubs   = RUBS.filter(r => r.hizbNumber === hn);
        const surahRubs = rubsInSurah.filter(r => r.hizbNumber === hn);
        if (surahRubs.length >= allRubs.length) {
          const hizb = HIZBS.find(h => h.number === hn);
          if (hizb) undoRevision(LOCAL_USER_ID, activeMode, hizb.id);
        } else {
          for (const rub of surahRubs) undoRevision(LOCAL_USER_ID, activeMode, rub.id);
        }
      }
    } else {
      undoRevision(LOCAL_USER_ID, activeMode, sectionId);
    }
  };

  const handleDifficulty = (sectionId: string, difficulty: DifficultyLevel | null) => {
    const sType: SectionType = sectionId.startsWith('juz-') ? 'juz'
      : sectionId.startsWith('hizb-') ? 'hizb'
      : sectionId.startsWith('rub-') ? 'rub'
      : 'sourate';
    setDifficulty(LOCAL_USER_ID, activeMode, sectionId, sType, difficulty);
  };

  return (
    <AppShell>
      <TrackerHeader
        modeLabel={modeLabel}
        modeColor={modeColor}
        headerBg={headerBg}
        todayCount={todayCount}
        stats={stats}
        cycleDays={cycleDays}
        cycleStartDate={cycleStartDate}
        onReset={() => updateModeSettings(activeMode, { cycleStartDate: null })}
      />

      {hasSections && (
        <div className="px-4 pt-3 pb-3">
          <FilterBar
            viewType={viewType}
            onViewType={(v) => { setViewType(v); setStatusFilter('all'); }}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            color={modeColor}
            counts={counts}
          />
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
            <h3 className="text-[16px] font-bold text-[#1a1714] mb-1">Aucune section configurée</h3>
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
        ) : !hasViewSections ? (
          <div className="py-12 text-center">
            <p className="text-[13px] text-[#9c9890]">
              Aucune section de type <span className="font-semibold">{viewType}</span> configurée
            </p>
            <Link href="/config" className="mt-2 inline-block text-[12px] font-semibold" style={{ color: modeColor }}>
              Configurer
            </Link>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[14px] text-[#9c9890]">Aucune section avec ce filtre</p>
          </div>
        ) : viewType === 'juz' ? (
          filteredJuzs.map(juz => (
            <JuzCard
              key={juz.id}
              juz={juz}
              sectionStatus={statusMap.get(juz.id)}
              hizbStatuses={hizbStatusMap}
              rubStatuses={rubStatusMap}
              modeColor={modeColor}
              onMark={handleMark}
              onUndo={handleUndo}
              onDifficulty={handleDifficulty}
            />
          ))
        ) : viewType === 'hizb' ? (
          filteredHizbs.map(({ hizb, status }) => (
            <HizbCard
              key={hizb.id}
              hizb={hizb}
              sectionStatus={status}
              rubStatuses={rubStatusMap}
              modeColor={modeColor}
              onMark={(id, type) => handleMark(id, type)}
              onUndo={handleUndo}
              onDifficulty={handleDifficulty}
            />
          ))
        ) : (
          filteredSurahs.map(({ surah, status }) => (
            <SourateCard
              key={surah.id}
              surah={surah}
              sectionStatus={status}
              hizbStatuses={hizbStatusMap}
              rubStatuses={rubStatusMap}
              modeColor={modeColor}
              onMark={handleMark}
              onUndo={handleUndo}
              onDifficulty={handleDifficulty}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
