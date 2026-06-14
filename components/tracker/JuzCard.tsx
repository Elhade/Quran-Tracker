'use client';
import { useState } from 'react';
import { ChevronDown, Check, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import type { Juz, Hizb } from '../../types/quran';
import type { SectionWithStatus } from '../../types/tracker';
import StatusBadge from './StatusBadge';
import { getHizbsForJuz } from '../../data/quran/quran-structure';

interface JuzCardProps {
  juz: Juz;
  sectionStatus?: SectionWithStatus;
  hizbStatuses: Map<string, SectionWithStatus>;
  modeColor: string;
  onMark: (sectionId: string, sectionType: 'juz' | 'hizb' | 'rub') => void;
  onUndo: (sectionId: string) => void;
}

export default function JuzCard({ juz, sectionStatus, hizbStatuses, modeColor, onMark, onUndo }: JuzCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hizbs = getHizbsForJuz(juz.number);

  const isDone = sectionStatus?.status === 'done';
  const isOverdue = sectionStatus?.status === 'overdue';
  const isToday = sectionStatus?.status === 'today';

  const doneHizbs = hizbs.filter(h => hizbStatuses.get(h.id)?.status === 'done').length;
  const progress = hizbs.length > 0 ? (doneHizbs / hizbs.length) : 0;

  const borderColor = isDone ? '#2d7a4f' : isOverdue ? '#c92b2b' : isToday ? '#b8841a' : '#e2ddd6';

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all"
      style={{ border: `1.5px solid ${borderColor}` }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
          style={isDone ? { background: '#2d7a4f', color: '#fff' } : { background: `${modeColor}15`, color: modeColor }}
        >
          {isDone ? <Check size={16} /> : juz.number}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[#1a1714]">{juz.name}</span>
            {sectionStatus && !isDone && (
              <StatusBadge status={sectionStatus.status} compact />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[#9c9890]">{juz.reference}</span>
          </div>
          {hizbs.length > 0 && (
            <div className="mt-1.5 w-full h-1 bg-[#e2ddd6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%`, background: isDone ? '#2d7a4f' : modeColor }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {sectionStatus && (
            <button
              onClick={e => {
                e.stopPropagation();
                isDone ? onUndo(juz.id) : onMark(juz.id, 'juz');
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={isDone
                ? { background: '#2d7a4f', color: '#fff' }
                : { background: `${modeColor}18`, color: modeColor }
              }
            >
              {isDone ? <RotateCcw size={13} /> : <Check size={14} />}
            </button>
          )}
          <ChevronDown
            size={16}
            className="text-[#9c9890] transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#f0ece6]">
          {hizbs.map((hizb, idx) => {
            const hs = hizbStatuses.get(hizb.id);
            const hizbDone = hs?.status === 'done';
            return (
              <div
                key={hizb.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx < hizbs.length - 1 ? 'border-b border-[#f5f3ef]' : ''}`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={hizbDone ? { background: '#2d7a4f22', color: '#2d7a4f' } : { background: '#f5f3ef', color: '#9c9890' }}
                >
                  {hizbDone ? <Check size={12} /> : hizb.number}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/detail/hizb/${hizb.id}`} className="block">
                    <span className="text-[13px] font-medium text-[#1a1714]">Hizb {hizb.number}</span>
                    <span className="ml-2 text-[11px] text-[#9c9890]">{hizb.reference}</span>
                  </Link>
                </div>
                {hs && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={hs.status} compact />
                    <button
                      onClick={() => hizbDone ? onUndo(hizb.id) : onMark(hizb.id, 'hizb')}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={hizbDone
                        ? { background: '#2d7a4f', color: '#fff' }
                        : { background: `${modeColor}18`, color: modeColor }
                      }
                    >
                      {hizbDone ? <RotateCcw size={11} /> : <Check size={12} />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
