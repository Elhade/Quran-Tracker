'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useTrackerStore } from '@/store/useTrackerStore';
import { useModeStore } from '@/store/useModeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LOCAL_USER_ID } from '@/config/features';
import { JUZS, HIZBS, SURAHS, getHizbsForSurah } from '@/data/quran/quran-structure';
import { Check, ChevronDown, Search, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CYCLE_PRESETS = [3, 7, 10, 21, 30];

type ConfigView = 'juz' | 'sourate';

export default function ConfigPage() {
  const router = useRouter();
  const { activeMode, getModeColor, getModeHeaderBg } = useModeStore();
  const { getModeSettings, updateModeSettings } = useSettingsStore();
  const { selectSections, loadData, sections } = useTrackerStore();
  // Always pass activeMode explicitly so color is correct on the SAME render as the mode change
  const modeColor = getModeColor(activeMode);
  const headerBg = getModeHeaderBg(activeMode);
  const modeLabel = activeMode === 'lecture' ? 'Lecture' : 'Mémorisation';

  // Cycle stored per-mode so switching modes reads the correct value without needing an effect
  const [cycleByMode, setCycleByMode] = useState<Record<string, number>>({});
  const storedCycleDays = getModeSettings(activeMode).cycleDays;
  // Use the local override for this mode if it exists, otherwise fall back to persisted settings
  const selectedCycle = cycleByMode[activeMode] ?? storedCycleDays;

  const [customCycle, setCustomCycle] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [selectedJuzIds, setSelectedJuzIds] = useState<Set<string>>(new Set());
  const [expandedJuz, setExpandedJuz] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const [configView, setConfigView] = useState<ConfigView>('juz');

  useEffect(() => {
    loadData(LOCAL_USER_ID, activeMode);
    setCustomCycle('');
    setUseCustom(false);
  }, [activeMode]);

  // Sync selections from store — always reset (even to empty) on mode switch
  useEffect(() => {
    const modeSections = sections.filter(s => s.modeKey === activeMode && s.isSelected);
    setSelectedJuzIds(new Set(modeSections.map(s => s.sectionId)));
  }, [sections, activeMode]);

  const effectiveCycle = useCustom ? (parseInt(customCycle) || storedCycleDays) : selectedCycle;

  // ── Juz/Hizb toggle logic ────────────────────────────────────────────────
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

  // ── Sourate toggle logic ─────────────────────────────────────────────────
  // A surah is "selected" when ALL its covering hizbs are selected
  // A surah is "partial" when SOME (but not all) covering hizbs are selected
  const getSurahState = (surahId: string): 'selected' | 'partial' | 'none' => {
    const surah = SURAHS.find(s => s.id === surahId);
    if (!surah) return 'none';
    const hizbs = getHizbsForSurah(surah);
    if (hizbs.length === 0) return 'none';
    const selectedCount = hizbs.filter(h => selectedJuzIds.has(h.id)).length;
    if (selectedCount === hizbs.length) return 'selected';
    if (selectedCount > 0) return 'partial';
    return 'none';
  };

  const toggleSurah = (surahId: string) => {
    const surah = SURAHS.find(s => s.id === surahId);
    if (!surah) return;
    const hizbs = getHizbsForSurah(surah);
    const allSelected = hizbs.every(h => selectedJuzIds.has(h.id));
    const next = new Set(selectedJuzIds);
    if (allSelected) {
      hizbs.forEach(h => {
        next.delete(h.id);
        // Remove parent juz if it was selected
        next.delete(`juz-${h.juzNumber}`);
      });
    } else {
      hizbs.forEach(h => {
        next.add(h.id);
        // Auto-select parent juz if all its hizbs are now selected
        const juz = JUZS.find(j => j.number === h.juzNumber);
        if (juz && juz.childrenIds.every((hId: string) => next.has(hId))) {
          next.add(juz.id);
        }
      });
    }
    setSelectedJuzIds(next);
  };

  // ── Summary counts ───────────────────────────────────────────────────────
  const selectedIdsArray = Array.from(selectedJuzIds);
  const selectedJuzCount = selectedIdsArray.filter(id => id.startsWith('juz-')).length;
  const selectedHizbCount = selectedIdsArray.filter(id => id.startsWith('hizb-')).length;
  const selectedSurahCount = useMemo(
    () => SURAHS.filter(s => getSurahState(s.id) === 'selected').length,
    [selectedJuzIds]
  );
  const selectedPageCount = useMemo(
    () => HIZBS
      .filter(h => selectedJuzIds.has(h.id))
      .reduce((sum, h) => sum + (h.pageEnd - h.pageStart + 1), 0),
    [selectedJuzIds]
  );
  // Smart label: show juzs only when selection is exclusively full juzs (N hizbs = N/2 juzs)
  // Otherwise show hizb count — never show both to save space
  const sectionLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedJuzCount > 0 && selectedHizbCount === selectedJuzCount * 2) {
      parts.push(`${selectedJuzCount} juz`);
    } else if (selectedHizbCount > 0) {
      parts.push(`${selectedHizbCount} hizb`);
    }
    if (selectedSurahCount > 0) parts.push(`${selectedSurahCount} sourate`);
    if (selectedPageCount > 0) parts.push(`${selectedPageCount} pages`);
    return parts.join(' · ');
  }, [selectedJuzCount, selectedHizbCount, selectedSurahCount, selectedPageCount]);

  const hizbPerDay = effectiveCycle > 0 && selectedHizbCount > 0
    ? (selectedHizbCount / effectiveCycle).toFixed(1)
    : '0';
  const pagesPerDay = effectiveCycle > 0 && selectedPageCount > 0
    ? Math.round(selectedPageCount / effectiveCycle)
    : 0;

  // ── Filtered lists ───────────────────────────────────────────────────────
  const filteredJuzs = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return JUZS;
    return JUZS.filter(juz => {
      const hizbsInJuz = HIZBS.filter(h => h.juzNumber === juz.number);
      return (
        juz.name.toLowerCase().includes(q) ||
        juz.reference?.toLowerCase().includes(q) ||
        String(juz.number).includes(q) ||
        hizbsInJuz.some(h => String(h.number).includes(q))
      );
    });
  }, [search]);

  const filteredSurahs = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.arabicName.includes(q) ||
      String(s.number).includes(q)
    );
  }, [search]);

  const handleSave = () => {
    updateModeSettings(activeMode, { cycleDays: effectiveCycle });
    const sectionIds: { id: string; type: 'juz' | 'hizb' }[] = [];
    Array.from(selectedJuzIds).forEach(id => {
      if (id.startsWith('juz-')) sectionIds.push({ id, type: 'juz' });
      else if (id.startsWith('hizb-')) sectionIds.push({ id, type: 'hizb' });
    });
    selectSections(LOCAL_USER_ID, activeMode, sectionIds);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.push('/');
    }, 800);
  };

  const hasSelection = selectedJuzCount > 0 || selectedHizbCount > 0;

  return (
    <AppShell hideNav>
      {/* Colored header */}
      <div style={{ background: headerBg }} className="px-5 pt-5 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/"
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <ArrowLeft size={16} className="text-white" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-white leading-tight">Configuration</h1>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Mode {modeLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32">
        {/* Cycle section */}
        <section className="mb-6">
          <h2 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide mb-3">
            Durée du cycle
          </h2>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {CYCLE_PRESETS.map(d => {
              const active = !useCustom && selectedCycle === d;
              return (
                <button
                  key={d}
                  onClick={() => { setCycleByMode(prev => ({ ...prev, [activeMode]: d })); setUseCustom(false); setCustomCycle(''); }}
                  className="py-3 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all"
                  style={active
                    ? { background: modeColor, border: `2px solid ${modeColor}` }
                    : { background: '#fff', border: '2px solid #e2ddd6' }
                  }
                >
                  <span
                    className="text-[17px] font-bold leading-none"
                    style={{ color: active ? '#fff' : '#1a1714' }}
                  >
                    {d}
                  </span>
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: active ? 'rgba(255,255,255,0.7)' : '#9c9890' }}
                  >
                    jours
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white rounded-xl border border-[#e2ddd6] px-3 py-2.5">
              <input
                type="number"
                min={1}
                max={365}
                value={customCycle}
                placeholder="Cycle personnalisé..."
                onChange={e => { setCustomCycle(e.target.value); setUseCustom(true); }}
                className="flex-1 text-[13px] text-[#1a1714] placeholder-[#9c9890] outline-none bg-transparent"
              />
              {customCycle && (
                <button onClick={() => { setCustomCycle(''); setUseCustom(false); }}>
                  <X size={14} className="text-[#9c9890]" />
                </button>
              )}
            </div>
            <span className="text-[12px] text-[#9c9890] flex-shrink-0">jours</span>
          </div>
        </section>

        {/* Summary bar */}
        {hasSelection && (
          <div
            className="rounded-2xl px-4 py-3 mb-5 flex items-center justify-between gap-3"
            style={{ background: `${modeColor}10`, border: `1px solid ${modeColor}20` }}
          >
            <div className="text-[13px] font-semibold leading-snug" style={{ color: modeColor }}>
              {sectionLabel}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[12px] font-bold" style={{ color: modeColor }}>
                {hizbPerDay} hizb/jour
              </div>
              {pagesPerDay > 0 && (
                <div className="text-[11px] font-semibold" style={{ color: `${modeColor}99` }}>
                  soit {pagesPerDay} pages/j
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sections */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-bold text-[#5c5852] uppercase tracking-wide">Sections à suivre</h2>
            {selectedJuzIds.size > 0 && (
              <button
                onClick={() => setSelectedJuzIds(new Set())}
                className="text-[12px] text-[#9c9890] flex items-center gap-1"
              >
                <X size={11} /> Tout effacer
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex bg-white rounded-xl p-1 border border-[#e2ddd6] mb-3">
            {(['juz', 'sourate'] as ConfigView[]).map(v => {
              const active = configView === v;
              const label = v === 'juz' ? 'Par Juz' : 'Par Sourate';
              return (
                <button
                  key={v}
                  onClick={() => { setConfigView(v); setSearch(''); setExpandedJuz(null); }}
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all"
                  style={active ? { background: modeColor, color: '#fff' } : { color: '#9c9890' }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-[#e2ddd6] px-3 py-2.5 mb-3">
            <Search size={14} className="text-[#9c9890] flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={configView === 'juz' ? 'Rechercher un juz...' : 'Rechercher une sourate...'}
              className="flex-1 text-[13px] text-[#1a1714] placeholder-[#9c9890] outline-none bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={14} className="text-[#9c9890]" />
              </button>
            )}
          </div>

          {/* ── Juz view ── */}
          {configView === 'juz' && (
            <div className="space-y-2">
              {filteredJuzs.map(juz => {
                const juzSelected = selectedJuzIds.has(juz.id);
                const hizbsInJuz = HIZBS.filter(h => h.juzNumber === juz.number);
                const anyHizbSelected = hizbsInJuz.some(h => selectedJuzIds.has(h.id));
                const isOpen = expandedJuz === juz.id;
                const selectedCount = hizbsInJuz.filter(h => selectedJuzIds.has(h.id)).length;

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
                      <div
                        className="flex-1 cursor-pointer flex items-center gap-2"
                        onClick={() => setExpandedJuz(isOpen ? null : juz.id)}
                      >
                        <span className="text-[14px] font-semibold text-[#1a1714]">{juz.name}</span>
                        <span className="text-[11px] text-[#9c9890]">{juz.reference}</span>
                        {selectedCount > 0 && !juzSelected && (
                          <span
                            className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: `${modeColor}15`, color: modeColor }}
                          >
                            {selectedCount}/{hizbsInJuz.length}
                          </span>
                        )}
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
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${idx < hizbsInJuz.length - 1 ? 'border-b border-[#f5f3ef]' : ''}`}
                              onClick={() => toggleHizb(hizb.id, juz.id)}
                            >
                              <div
                                className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                style={hizbSelected
                                  ? { background: modeColor, borderColor: modeColor }
                                  : { background: '#fff', borderColor: '#e2ddd6' }
                                }
                              >
                                {hizbSelected && <Check size={10} className="text-white" />}
                              </div>
                              <span className="text-[13px] text-[#1a1714]">Hizb {hizb.number}</span>
                              <span className="text-[11px] text-[#9c9890] ml-auto">{hizb.pageEnd - hizb.pageStart + 1} p.</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Sourate view ── */}
          {configView === 'sourate' && (
            <div className="space-y-2">
              {filteredSurahs.map(surah => {
                const state = getSurahState(surah.id);
                const isSelected = state === 'selected';
                const isPartial = state === 'partial';
                const active = isSelected || isPartial;
                return (
                  <button
                    key={surah.id}
                    onClick={() => toggleSurah(surah.id)}
                    className="w-full bg-white rounded-2xl border flex items-center gap-3 px-4 py-3 text-left transition-all"
                    style={{ borderColor: isSelected ? modeColor : '#e2ddd6' }}
                  >
                    <div
                      className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={active
                        ? { background: modeColor, borderColor: modeColor }
                        : { background: '#fff', borderColor: '#e2ddd6' }
                      }
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                      {isPartial && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={isSelected
                        ? { background: modeColor, color: '#fff' }
                        : { background: `${modeColor}12`, color: modeColor }
                      }
                    >
                      {surah.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#1a1714]">{surah.name}</span>
                        <span className="text-[12px] text-[#9c9890]">·</span>
                        <span className="text-[12px] text-[#9c9890]">{surah.verseCount} v.</span>
                      </div>
                      <span className="text-[11px] text-[#c5c0ba]">{surah.pageEnd - surah.pageStart + 1} p.</span>
                    </div>
                    <span className="text-[15px] text-[#3a3632] flex-shrink-0" style={{ fontFamily: 'var(--font-amiri)' }}>
                      {surah.arabicName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 pb-6 pt-3 bg-[#f5f3ef]/95 backdrop-blur-md border-t border-[#e2ddd6]">
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white transition-all"
          style={{ background: saved ? '#1a7a3c' : headerBg }}
        >
          {saved ? 'Sauvegardé !' : 'Démarrer la révision'}
        </button>
      </div>
    </AppShell>
  );
}
