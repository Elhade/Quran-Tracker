'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useTrackerStore } from '@/store/useTrackerStore';
import { useModeStore } from '@/store/useModeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LOCAL_USER_ID } from '@/config/features';
import { getSectionById, HIZBS, RUBS, SURAHS, getRubsForSurah } from '@/data/quran/quran-structure';
import type { SectionType } from '@/types/quran';
import type { DifficultyLevel, SectionStatus, SectionWithStatus } from '@/types/tracker';
import DifficultySelector from '@/components/tracker/DifficultySelector';
import StatusBadge from '@/components/tracker/StatusBadge';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { formatDate, daysUntil, isTodayDate } from '@/lib/utils/dates';

const CYCLE_PRESETS = [3, 5, 7, 15, 30];
const MULTIPLIERS = [1, 2, 3, 5, 10];

interface PageProps {
  params: { type: string; id: string };
}

function pickStatus(ss: SectionStatus[]): SectionStatus {
  if (ss.some(s => s === 'overdue')) return 'overdue';
  if (ss.some(s => s === 'today'))   return 'today';
  if (ss.every(s => s === 'done'))   return 'done';
  if (ss.some(s => s === 'new'))     return 'new';
  return 'upcoming';
}

export default function DetailPage({ params }: PageProps) {
  const { type, id } = params;
  const router = useRouter();
  const { activeMode, getModeColor } = useModeStore();
  const { getModeSettings } = useSettingsStore();
  const {
    loadData, sections: rawSections, getSectionsWithStatus,
    markAsRevised, undoRevision, setDifficulty, setInternalCycle,
    setNote, getNote,
  } = useTrackerStore();

  const modeColor = getModeColor();
  const { cycleDays } = getModeSettings(activeMode);
  const section = getSectionById(id);
  const isSourate = id.startsWith('surah-');

  const [note, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [fromView, setFromView] = useState<string | null>(null);

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
    setNoteText(getNote(LOCAL_USER_ID, type, id));
    const from = new URLSearchParams(window.location.search).get('from');
    if (from) setFromView(from);
  }, [activeMode, id]);

  const sectionsWithStatus = getSectionsWithStatus(activeMode, cycleDays);

  // For sourate: derive status from underlying hizbs/rubs
  let sectionStatus: SectionWithStatus | undefined = sectionsWithStatus.find(s => s.sectionId === id);

  if (isSourate && !sectionStatus) {
    const surah = SURAHS.find(s => s.id === id);
    if (surah) {
      const hizbStatusMap = new Map(sectionsWithStatus.filter(s => s.sectionType === 'hizb').map(s => [s.sectionId, s]));
      const rubStatusMap  = new Map(sectionsWithStatus.filter(s => s.sectionType === 'rub').map(s => [s.sectionId, s]));

      const rubsInSurah = getRubsForSurah(surah.number);
      const hizbNumbers = Array.from(new Set(rubsInSurah.map(r => r.hizbNumber)));
      const trackedHizbNumbers = hizbNumbers.filter(n => {
        const h = HIZBS.find(h => h.number === n);
        return h && hizbStatusMap.has(h.id);
      });

      if (trackedHizbNumbers.length > 0) {
        const statuses: SectionStatus[] = [];
        const lastRevDates: string[] = [];
        let totalRevCount = 0;

        for (const hn of trackedHizbNumbers) {
          const hizb     = HIZBS.find(h => h.number === hn)!;
          const allRubs  = RUBS.filter(r => r.hizbNumber === hn);
          const surahRubs = rubsInSurah.filter(r => r.hizbNumber === hn);

          if (surahRubs.length >= allRubs.length) {
            const hs = hizbStatusMap.get(hizb.id);
            if (hs) {
              statuses.push(hs.status);
              if (hs.lastRevisionDate) lastRevDates.push(hs.lastRevisionDate);
              totalRevCount += hs.revisionCount;
            }
          } else {
            for (const rub of surahRubs) {
              const rs = rubStatusMap.get(rub.id);
              if (rs) {
                statuses.push(rs.status);
                if (rs.lastRevisionDate) lastRevDates.push(rs.lastRevisionDate);
                totalRevCount += rs.revisionCount;
              }
            }
          }
        }

        const latestRevDate = lastRevDates.sort().reverse()[0] ?? null;
        const surahRaw = rawSections.find(s => s.sectionId === id && s.modeKey === activeMode);

        sectionStatus = {
          sectionId: id, sectionType: 'sourate',
          status: statuses.length > 0 ? pickStatus(statuses) : 'new',
          difficulty: surahRaw?.difficulty ?? null,
          lastRevisionDate: latestRevDate,
          nextRevisionDate: null,
          revisionCount: totalRevCount,
          individualCycleDays: cycleDays,
          internalCycleMultiplier: 1,
          notes: '',
        };
      }
    }
  }

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

  const backUrl = fromView ? `/?view=${fromView}`
    : type === 'sourate' ? '/?view=sourate'
    : type === 'hizb'    ? '/?view=hizb'
    : type === 'rub'     ? '/?view=hizb'
    : '/';


  const handleMark = () => {
    if (isSourate) {
      const surah = SURAHS.find(s => s.id === id);
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
          for (const rub of surahRubs) markAsRevised(LOCAL_USER_ID, activeMode, rub.id, 'rub', cycleDays);
        }
      }
    } else {
      markAsRevised(LOCAL_USER_ID, activeMode, id, section.type as SectionType, cycleDays, sectionStatus?.difficulty ?? undefined);
    }
  };

  const handleUndo = () => {
    if (isSourate) {
      const surah = SURAHS.find(s => s.id === id);
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
      undoRevision(LOCAL_USER_ID, activeMode, id);
    }
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
            onClick={() => router.push(backUrl)}
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

        {!isSourate && (
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
        )}

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
