'use client';
import { useState } from 'react';
import { ChevronDown, Check, RotateCcw } from 'lucide-react';
import type { Surah } from '@/types/quran';
import type { SectionWithStatus, DifficultyLevel } from '@/types/tracker';
import StatusBadge from './StatusBadge';
import RubRow from './RubRow';
import SourateContent from './SourateContent';
import HizbCard from './HizbCard';
import JuzCard from './JuzCard';
import { RUBS, HIZBS, JUZS, getRubsForSurah } from '@/data/quran/quran-structure';

interface SourateCardProps {
  surah: Surah;
  sectionStatus: SectionWithStatus;
  hizbStatuses: Map<string, SectionWithStatus>;
  rubStatuses: Map<string, SectionWithStatus>;
  modeColor: string;
  onMark: (sectionId: string, sectionType: 'juz' | 'hizb' | 'rub' | 'sourate') => void;
  onUndo: (sectionId: string) => void;
  onDifficulty: (sectionId: string, difficulty: DifficultyLevel | null) => void;
}


export default function SourateCard({
  surah, sectionStatus, hizbStatuses, rubStatuses, modeColor, onMark, onUndo, onDifficulty,
}: SourateCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isDone    = sectionStatus.status === 'done';
  const isOverdue = sectionStatus.status === 'overdue';
  const isToday   = sectionStatus.status === 'today';
  const borderColor = isDone ? '#2d7a4f' : isOverdue ? '#c92b2b' : isToday ? '#b8841a' : '#e2ddd6';

  // Rubs that start in this surah → determines the tier
  const rubsInSurah = getRubsForSurah(surah.number);
  const hizbNumbersOfRubs = Array.from(new Set(rubsInSurah.map(r => r.hizbNumber)));

  // Only consider tracked hizbs
  const trackedHizbNumbers = hizbNumbersOfRubs.filter(n => {
    const h = HIZBS.find(h => h.number === n);
    return h && hizbStatuses.has(h.id);
  });

  // Tier: 2 hizbs = 1 juz → ≥2 → JuzCard; 1 hizb full (4 rubs) → HizbCard; 1 hizb partial → RubRow; 0 → flat
  let tier: 'juz' | 'hizb' | 'rub' | 'flat';
  if (trackedHizbNumbers.length >= 2) {
    tier = 'juz';
  } else if (trackedHizbNumbers.length === 1) {
    const hn = trackedHizbNumbers[0];
    const allHizbRubs = RUBS.filter(r => r.hizbNumber === hn);
    const surahRubsInHizb = rubsInSurah.filter(r => r.hizbNumber === hn);
    tier = surahRubsInHizb.length >= allHizbRubs.length ? 'hizb' : 'rub';
  } else {
    tier = 'flat';
  }

  const juzsForSurah = tier === 'juz'
    ? JUZS.filter(j => trackedHizbNumbers.some(n => {
        const h = HIZBS.find(h => h.number === n);
        return h && h.juzNumber === j.number;
      }))
    : [];

  const trackedHizb = (tier === 'hizb' || tier === 'rub')
    ? HIZBS.find(h => h.number === trackedHizbNumbers[0])
    : undefined;

  const rubsToShow = tier === 'rub'
    ? rubsInSurah.filter(r => r.hizbNumber === trackedHizbNumbers[0])
    : [];


  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${borderColor}` }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0"
          style={isDone ? { background: '#2d7a4f', color: '#fff' } : { background: `${modeColor}15`, color: modeColor }}
        >
          {isDone ? <Check size={16} /> : surah.number}
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-[#1a1714]">{surah.name}</span>
            {!isDone && <StatusBadge status={sectionStatus.status} compact />}
          </div>
          <span className="text-[11px] text-[#9c9890]">
            {surah.endAyah} ayats · <span className="text-[#c5c0ba]">{surah.pageEnd - surah.pageStart + 1} pages</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => isDone ? onUndo(surah.id) : onMark(surah.id, 'sourate')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={isDone ? { background: '#2d7a4f', color: '#fff' } : { background: `${modeColor}18`, color: modeColor }}
          >
            {isDone ? <RotateCcw size={13} /> : <Check size={14} />}
          </button>
          {tier !== 'flat' && (
            <button onClick={() => setExpanded(v => !v)} className="p-1">
              <ChevronDown
                size={16}
                className="text-[#9c9890] transition-transform"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && tier !== 'flat' && (
        <div className="border-t border-[#f0ece6]">
          {tier === 'juz' ? (
            <div className="px-3 py-3 space-y-3">
              {juzsForSurah.map(juz => (
                <JuzCard
                  key={juz.id}
                  juz={juz}
                  sectionStatus={undefined}
                  hizbStatuses={hizbStatuses}
                  rubStatuses={rubStatuses}
                  modeColor={modeColor}
                  onMark={onMark}
                  onUndo={onUndo}
                  onDifficulty={onDifficulty}
                />
              ))}
            </div>
          ) : tier === 'hizb' && trackedHizb ? (
            <div className="px-3 py-3">
              <HizbCard
                hizb={trackedHizb}
                sectionStatus={hizbStatuses.get(trackedHizb.id)!}
                rubStatuses={rubStatuses}
                modeColor={modeColor}
                onMark={(id, type) => onMark(id, type)}
                onUndo={onUndo}
                onDifficulty={onDifficulty}
              />
            </div>
          ) : (
            <div className="pb-1">
              {rubsToShow.length === 1 ? (
                <SourateContent
                  surah={surah}
                  rubId={rubsToShow[0].id}
                  status={rubStatuses.get(rubsToShow[0].id)}
                  modeColor={modeColor}
                  onMark={id => onMark(id, 'rub')}
                  onUndo={onUndo}
                />
              ) : (
                rubsToShow.map(rub => (
                  <RubRow
                    key={rub.id}
                    rub={rub}
                    status={rubStatuses.get(rub.id)}
                    modeColor={modeColor}
                    indent={20}
                    clampPageStart={surah.pageStart}
                    clampPageEnd={surah.pageEnd}
                    onMark={id => onMark(id, 'rub')}
                    onUndo={onUndo}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
