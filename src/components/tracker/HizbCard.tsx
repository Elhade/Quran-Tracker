'use client';
import { useState } from 'react';
import { ChevronDown, Check, RotateCcw } from 'lucide-react';
import { daysUntil } from '@/lib/utils/dates';
import Link from 'next/link';
import type { Hizb } from '@/types/quran';
import type { SectionWithStatus, DifficultyLevel } from '@/types/tracker';
import RubRow from './RubRow';
import { getRubsForHizb } from '@/data/quran/quran-structure';

const DONE_COLOR = '#2d7a4f';

interface HizbCardProps {
  hizb: Hizb;
  sectionStatus: SectionWithStatus;
  rubStatuses: Map<string, SectionWithStatus>;
  modeColor: string;
  fromView?: string;
  onMark: (sectionId: string, sectionType: 'hizb' | 'rub') => void;
  onUndo: (sectionId: string) => void;
  onDifficulty: (sectionId: string, difficulty: DifficultyLevel | null) => void;
}

const DIFF: { key: DifficultyLevel; label: string; color: string }[] = [
  { key: 'facile',    label: 'F', color: '#1a7a3c' },
  { key: 'moyen',     label: 'M', color: '#b8841a' },
  { key: 'difficile', label: 'D', color: '#c92b2b' },
];

export default function HizbCard({
  hizb, sectionStatus, rubStatuses, modeColor, fromView, onMark, onUndo, onDifficulty,
}: HizbCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isDone     = sectionStatus.status === 'done';
  const daysToNext = sectionStatus.nextRevisionDate ? daysUntil(sectionStatus.nextRevisionDate) : null;
  const borderColor = isDone ? DONE_COLOR
    : daysToNext !== null && daysToNext < 0 ? '#c92b2b'
    : daysToNext === 0 ? '#f97316'
    : '#e2ddd6';

  const rubs       = getRubsForHizb(hizb.number);
  const doneRubs   = rubs.filter(r => rubStatuses.get(r.id)?.status === 'done').length;

  const difficulty = sectionStatus.difficulty;
  const multiplier = sectionStatus.internalCycleMultiplier ?? 1;

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${borderColor}` }}>
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        {/* Number badge */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
          style={isDone ? { background: DONE_COLOR, color: '#fff' } : { background: `${modeColor}15`, color: modeColor }}
        >
          {isDone ? <Check size={16} /> : hizb.number}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link href={`/detail/hizb/${hizb.id}${fromView ? `?from=${fromView}` : ''}`} className="block" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-semibold text-[#1a1714]">Hizb {hizb.number}</span>
              {multiplier > 1 && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: `${modeColor}18`, color: modeColor }}
                >
                  {sectionStatus.cycleRevisionCount}/{multiplier}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#9c9890]">
              Juz {hizb.juzNumber} · <span className="text-[#c5c0ba]">{hizb.pageEnd - hizb.pageStart + 1} pages</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: isDone ? DONE_COLOR : doneRubs > 0 ? modeColor : '#c0bcb6' }}
            >
              {doneRubs}/4
            </span>
            <div className="flex gap-0.5">
              {rubs.map((_, i) => (
                <span
                  key={i}
                  className="block w-4 h-1 rounded-full"
                  style={{ background: i < doneRubs ? (isDone ? DONE_COLOR : modeColor) : '#e2ddd6' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {DIFF.map(opt => (
            <button
              key={opt.key}
              onClick={() => onDifficulty(hizb.id, difficulty === opt.key ? null : opt.key)}
              className="w-6 h-6 rounded-md text-[10px] font-bold border transition-all flex items-center justify-center"
              style={difficulty === opt.key
                ? { background: opt.color, color: '#fff', borderColor: opt.color }
                : { background: 'transparent', color: opt.color, borderColor: `${opt.color}50` }
              }
            >
              {opt.label}
            </button>
          ))}

          <div className="w-px h-4 bg-[#e2ddd6] mx-0.5" />

          <button
            onClick={() => isDone ? onUndo(hizb.id) : onMark(hizb.id, 'hizb')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={isDone ? { background: DONE_COLOR, color: '#fff' } : { background: `${modeColor}18`, color: modeColor }}
          >
            {isDone ? <RotateCcw size={13} /> : <Check size={14} />}
          </button>

          <button
            onClick={() => setExpanded(v => !v)}
            className="w-6 h-6 flex items-center justify-center"
          >
            <ChevronDown
              size={15}
              className="text-[#9c9890] transition-transform"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#f0ece6] pb-1">
          {rubs.map(rub => (
            <RubRow
              key={rub.id}
              rub={rub}
              status={rubStatuses.get(rub.id)}
              modeColor={modeColor}
              indent={20}
              onMark={id => onMark(id, 'rub')}
              onUndo={onUndo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
