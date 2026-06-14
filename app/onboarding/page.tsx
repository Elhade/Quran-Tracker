'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LOCAL_USER_ID } from '../../config/features';
import type { TrackingLevel } from '../../types/tracker';
import { Check, BookOpen, Brain, ChevronRight } from 'lucide-react';

const TRACKING_LEVELS: { key: TrackingLevel; label: string; desc: string }[] = [
  { key: 'juz', label: 'Juz', desc: '30 sections (30 parties)' },
  { key: 'hizb', label: 'Hizb', desc: '60 sections (demi-juz)' },
  { key: 'rub', label: "Rub'", desc: '240 sections (quart de hizb)' },
  { key: 'sourate', label: 'Sourate', desc: '114 sections' },
];

const CYCLE_PRESETS = [3, 7, 10, 21, 30];

export default function OnboardingPage() {
  const router = useRouter();
  const { setSettings, completeOnboarding } = useSettingsStore();
  const [step, setStep] = useState(0);
  const [trackingLevel, setTrackingLevel] = useState<TrackingLevel>('hizb');
  const [cycleDays, setCycleDays] = useState(7);
  const [activeModes, setActiveModes] = useState<('lecture' | 'memorisation')[]>(['lecture']);

  const toggleMode = (mode: 'lecture' | 'memorisation') => {
    setActiveModes(prev =>
      prev.includes(mode)
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  };

  const handleFinish = () => {
    setSettings({
      userId: LOCAL_USER_ID,
      activeMode: activeModes[0] ?? 'lecture',
      primaryTrackingLevel: trackingLevel,
      groupedCycleDays: cycleDays,
      groupedCycleStartDate: null,
      quranTextEnabled: true,
      mushafPagesEnabled: true,
      notificationsEnabled: false,
    });
    completeOnboarding();
    router.push('/');
  };

  const STEPS = [
    {
      title: 'Modes de suivi',
      subtitle: 'Quels modes souhaitez-vous activer ?',
      content: (
        <div className="space-y-3">
          <button
            onClick={() => toggleMode('lecture')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all"
            style={activeModes.includes('lecture')
              ? { borderColor: '#c92b2b', background: '#c92b2b08' }
              : { borderColor: '#e2ddd6', background: '#fff' }
            }
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#c92b2b15' }}>
              <BookOpen size={18} style={{ color: '#c92b2b' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-bold text-[#1a1714]">Lecture</p>
              <p className="text-[12px] text-[#9c9890]">Suivi de votre lecture quotidienne</p>
            </div>
            {activeModes.includes('lecture') && <Check size={18} style={{ color: '#c92b2b' }} />}
          </button>
          <button
            onClick={() => toggleMode('memorisation')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all"
            style={activeModes.includes('memorisation')
              ? { borderColor: '#1a5cd4', background: '#1a5cd408' }
              : { borderColor: '#e2ddd6', background: '#fff' }
            }
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1a5cd415' }}>
              <Brain size={18} style={{ color: '#1a5cd4' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-bold text-[#1a1714]">Memorisation</p>
              <p className="text-[12px] text-[#9c9890]">Revision et memorisation du Coran</p>
            </div>
            {activeModes.includes('memorisation') && <Check size={18} style={{ color: '#1a5cd4' }} />}
          </button>
        </div>
      ),
    },
    {
      title: 'Niveau de suivi',
      subtitle: 'Quelle granularite souhaitez-vous ?',
      content: (
        <div className="space-y-2">
          {TRACKING_LEVELS.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => setTrackingLevel(key)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all"
              style={trackingLevel === key
                ? { borderColor: '#c92b2b', background: '#c92b2b08' }
                : { borderColor: '#e2ddd6', background: '#fff' }
              }
            >
              <div className="flex-1 text-left">
                <p className="text-[14px] font-bold text-[#1a1714]">{label}</p>
                <p className="text-[12px] text-[#9c9890]">{desc}</p>
              </div>
              {trackingLevel === key && <Check size={16} style={{ color: '#c92b2b' }} />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Duree du cycle',
      subtitle: 'Tous les combien de jours souhaitez-vous reviser ?',
      content: (
        <div className="flex gap-2 flex-wrap">
          {CYCLE_PRESETS.map(d => (
            <button
              key={d}
              onClick={() => setCycleDays(d)}
              className="px-5 py-3 rounded-2xl text-[14px] font-bold border-2 transition-all"
              style={cycleDays === d
                ? { background: '#c92b2b', color: '#fff', borderColor: '#c92b2b' }
                : { background: '#fff', color: '#1a1714', borderColor: '#e2ddd6' }
              }
            >
              {d} jours
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-[#f5f3ef] max-w-[420px] mx-auto flex flex-col">
      <div className="flex-1 px-5 pt-12 pb-6 flex flex-col">
        <div className="mb-8">
          <div className="flex gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full flex-1 transition-all"
                style={{ background: i <= step ? '#c92b2b' : '#e2ddd6' }}
              />
            ))}
          </div>
          <p className="text-[11px] font-bold text-[#9c9890] uppercase tracking-wider mb-2">
            Etape {step + 1} / {STEPS.length}
          </p>
          <h1 className="text-[24px] font-bold text-[#1a1714] leading-tight mb-1">{current.title}</h1>
          <p className="text-[14px] text-[#9c9890]">{current.subtitle}</p>
        </div>

        <div className="flex-1">{current.content}</div>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-5 py-3.5 rounded-2xl text-[14px] font-semibold border border-[#e2ddd6] text-[#5c5852] bg-white"
            >
              Retour
            </button>
          )}
          <button
            onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
            disabled={activeModes.length === 0}
            className="flex-1 py-3.5 rounded-2xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ background: '#c92b2b' }}
          >
            {isLast ? 'Commencer' : <>Suivant <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
