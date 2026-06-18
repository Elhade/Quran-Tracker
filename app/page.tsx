'use client';
import { useEffect, useState, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import TrackerHeader from '@/components/tracker/TrackerHeader';
import JuzCard from '@/components/tracker/JuzCard';
import HizbCard from '@/components/tracker/HizbCard';
import SourateCard from '@/components/tracker/SourateCard';
import FilterBar, { type ViewType, type StatusFilter } from '@/components/tracker/FilterBar';
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

export default function GroupTrackerPage() {
  const { activeMode, getModeColor, getModeHeaderBg } = useModeStore();
  const { getModeSettings, updateModeSettings } = useSettingsStore();
  const { loadData, sections: rawSections, getSectionsWithStatus, markAsRevised, undoRevision, setDifficulty, todayRevisionIds, resetCycle } = useTrackerStore();

  const [viewType, setViewType] = useState<ViewType>('juz');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') as ViewType | null;
    if (view && (['juz', 'hizb', 'sourate'] as ViewType[]).includes(view)) {
      setViewType(view);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const { cycleDays, cycleStartDate } = getModeSettings(activeMode);
  const modeColor = getModeColor();
  const headerBg = getModeHeaderBg();
  const modeLabel = activeMode === 'lecture' ? 'Lecture' : 'Memorisation';

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
  }, [activeMode, loadData]);

  // All tracked sections with status
  const allSections = getSectionsWithStatus(activeMode, cycleDays, cycleStartDate);

  // Derive sourate sections from tracked hizbs/rubs
  const derivedSurahSections = useMemo<SectionWithStatus[]>(() => {
    const hizbMap = new Map(allSections.filter(s => s.sectionType === 'hizb').map(s => [s.sectionId, s]));
    const rubMap  = new Map(allSections.filter(s => s.sectionType === 'rub').map(s => [s.sectionId, s]));
    // Sourate-specific difficulties stored directly (isSelected may be false)
    const surahDiffMap = new Map(
      rawSections
        .filter(s => s.sectionType === 'sourate' && s.modeKey === activeMode)
        .map(s => [s.sectionId, s.difficulty])
    );

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

      // cycleRevisionCount = min across hizbs (= number of full passes through the sourate)
      // internalCycleMultiplier = common value only if all hizbs agree, else 1
      const hizbStatEntries = trackedHizbNumbers
        .map(n => HIZBS.find(h => h.number === n))
        .filter((h): h is NonNullable<typeof h> => h !== undefined)
        .map(h => hizbMap.get(h.id))
        .filter((hs): hs is SectionWithStatus => hs !== undefined);
      const surahCycleRevCount = hizbStatEntries.length > 0
        ? Math.min(...hizbStatEntries.map(hs => hs.cycleRevisionCount))
        : 0;
      const allSameMultiplier = hizbStatEntries.length > 0
        && hizbStatEntries.every(hs => hs.internalCycleMultiplier === hizbStatEntries[0].internalCycleMultiplier);
      const surahMultiplier = allSameMultiplier ? hizbStatEntries[0].internalCycleMultiplier : 1;

      // Earliest next revision date across hizbs (most urgent)
      const surahNextRevDates = hizbStatEntries
        .map(hs => hs.nextRevisionDate)
        .filter((d): d is string => d !== null);
      const surahNextRevDate = surahNextRevDates.length > 0 ? surahNextRevDates.sort()[0] : null;

      return [{
        sectionId: surah.id, sectionType: 'sourate' as const,
        status: pickStatus(statuses),
        difficulty: surahDiffMap.get(surah.id) ?? null,
        lastRevisionDate: null, nextRevisionDate: surahNextRevDate,
        revisionCount: 0, cycleRevisionCount: surahCycleRevCount, individualCycleDays: cycleDays,
        internalCycleMultiplier: surahMultiplier, notes: '',
      }];
    });
  }, [allSections, cycleDays, rawSections, activeMode]);

  // Sections scoped to current view type
  const viewSections: SectionWithStatus[] = viewType === 'juz'
    ? allSections.filter(s => s.sectionType === 'juz')
    : viewType === 'hizb'
      ? allSections.filter(s => s.sectionType === 'hizb')
      : derivedSurahSections;

  // Header KPIs — vary by active view type
  const isDoneThisCycle = (s: SectionWithStatus) => s.status === 'done' || s.status === 'upcoming';
  const isTodayRevised  = (s: SectionWithStatus) => todayRevisionIds.has(`${activeMode}:${s.sectionId}`);

  const allHizbs = allSections.filter(s => s.sectionType === 'hizb');
  const allJuzs  = allSections.filter(s => s.sectionType === 'juz');
  const getHizbPages = (id: string) => {
    const h = HIZBS.find(h => h.id === id);
    return h ? h.pageEnd - h.pageStart + 1 : 0;
  };

  let headerCycleTotal: number, headerCycleDone: number,
      headerTodayDone: number, headerTargetPerDay: number, headerUnit: string;

  if (viewType === 'sourate') {
    headerCycleTotal   = allHizbs.reduce((sum, s) => sum + getHizbPages(s.sectionId), 0);
    headerCycleDone    = allHizbs.filter(isDoneThisCycle).reduce((sum, s) => sum + getHizbPages(s.sectionId), 0);
    headerTodayDone    = allHizbs.filter(isTodayRevised).reduce((sum, s) => sum + getHizbPages(s.sectionId), 0);
    headerTargetPerDay = cycleDays > 0 ? Math.round(headerCycleTotal / cycleDays) : 0;
    headerUnit         = 'pages';
  } else if (viewType === 'juz') {
    // 1 juz = 2 hizbs — derive juz-equivalent counts from hizb progress so
    // validating individual hizbs updates the header even before the full juz is done
    const juzTotal     = allJuzs.length > 0 ? allJuzs.length : allHizbs.length / 2;
    headerCycleTotal   = juzTotal;
    headerCycleDone    = allHizbs.filter(isDoneThisCycle).length / 2;
    headerTodayDone    = allHizbs.filter(isTodayRevised).length / 2;
    headerTargetPerDay = cycleDays > 0 ? juzTotal / cycleDays : 0;
    headerUnit         = 'juz';
  } else {
    headerCycleTotal   = allHizbs.length;
    headerCycleDone    = allHizbs.filter(isDoneThisCycle).length;
    headerTodayDone    = allHizbs.filter(isTodayRevised).length;
    headerTargetPerDay = cycleDays > 0 ? allHizbs.length / cycleDays : 0;
    headerUnit         = 'hizb';
  }

  // If no cycleStartDate, infer start from earliest revision date so KPI4 is meaningful
  const earliestRevision = allHizbs
    .map(s => s.lastRevisionDate)
    .filter((d): d is string => d !== null)
    .sort()[0] ?? null;
  const effectiveStartDate = cycleStartDate ?? earliestRevision;

  // Days elapsed/remaining (hizb base for consistency)
  const cycleStats = allHizbs.length > 0 ? computeCycleStats({
    totalSections: allHizbs.length,
    completedSections: allHizbs.filter(isDoneThisCycle).length,
    cycleDays,
    startDate: effectiveStartDate,
    revisionsToday: allHizbs.filter(isTodayRevised).length,
  }) : null;

  const counts: Partial<Record<StatusFilter, number>> = {
    non_fait:  viewSections.filter(s => s.status === 'new' || s.status === 'today' || s.status === 'overdue').length,
    fait:      viewSections.filter(s => s.status === 'done' || s.status === 'upcoming').length,
    facile:    viewSections.filter(s => s.difficulty === 'facile').length,
    moyen:     viewSections.filter(s => s.difficulty === 'moyen').length,
    difficile: viewSections.filter(s => s.difficulty === 'difficile').length,
  };

  const sectionMatches = (s: SectionWithStatus): boolean => {
    if (statusFilter === 'all')       return true;
    if (statusFilter === 'non_fait')  return s.status === 'new' || s.status === 'today' || s.status === 'overdue';
    if (statusFilter === 'fait')      return s.status === 'done' || s.status === 'upcoming';
    if (statusFilter === 'facile')    return s.difficulty === 'facile';
    if (statusFilter === 'moyen')     return s.difficulty === 'moyen';
    if (statusFilter === 'difficile') return s.difficulty === 'difficile';
    return false;
  };

  const filteredSections = statusFilter === 'all'
    ? viewSections
    : viewSections.filter(s => sectionMatches(s));

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

    const trackedHizbsForJuz = juz.childrenIds
      .map((hId: string) => hizbStatusMap.get(hId))
      .filter((h): h is SectionWithStatus => h !== undefined);

    if (trackedHizbsForJuz.length > 0) {
      // "Révisé/Lu" : un juz n'est révisé que si TOUS ses hizbs le sont
      if (statusFilter === 'fait') return trackedHizbsForJuz.every(h => sectionMatches(h));
      // Autres filtres (non_fait, difficultés) : au moins un hizb correspond
      return trackedHizbsForJuz.some(h => sectionMatches(h));
    }

    // Aucun hizb tracké : se baser sur le statut propre du juz
    return filteredJuzSectionIds.has(juz.id);
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
        headerBg={headerBg}
        mode={activeMode}
        cycleDays={cycleDays}
        cycleStartDate={cycleStartDate}
        onReset={() => {
          resetCycle(LOCAL_USER_ID, activeMode);
          updateModeSettings(activeMode, { cycleStartDate: new Date().toISOString().split('T')[0] });
        }}
        daysRemaining={cycleStats?.daysRemaining ?? cycleDays}
        daysElapsed={cycleStats?.daysElapsed ?? 0}
        targetPerDay={headerTargetPerDay}
        cycleDone={headerCycleDone}
        cycleTotal={headerCycleTotal}
        todayDone={headerTodayDone}
        unit={headerUnit}
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
            mode={activeMode}
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
              fromView="hizb"
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
