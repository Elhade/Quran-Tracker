'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../../components/layout/AppShell';
import { useTrackerStore } from '../../../../store/useTrackerStore';
import { useModeStore } from '../../../../store/useModeStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { LOCAL_USER_ID } from '../../../../config/features';
import { getSectionById } from '../../../../data/quran/quran-structure';
import type { SectionType } from '../../../../types/quran';
import type { DifficultyLevel } from '../../../../types/tracker';
import DifficultySelector from '../../../../components/tracker/DifficultySelector';
import StatusBadge from '../../../../components/tracker/StatusBadge';
import { ArrowLeft, Check, RotateCcw, BookOpen } from 'lucide-react';
import { formatDate, daysUntil, isTodayDate } from '../../../../lib/utils/dates';

const CYCLE_PRESETS = [3, 7, 10, 21, 30];
const MULTIPLIERS = [1, 2, 3, 5, 10];

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default function DetailPage({ params }: PageProps) {
  const { type, id } = use(params);
  const router = useRouter();
  const { activeMode, getModeColor } = useModeStore();
  const { settings } = useSettingsStore();
  const { loadData, getSectionsWithStatus, markAsRevised, undoRevision, setDifficulty, setInternalCycle, setNote, getNote, loaded } = useTrackerStore();

  const modeColor = getModeColor();
  const cycleDays = settings?.groupedCycleDays ?? 7;
  const section = getSectionById(id);

  const [note, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
    const existing = getNote(LOCAL_USER_ID, type, id);
    setNoteText(existing);
  }, [activeMode, id]);

  const sectionsWithStatus = getSectionsWithStatus(activeMode, cycleDays);
  const sectionStatus = sectionsWithStatus.find(s => s.sectionId === id);

  if (!section) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-48">
          <p className="text-[#9c9890]">Section introuvable</p>
        </div>
      </AppShell>
    );
  }

  const isDone = sectionStatus?.status === 'done';

  const handleMark = () => {
    markAsRevised(LOCAL_USER_ID, activeMode, id, section.type as SectionType, cycleDays, sectionStatus?.difficulty ?? undefined);
  };

  const handleUndo = () => {
    undoRevision(LOCAL_USER_ID, activeMode, id);
  };

  const handleDifficulty = (difficulty: DifficultyLevel | null) => {
    setDifficulty(LOCAL_USER_ID, activeMode, id, section.type as SectionType, difficulty as DifficultyLevel);
  };

  const handleMultiplier = (mult: number) => {
    setInternalCycle(LOCAL_USER_ID, activeMode, id, section.type as SectionType, mult);
  };

  const handleSaveNote = () => {
    setNote(LOCAL_USER_ID, type, id, note);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const nextRevLabel = sectionStatus?.nextRevisionDate
    ? isTodayDate(sectionStatus.nextRevisionDate)
      ? "Aujourd'hui"
      : (() => {
          const d = daysUntil(sectionStatus.nextRevisionDate);
          return d > 0 ? `Dans ${d} jour${d > 1 ? 's' : ''}` : formatDate(sectionStatus.nextRevisionDate);
        })()
    : null;

  return (
    <AppShell>
      <div className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-[#e2ddd6]"
          >
            <ArrowLeft size={16} className="text-[#5c5852]" />
          </button>
          <div>
            <h1 className="text-[18px] font-bold text-[#1a1714]">{section.name}</h1>
            <p className="text-[12px] text-[#9c9890]">{section.reference}</p>
          </div>
        </div>

        {sectionStatus && (
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <StatusBadge status={sectionStatus.status} />
              <span className="text-[11px] text-[#9c9890]">
                {sectionStatus.revisionCount} revision{sectionStatus.revisionCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#f5f3ef] rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide mb-1">Derniere</p>
                <p className="text-[13px] font-semibold text-[#1a1714]">
                  {sectionStatus.lastRevisionDate ? formatDate(sectionStatus.lastRevisionDate) : 'Jamais'}
                </p>
              </div>
              <div className="bg-[#f5f3ef] rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide mb-1">Prochaine</p>
                <p className="text-[13px] font-semibold text-[#1a1714]">
                  {nextRevLabel || 'Non planifiee'}
                </p>
              </div>
            </div>

            <button
              onClick={isDone ? handleUndo : handleMark}
              className="w-full py-3 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: isDone ? '#2d7a4f' : modeColor }}
            >
              {isDone ? <><RotateCcw size={15} /> Annuler la revision</> : <><Check size={15} /> Marquer comme revise</>}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 mb-4">
          <h3 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">Difficulte</h3>
          <DifficultySelector
            value={sectionStatus?.difficulty ?? null}
            onChange={handleDifficulty}
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4 mb-4">
          <h3 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">Multiplicateur de cycle</h3>
          <div className="flex gap-2">
            {MULTIPLIERS.map(m => {
              const active = (sectionStatus?.internalCycleMultiplier ?? 1) === m;
              return (
                <button
                  key={m}
                  onClick={() => handleMultiplier(m)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all"
                  style={active
                    ? { background: modeColor, color: '#fff', borderColor: modeColor }
                    : { background: '#fff', color: '#5c5852', borderColor: '#e2ddd6' }
                  }
                >
                  x{m}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#9c9890] mt-2">
            Reviser x{sectionStatus?.internalCycleMultiplier ?? 1} fois plus souvent
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide">Notes</h3>
            <button
              onClick={handleSaveNote}
              className="text-[12px] font-semibold"
              style={{ color: noteSaved ? '#1a7a3c' : modeColor }}
            >
              {noteSaved ? 'Sauvegarde' : 'Sauvegarder'}
            </button>
          </div>
          <textarea
            value={note}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Ajoutez des notes sur cette section..."
            className="w-full h-24 bg-[#f5f3ef] rounded-xl px-3 py-2.5 text-[13px] text-[#1a1714] placeholder-[#9c9890] border-0 outline-none resize-none"
          />
        </div>
      </div>
    </AppShell>
  );
}
