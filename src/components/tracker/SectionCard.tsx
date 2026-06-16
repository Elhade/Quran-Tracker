'use client';
import { Check, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import type { QuranSection } from '@/types/quran';
import type { SectionWithStatus } from '@/types/tracker';
import StatusBadge from './StatusBadge';

interface SectionCardProps {
  section: QuranSection;
  sectionStatus: SectionWithStatus;
  modeColor: string;
  onMark: (sectionId: string, sectionType: 'juz' | 'hizb' | 'rub' | 'sourate') => void;
  onUndo: (sectionId: string) => void;
}

export default function SectionCard({ section, sectionStatus, modeColor, onMark, onUndo }: SectionCardProps) {
  const isDone = sectionStatus.status === 'done';
  const isOverdue = sectionStatus.status === 'overdue';
  const isToday = sectionStatus.status === 'today';
  const borderColor = isDone ? '#2d7a4f' : isOverdue ? '#c92b2b' : isToday ? '#b8841a' : '#e2ddd6';

  const detailPath = `/detail/${section.type}/${section.id}`;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex items-center gap-3 px-4 py-3.5"
      style={{ border: `1.5px solid ${borderColor}` }}
    >
      {/* Number badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0"
        style={isDone
          ? { background: '#2d7a4f', color: '#fff' }
          : { background: `${modeColor}15`, color: modeColor }
        }
      >
        {isDone ? <Check size={15} /> : section.number}
      </div>

      {/* Info */}
      <Link href={detailPath} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-semibold text-[#1a1714] truncate">{section.name}</span>
          {!isDone && <StatusBadge status={sectionStatus.status} compact />}
        </div>
        <span className="text-[11px] text-[#9c9890]">{section.reference}</span>
      </Link>

      {/* Action button */}
      <button
        onClick={() => isDone ? onUndo(section.id) : onMark(section.id, section.type as 'juz' | 'hizb' | 'rub' | 'sourate')}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
        style={isDone
          ? { background: '#2d7a4f', color: '#fff' }
          : { background: `${modeColor}18`, color: modeColor }
        }
      >
        {isDone ? <RotateCcw size={13} /> : <Check size={14} />}
      </button>
    </div>
  );
}
