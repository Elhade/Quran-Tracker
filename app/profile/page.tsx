'use client';
import AppShell from '@/components/layout/AppShell';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useModeStore } from '@/store/useModeStore';
import { useTrackerStore } from '@/store/useTrackerStore';
import { LOCAL_USER_ID } from '@/config/features';
import { User, BookOpen, Brain, Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { settings, updateSettings, reset } = useSettingsStore();
  const { activeMode, getModeColor } = useModeStore();
  const { getTotalRevisionCount } = useTrackerStore();
  const modeColor = getModeColor();

  const lectureCount = getTotalRevisionCount('lecture');
  const memoCount = getTotalRevisionCount('memorisation');

  const handleReset = () => {
    if (confirm('Effacer toutes les donnees ? Cette action est irreversible.')) {
      reset();
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('qt:'));
        keys.forEach(k => localStorage.removeItem(k));
      }
    }
  };

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-6">
        <div className="mb-6">
          <h1 className="text-[18px] font-bold text-[#1a1714]">Profil</h1>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-5 mb-5 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c92b2b, #b8841a)' }}
          >
            U
          </div>
          <div>
            <p className="text-[16px] font-bold text-[#1a1714]">Utilisateur</p>
            <p className="text-[12px] text-[#9c9890] mt-0.5">Mode local</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={14} style={{ color: '#c92b2b' }} />
              <span className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide">Lecture</span>
            </div>
            <p className="text-[20px] font-bold text-[#1a1714]">{lectureCount}</p>
            <p className="text-[11px] text-[#9c9890]">revisions</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Brain size={14} style={{ color: '#1a5cd4' }} />
              <span className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide">Memorisation</span>
            </div>
            <p className="text-[20px] font-bold text-[#1a1714]">{memoCount}</p>
            <p className="text-[11px] text-[#9c9890]">revisions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ddd6] overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-[#f5f3ef] flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#1a1714]">Configurer Lecture</span>
            <Link href="/config" className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: '#c92b2b' }}>
              Modifier <ChevronRight size={14} />
            </Link>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#1a1714]">Configurer Memorisation</span>
            <Link href="/config" className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: '#1a5cd4' }}>
              Modifier <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ddd6] overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-[#f5f3ef] flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#1a1714]">Niveau de suivi</span>
            <span className="text-[13px] text-[#9c9890] capitalize">{settings?.primaryTrackingLevel ?? 'hizb'}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#1a1714]">Cycle par defaut</span>
            <span className="text-[13px] text-[#9c9890]">{settings?.groupedCycleDays ?? 7} jours</span>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 border border-[#c92b2b20] text-[#c92b2b] bg-[#c92b2b08]"
        >
          <Trash2 size={15} />
          Reinitialiser les donnees
        </button>
      </div>
    </AppShell>
  );
}
