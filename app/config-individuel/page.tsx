'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useTrackerStore } from '../../store/useTrackerStore';
import { useModeStore } from '../../store/useModeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LOCAL_USER_ID } from '../../config/features';
import { JUZS, HIZBS, RUBS } from '../../data/quran/quran-structure';
import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';

const CYCLE_PRESETS = [3, 7, 10, 21, 30];

export default function ConfigIndividuelPage() {
  const { activeMode, getModeColor } = useModeStore();
  const { settings, updateSettings } = useSettingsStore();
  const { selectSections, loadData } = useTrackerStore();
  const modeColor = getModeColor();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedJuz, setExpandedJuz] = useState<string | null>(null);
  const [defaultCycleDays, setDefaultCycleDays] = useState(settings?.groupedCycleDays ?? 7);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
  }, [activeMode]);

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleSave = () => {
    const sectionIds: { id: string; type: 'juz' | 'hizb' | 'rub' }[] = [];
    selectedIds.forEach(id => {
      if (id.startsWith('juz-')) sectionIds.push({ id, type: 'juz' });
      else if (id.startsWith('hizb-')) sectionIds.push({ id, type: 'hizb' });
      else if (id.startsWith('rub-')) sectionIds.push({ id, type: 'rub' });
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
            <h1 className="text-[18px] font-bold text-[#1a1714]">Config Individuel</h1>
            <p className="text-[12px] text-[#9c9890] mt-0.5">Cycles par section</p>
          </div>
          <Link href="/individuel" className="text-[13px] font-semibold" style={{ color: modeColor }}>
            Annuler
          </Link>
        </div>

        <section className="mb-6">
          <h2 className="text-[13px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">Cycle par defaut</h2>
          <div className="flex gap-2 flex-wrap">
            {CYCLE_PRESETS.map(d => (
              <button
                key={d}
                onClick={() => setDefaultCycleDays(d)}
                className="px-4 py-2 rounded-full text-[13px] font-semibold border transition-all"
                style={defaultCycleDays === d
                  ? { background: modeColor, color: '#fff', borderColor: modeColor }
                  : { background: '#fff', color: '#5c5852', borderColor: '#e2ddd6' }
                }
              >
                {d}j
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-[#5c5852] uppercase tracking-wide">Sections</h2>
            <span className="text-[12px] text-[#9c9890]">{selectedIds.size} selectionnees</span>
          </div>
          <div className="space-y-2">
            {JUZS.map(juz => {
              const isOpen = expandedJuz === juz.id;
              const hizbsInJuz = HIZBS.filter(h => h.juzNumber === juz.number);
              const juzSelected = selectedIds.has(juz.id);
              const anySelected = juzSelected || hizbsInJuz.some(h => selectedIds.has(h.id));

              return (
                <div key={juz.id} className="bg-white rounded-2xl border border-[#e2ddd6] overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleItem(juz.id)}
                      className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                      style={juzSelected ? { background: modeColor, borderColor: modeColor } : { background: '#fff', borderColor: '#e2ddd6' }}
                    >
                      {juzSelected && <Check size={12} className="text-white" />}
                    </button>
                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedJuz(isOpen ? null : juz.id)}>
                      <span className="text-[14px] font-semibold text-[#1a1714]">{juz.name}</span>
                    </div>
                    <button onClick={() => setExpandedJuz(isOpen ? null : juz.id)}>
                      <ChevronDown size={16} className="text-[#9c9890] transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-[#f0ece6]">
                      {hizbsInJuz.map((hizb, hIdx) => {
                        const hizbSelected = selectedIds.has(hizb.id);
                        const rubsInHizb = RUBS.filter(r => r.hizbNumber === hizb.number);
                        return (
                          <div key={hizb.id}>
                            <div className={`flex items-center gap-3 px-4 py-2.5 ${hIdx < hizbsInJuz.length - 1 ? 'border-b border-[#f5f3ef]' : ''}`}>
                              <button
                                onClick={() => toggleItem(hizb.id)}
                                className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                                style={hizbSelected ? { background: modeColor, borderColor: modeColor } : { background: '#fff', borderColor: '#e2ddd6' }}
                              >
                                {hizbSelected && <Check size={10} className="text-white" />}
                              </button>
                              <span className="text-[13px] text-[#1a1714] flex-1">Hizb {hizb.number}</span>
                              {hizbSelected && (
                                <Link href={`/detail/hizb/${hizb.id}`} className="text-[11px] font-semibold" style={{ color: modeColor }}>
                                  Regler
                                </Link>
                              )}
                            </div>
                            {hizbSelected && rubsInHizb.map(rub => (
                              <div key={rub.id} className="flex items-center gap-3 px-6 py-2 bg-[#faf9f7] border-b border-[#f0ece6]">
                                <button
                                  onClick={() => toggleItem(rub.id)}
                                  className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                                  style={selectedIds.has(rub.id) ? { background: modeColor, borderColor: modeColor } : { background: '#fff', borderColor: '#e2ddd6' }}
                                >
                                  {selectedIds.has(rub.id) && <Check size={9} className="text-white" />}
                                </button>
                                <span className="text-[12px] text-[#5c5852]">Rub {rub.number}</span>
                              </div>
                            ))}
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
          className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white"
          style={{ background: saved ? '#1a7a3c' : modeColor }}
        >
          {saved ? 'Sauvegarde !' : 'Sauvegarder'}
        </button>
      </div>
    </AppShell>
  );
}
