'use client';
import { useRouter } from 'next/navigation';
import { useModeStore } from '../../store/useModeStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function TopModeBar() {
  const router = useRouter();
  const { activeMode, setActiveMode } = useModeStore();
  const { settings } = useSettingsStore();

  const displayName = 'Utilisateur';
  const initials = 'U';

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-50 h-11 bg-[#161412] border-b border-white/7 flex items-center justify-between px-4">
      <div className="flex bg-white/[0.09] rounded-full p-[3px] gap-0.5">
        <button
          className="px-3.5 py-1 rounded-full text-[11px] font-bold transition-all"
          style={
            activeMode === 'lecture'
              ? { background: '#c92b2b', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.35)' }
              : { color: 'rgba(255,255,255,0.4)', background: 'transparent' }
          }
          onClick={() => setActiveMode('lecture')}
        >
          Lecture
        </button>
        <button
          className="px-3.5 py-1 rounded-full text-[11px] font-bold transition-all"
          style={
            activeMode === 'memorisation'
              ? { background: '#1a5cd4', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.35)' }
              : { color: 'rgba(255,255,255,0.4)', background: 'transparent' }
          }
          onClick={() => setActiveMode('memorisation')}
        >
          Memorisation
        </button>
      </div>

      <button
        onClick={() => router.push('/profile')}
        className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-white/[0.07] transition-colors"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #c92b2b, #b8841a)' }}
        >
          {initials}
        </div>
        <span className="text-[11px] font-semibold text-white/60">{displayName}</span>
      </button>
    </div>
  );
}
