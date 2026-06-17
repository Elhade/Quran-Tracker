'use client';
import { useState } from 'react';
import { ChevronDown, Check, RotateCcw } from 'lucide-react';
import { daysUntil } from '@/lib/utils/dates';
import type { Juz } from '@/types/quran';
import type { SectionWithStatus, DifficultyLevel } from '@/types/tracker';
import StatusBadge from './StatusBadge';
import HizbCard from './HizbCard';
import { getHizbsForJuz } from '@/data/quran/quran-structure';

const DONE_COLOR = '#2d7a4f';

interface JuzCardProps {
  juz: Juz;
  sectionStatus?: SectionWithStatus;
  hizbStatuses: Map<string, SectionWithStatus>;
  rubStatuses: Map<string, SectionWithStatus>;
  modeColor: string;
  fromView?: string;
  onMark: (sectionId: string, sectionType: 'juz' | 'hizb' | 'rub') => void;
  onUndo: (sectionId: string) => void;
  onDifficulty: (sectionId: string, difficulty: DifficultyLevel | null) => void;
}

const DIFF: { key: DifficultyLevel; label: string; color: string }[] = [
  { key: 'facile',    label: 'F', color: '#1a7a3c' },
  { key: 'moyen',     label: 'M', color: '#b8841a' },
  { key: 'difficile', label: 'D', color: '#c92b2b' },
];

export default function JuzCard({
  juz, sectionStatus, hizbStatuses, rubStatuses, modeColor, fromView = 'juz', onMark, onUndo, onDifficulty,
}: JuzCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hizbs = getHizbsForJuz(juz.number);

  const isDone    = sectionStatus?.status === 'done';

  const trackedHizbs  = hizbs.filter(h => hizbStatuses.has(h.id));
  const doneHizbs     = trackedHizbs.filter(h => hizbStatuses.get(h.id)?.status === 'done').length;
  const progress      = trackedHizbs.length > 0 ? doneHizbs / trackedHizbs.length : 0;
  const allHizbsDone  = trackedHizbs.length > 0 && doneHizbs === trackedHizbs.length;

  const daysToNext = sectionStatus?.nextRevisionDate ? daysUntil(sectionStatus.nextRevisionDate) : null;
  const borderColor = isDone ? DONE_COLOR
    : daysToNext !== null && daysToNext < 0 ? '#c92b2b'
    : daysToNext === 0 ? '#f97316'
    : '#e2ddd6';

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${borderColor}` }}>
      {/* Juz row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
          style={isDone ? { background: DONE_COLOR, color: '#fff' } : { background: `${modeColor}15`, color: modeColor }}
        >
          {isDone ? <Check size={16} /> : juz.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[#1a1714]">{juz.name}</span>
            {sectionStatus && !isDone && <StatusBadge status={sectionStatus.status} compact />}
          </div>
          <span className="text-[11px] text-[#9c9890]">{juz.reference}</span>
          {trackedHizbs.length > 0 && (
            <div className="mt-1.5 w-full h-1 bg-[#e2ddd6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%`, background: isDone ? DONE_COLOR : modeColor }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {sectionStatus && (
            <button
              onClick={e => { e.stopPropagation(); isDone ? onUndo(juz.id) : onMark(juz.id, 'juz'); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={isDone ? { background: DONE_COLOR, color: '#fff' } : { background: `${modeColor}18`, color: modeColor }}
            >
              {isDone ? <RotateCcw size={13} /> : <Check size={14} />}
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)} className="p-1">
            <ChevronDown
              size={16}
              className="text-[#9c9890] transition-transform"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#f0ece6] px-3 py-3 space-y-3">
          {hizbs.map(hizb => {
            const hs = hizbStatuses.get(hizb.id);
            if (!hs) return null;
            return (
              <HizbCard
                key={hizb.id}
                hizb={hizb}
                sectionStatus={hs}
                rubStatuses={rubStatuses}
                modeColor={modeColor}
                fromView={fromView}
                onMark={onMark}
                onUndo={onUndo}
                onDifficulty={onDifficulty}
              />
            );
          })}

          {!allHizbsDone && trackedHizbs.length > 1 && (
            <button
              onClick={() => onMark(juz.id, 'juz')}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2"
              style={{ background: `${modeColor}12`, color: modeColor, border: `1.5px solid ${modeColor}30` }}
            >
              <Check size={14} /> Valider tout le juz
            </button>
          )}
        </div>
      )}
    </div>
  );
}
