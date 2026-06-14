'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useTrackerStore } from '../../store/useTrackerStore';
import { useModeStore } from '../../store/useModeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LOCAL_USER_ID } from '../../config/features';
import { JUZS, HIZBS, RUBS } from '../../data/quran/quran-structure';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { SectionWithStatus } from '../../types/tracker';
import type { SectionStatus } from '../../types/tracker';
import StatusBadge from '../../components/tracker/StatusBadge';
import FilterChips from '../../components/tracker/FilterChips';

type FilterValue = SectionStatus | 'all';

export default function IndividuelPage() {
  const { activeMode, getModeColor } = useModeStore();
  const { settings } = useSettingsStore();
  const { loadData, getSectionsWithStatus, markAsRevised, undoRevision, getTodayCount, loaded } = useTrackerStore();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [expandedJuz, setExpandedJuz] = useState<string | null>(null);
  const [expandedHizb, setExpandedHizb] = useState<string | null>(null);

  const cycleDays = settings?.groupedCycleDays ?? 7;
  const modeColor = getModeColor();

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
  }, [activeMode, loadData]);

  const sectionsWithStatus = getSectionsWithStatus(activeMode, cycleDays);
  const statusMap = new Map<string, SectionWithStatus>(sectionsWithStatus.map(s => [s.sectionId, s]));

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

  const matchesFilter = (sectionId: string) => {
    if (filter === 'all') return statusMap.has(sectionId);
    return statusMap.get(sectionId)?.status === filter;
  };

  const visibleJuzs = JUZS.filter(juz => {
    if (!matchesFilter(juz.id)) {
      const hizbs = HIZBS.filter(h => h.juzNumber === juz.number);
      if (!hizbs.some(h => matchesFilter(h.id))) {
        const rubs = RUBS.filter(r => r.juzNumber === juz.number);
        if (!rubs.some(r => matchesFilter(r.id))) return false;
      }
    }
    return true;
  });

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[18px] font-bold text-[#1a1714]">Individuel</h1>
          <Link href="/config-individuel" className="text-[13px] font-semibold" style={{ color: modeColor }}>
            Configurer
          </Link>
        </div>
        <p className="text-[12px] text-[#9c9890] mb-3">Suivi section par section</p>

        {hasSections && (
          <FilterChips value={filter} onChange={setFilter} color={modeColor} counts={filterCounts} />
        )}
      </div>

      <div className="px-4 pb-4 space-y-2">
        {!hasSections ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[14px] text-[#9c9890] mb-4">Aucune section configuree</p>
            <Link
              href="/config-individuel"
              className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white"
              style={{ background: modeColor }}
            >
              Configurer
            </Link>
          </div>
        ) : (
          visibleJuzs.map(juz => {
            const juzStatus = statusMap.get(juz.id);
            const isJuzExpanded = expandedJuz === juz.id;
            const hizbsInJuz = HIZBS.filter(h => h.juzNumber === juz.number && statusMap.has(h.id));

            return (
              <div key={juz.id} className="bg-white rounded-2xl border border-[#e2ddd6] overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedJuz(isJuzExpanded ? null : juz.id)}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ background: `${modeColor}15`, color: modeColor }}
                  >
                    {juz.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-semibold text-[#1a1714]">{juz.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {juzStatus && <StatusBadge status={juzStatus.status} compact />}
                    {juzStatus && (
                      <button
                        onClick={e => { e.stopPropagation(); juzStatus.status === 'done' ? handleUndo(juz.id) : handleMark(juz.id, 'juz'); }}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={juzStatus.status === 'done'
                          ? { background: '#2d7a4f', color: '#fff' }
                          : { background: `${modeColor}18`, color: modeColor }
                        }
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <ChevronDown size={15} className="text-[#9c9890]" style={{ transform: isJuzExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                  </div>
                </div>

                {isJuzExpanded && hizbsInJuz.length > 0 && (
                  <div className="border-t border-[#f0ece6]">
                    {hizbsInJuz.map((hizb, hIdx) => {
                      const hizbStatus = statusMap.get(hizb.id);
                      const isHizbExpanded = expandedHizb === hizb.id;
                      const rubsInHizb = RUBS.filter(r => r.hizbNumber === hizb.number && statusMap.has(r.id));

                      return (
                        <div key={hizb.id} className={hIdx < hizbsInJuz.length - 1 ? 'border-b border-[#f5f3ef]' : ''}>
                          <div
                            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                            onClick={() => setExpandedHizb(isHizbExpanded ? null : hizb.id)}
                          >
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[#f5f3ef] text-[#9c9890]">
                              {hizb.number}
                            </div>
                            <Link href={`/detail/hizb/${hizb.id}`} className="flex-1" onClick={e => e.stopPropagation()}>
                              <span className="text-[13px] font-medium text-[#1a1714]">Hizb {hizb.number}</span>
                            </Link>
                            <div className="flex items-center gap-1.5">
                              {hizbStatus && <StatusBadge status={hizbStatus.status} compact />}
                              {hizbStatus && (
                                <button
                                  onClick={e => { e.stopPropagation(); hizbStatus.status === 'done' ? handleUndo(hizb.id) : handleMark(hizb.id, 'hizb'); }}
                                  className="w-6 h-6 rounded-full flex items-center justify-center"
                                  style={hizbStatus.status === 'done'
                                    ? { background: '#2d7a4f', color: '#fff' }
                                    : { background: `${modeColor}18`, color: modeColor }
                                  }
                                >
                                  <Check size={11} />
                                </button>
                              )}
                              {rubsInHizb.length > 0 && (
                                <ChevronDown size={13} className="text-[#9c9890]" style={{ transform: isHizbExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                              )}
                            </div>
                          </div>

                          {isHizbExpanded && rubsInHizb.map((rub, rIdx) => {
                            const rubStatus = statusMap.get(rub.id);
                            return (
                              <div key={rub.id} className={`flex items-center gap-3 px-6 py-2 bg-[#faf9f7] ${rIdx < rubsInHizb.length - 1 ? 'border-b border-[#f0ece6]' : ''}`}>
                                <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 bg-[#f0ece6] text-[#9c9890]">
                                  {rub.number}
                                </div>
                                <span className="text-[12px] text-[#5c5852] flex-1">Rub {rub.number}</span>
                                {rubStatus && (
                                  <div className="flex items-center gap-1.5">
                                    <StatusBadge status={rubStatus.status} compact />
                                    <button
                                      onClick={() => rubStatus.status === 'done' ? handleUndo(rub.id) : handleMark(rub.id, 'rub')}
                                      className="w-5 h-5 rounded-full flex items-center justify-center"
                                      style={rubStatus.status === 'done'
                                        ? { background: '#2d7a4f', color: '#fff' }
                                        : { background: `${modeColor}18`, color: modeColor }
                                      }
                                    >
                                      <Check size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
