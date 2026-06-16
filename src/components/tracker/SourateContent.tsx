'use client';
import { Check, RotateCcw } from 'lucide-react';
import type { Surah } from '@/types/quran';
import type { SectionWithStatus } from '@/types/tracker';

interface SourateContentProps {
  surah: Surah;
  rubId: string;
  status?: SectionWithStatus;
  modeColor: string;
  indent?: number;
  onMark?: (rubId: string) => void;
  onUndo?: (rubId: string) => void;
}

export default function SourateContent({ surah, rubId, status, modeColor, indent = 20, onMark, onUndo }: SourateContentProps) {
  const isDone = status?.status === 'done';
  const isTracked = !!status;
  const pageCount = surah.pageEnd - surah.pageStart + 1;

  return (
    <div className="flex items-start gap-2.5 py-2 pr-3" style={{ paddingLeft: indent }}>
      <div
        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-[3px]"
        style={isDone
          ? { background: '#2d7a4f22', color: '#2d7a4f' }
          : isTracked
            ? { background: `${modeColor}15`, color: modeColor }
            : { background: '#f5f3ef', color: '#c5c0ba' }
        }
      >
        {isDone
          ? <Check size={10} />
          : <span className="block w-1.5 h-1.5 rounded-full" style={{ background: isTracked ? modeColor : '#c5c0ba' }} />
        }
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        {surah.firstVerseArabic && (
          <p className="text-[13px] text-[#2c2825] text-right truncate" dir="rtl"
             style={{ fontFamily: 'var(--font-amiri)', lineHeight: '2', paddingTop: '2px', paddingBottom: '2px' }}>
            {surah.firstVerseArabic.length > 65 ? surah.firstVerseArabic.slice(0, 65) + '…' : surah.firstVerseArabic}
          </p>
        )}
        <span className="text-[10px] text-[#b0aca6] mt-0.5 block">
          {surah.name} {surah.number}:1 · {pageCount} page{pageCount > 1 ? 's' : ''}
        </span>
      </div>

      {isTracked && (
        <button
          onClick={() => isDone ? onUndo?.(rubId) : onMark?.(rubId)}
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all mt-[3px]"
          style={isDone
            ? { background: '#2d7a4f', color: '#fff' }
            : { background: `${modeColor}18`, color: modeColor }
          }
        >
          {isDone ? <RotateCcw size={9} /> : <Check size={10} />}
        </button>
      )}
    </div>
  );
}
