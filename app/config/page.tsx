'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useTrackerStore } from '../../store/useTrackerStore';
import { useModeStore } from '../../store/useModeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LOCAL_USER_ID } from '../../config/features';
import { JUZS, HIZBS } from '../../data/quran/quran-structure';
import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function ConfigPage() {
  const { activeMode, getModeColor } = useModeStore();
  const { settings, updateSettings } = useSettingsStore();
  const { selectSections, clearSelections, loadData } = useTrackerStore();
  const modeColor = getModeColor();
  const modeLabel = activeMode === 'lecture' ? 'Lecture' : 'Memorisation';

  const cycleDays = settings?.groupedCycleDays ?? 7;
  const [selectedCycle, setSelectedCycle] = useState(cycleDays);
  const [selectedJuzIds, setSelectedJuzIds] = useState<Set<string>>(new Set());
  const [expandedJuz, setExpandedJuz] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
    setSelectedCycle(settings?.groupedCycleDays ?? 7);
  }, [activeMode]);

  const CYCLE_PRESETS = [3, 7, 10, 21, 30];

  const toggleJuz = (juzId: string) => {
    const juz = JUZS.find(j => j.id === juzId);
    if (!juz) return;
    const next = new Set(selectedJuzIds);
    if (next.has(juzId)) {
      next.delete(juzId);
      juz.childrenIds.forEach((hId: string) => next.delete(hId));
    } else {
      next.add(juzId);
      juz.childrenIds.forEach((hId: string) => next.add(hId));
    }
    setSelectedJuzIds(next);
  };

  const toggleHizb = (hizbId: string, juzId: string) => {
    const juz = JUZS.find(j => j.id === juzId);
    if (!juz) return;
    const next = new Set(selectedJuzIds);
    if (next.has(hizbId)) {
      next.delete(hizbId);
      next.delete(juzId);
    } else {
      next.add(hizbId);
      const allHizbsSelected = juz.childrenIds.every((hId: string) => hId === hizbId || next.has(hId));
      if (allHizbsSelected) next.add(juzId);
    }
    setSelectedJuzIds(next);
  };

  const handleSave = () => {
    updateSettings({ groupedCycleDays: selectedCycle });

    const sectionIds: { id: string; type: 'juz' | 'hizb' }[] = [];
    selectedJuzIds.forEach(id => {
      if (id.startsWith('juz-')) sectionIds.push({ id, type: 'juz' });
      else if (id.startsWith('hizb-')) sectionIds.push({ id, type: 'hizb' });
    });

    selectSections(LOCAL_USER_ID, activeMode, sectionIds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[18px] font-bold text-[#1a1714]">Configuration</h1>
            <p className="text-[12px] text-[#9c9890] mt-0.5">Mode {modeLabel}</p>
          </div>
          <Link href="/" className="text-[13px] font-semibold" style={{ color: modeColor }}>
            Annuler
          </Link>
        </div>

        <section className="mb-6">
          <h2 className="text-[13px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">Duree du cycle</h2>
          <div className="flex gap-2 flex-wrap">
            {CYCLE_PRESETS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedCycle(d)}
                className="px-4 py-2 rounded-full text-[13px] font-semibold border transition-all"
                style={selectedCycle === d
                  ? { background: modeColor, color: '#fff', borderColor: modeColor }
                  : { background: '#fff', color: '#5c5852', borderColor: '#e2ddd6' }
                }
              >
                {d} jours
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-[#5c5852] uppercase tracking-wide">Sections a suivre</h2>
            <button onClick={() => setSelectedJuzIds(new Set())} className="text-[12px] text-[#9c9890]">
              Tout deselectionner
            </button>
          </div>
          <div className="space-y-2">
            {JUZS.map(juz => {
              const juzSelected = selectedJuzIds.has(juz.id);
              const hizbsInJuz = HIZBS.filter(h => h.juzNumber === juz.number);
              const anyHizbSelected = hizbsInJuz.some(h => selectedJuzIds.has(h.id));
              const isOpen = expandedJuz === juz.id;

              return (
                <div key={juz.id} className="bg-white rounded-2xl border border-[#e2ddd6] overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleJuz(juz.id)}
                      className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={juzSelected || anyHizbSelected
                        ? { background: modeColor, borderColor: modeColor }
                        : { background: '#fff', borderColor: '#e2ddd6' }
                      }
                    >
                      {(juzSelected || anyHizbSelected) && <Check size={12} className="text-white" />}
                    </button>
                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedJuz(isOpen ? null : juz.id)}>
                      <span className="text-[14px] font-semibold text-[#1a1714]">{juz.name}</span>
                      <span className="ml-2 text-[11px] text-[#9c9890]">{juz.reference}</span>
                    </div>
                    <button onClick={() => setExpandedJuz(isOpen ? null : juz.id)}>
                      <ChevronDown
                        size={16}
                        className="text-[#9c9890] transition-transform"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                      />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="border-t border-[#f0ece6]">
                      {hizbsInJuz.map((hizb, idx) => {
                        const hizbSelected = selectedJuzIds.has(hizb.id);
                        return (
                          <div
                            key={hizb.id}
                            className={`flex items-center gap-3 px-4 py-2.5 ${idx < hizbsInJuz.length - 1 ? 'border-b border-[#f5f3ef]' : ''}`}
                          >
                            <button
                              onClick={() => toggleHizb(hizb.id, juz.id)}
                              className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={hizbSelected
                                ? { background: modeColor, borderColor: modeColor }
                                : { background: '#fff', borderColor: '#e2ddd6' }
                              }
                            >
                              {hizbSelected && <Check size={10} className="text-white" />}
                            </button>
                            <span className="text-[13px] text-[#1a1714]">Hizb {hizb.number}</span>
                            <span className="text-[11px] text-[#9c9890] ml-auto">{hizb.reference}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white transition-all"
          style={{ background: saved ? '#1a7a3c' : modeColor }}
        >
          {saved ? 'Sauvegarde !' : 'Sauvegarder'}
        </button>
      </div>
    </AppShell>
  );
}
