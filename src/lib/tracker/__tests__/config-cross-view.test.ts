/**
 * Cross-view coherence tests: juz/hizb view ↔ sourate view
 *
 * The config page uses two separate state atoms:
 *   - juzViewIds    → hizbs/juzs checked in the juz/hizb tab (only toggleJuz/toggleHizb write here)
 *   - selectedSurahIds → surahs checked in the sourate tab (only toggleSurah writes here)
 *
 * The display-facing selectedJuzIds is a derived union:
 *   selectedJuzIds = juzViewIds ∪ surahDerivedJuzIds(selectedSurahIds)
 *
 * This architecture ensures each view's deselections never corrupt the other view's state.
 */
import { describe, it, expect } from 'vitest';
import { JUZS, HIZBS, SURAHS, getHizbsForSurah } from '@/data/quran/quran-structure';

// ── Pure re-implementations of config page helpers ─────────────────────────

/** Mirrors toggleJuz — only writes to juzViewIds, never looks at surah state */
function toggleJuz(juzId: string, current: Set<string>): Set<string> {
  const juz = JUZS.find(j => j.id === juzId)!;
  const next = new Set(current);
  if (next.has(juzId)) {
    next.delete(juzId);
    juz.childrenIds.forEach(hId => next.delete(hId));
  } else {
    next.add(juzId);
    juz.childrenIds.forEach(hId => next.add(hId));
  }
  return next;
}

/** Mirrors toggleSurah — only writes to selectedSurahIds */
function toggleSurah(surahId: string, current: Set<string>): Set<string> {
  const next = new Set(current);
  next.has(surahId) ? next.delete(surahId) : next.add(surahId);
  return next;
}

/** Mirrors surahDerivedJuzIds useMemo */
function computeSurahDerived(surahIds: Set<string>): Set<string> {
  const result = new Set<string>();
  surahIds.forEach(sid => {
    const s = SURAHS.find(s => s.id === sid);
    if (s) getHizbsForSurah(s).forEach(h => result.add(h.id));
  });
  JUZS.forEach(juz => {
    if (juz.childrenIds.every(hId => result.has(hId))) result.add(juz.id);
  });
  return result;
}

/** Mirrors the derived selectedJuzIds = juzViewIds ∪ surahDerived */
function computeSelectedJuzIds(juzViewIds: Set<string>, surahIds: Set<string>): Set<string> {
  const result = new Set(juzViewIds);
  computeSurahDerived(surahIds).forEach(id => result.add(id));
  return result;
}

/** getSurahState mirrors the component logic */
function getSurahState(
  surahId: string,
  selectedSurahIds: Set<string>,
  juzViewIds: Set<string>,
): 'selected' | 'partial' | 'none' {
  if (selectedSurahIds.has(surahId)) return 'selected';
  const surah = SURAHS.find(s => s.id === surahId);
  if (!surah) return 'none';
  const hizbs = getHizbsForSurah(surah);
  if (hizbs.length === 0) return 'none';
  const coveredCount = hizbs.filter(h => juzViewIds.has(h.id)).length;
  if (coveredCount === hizbs.length) return 'selected'; // all hizbs covered by juz-view
  if (coveredCount > 0) return 'partial';
  return 'none';
}

// ── Juz view → Sourate view coherence ─────────────────────────────────────

describe('Juz view → Sourate view: getSurahState', () => {
  it('selecting juz-1 makes Al-Fatiha appear as selected (all 1 hizb covered)', () => {
    // Al-Fatiha has only hizb-1 — selecting juz-1 covers it entirely → 'selected'
    const juzViewIds = toggleJuz('juz-1', new Set());
    expect(getSurahState('surah-1', new Set(), juzViewIds)).toBe('selected');
  });

  it('selecting juz-1 makes Al-Baqara appear as partial (spans hizb-1 and hizb-2)', () => {
    const juzViewIds = toggleJuz('juz-1', new Set());
    expect(getSurahState('surah-2', new Set(), juzViewIds)).toBe('partial');
  });

  it('selecting juz-1 does NOT affect surahs outside juz-1', () => {
    const juzViewIds = toggleJuz('juz-1', new Set());
    // Al-Imran starts at page 50 (juz-3 territory), outside juz-1
    expect(getSurahState('surah-3', new Set(), juzViewIds)).toBe('none');
  });

  it('selecting only hizb-1 (no juz) makes Al-Fatiha selected (all 1 hizb covered)', () => {
    const juzViewIds = new Set(['hizb-1']);
    expect(getSurahState('surah-1', new Set(), juzViewIds)).toBe('selected');
  });

  it('deselecting juz-1 removes the partial state from Al-Fatiha', () => {
    const selected = toggleJuz('juz-1', new Set());
    const deselected = toggleJuz('juz-1', selected);
    expect(getSurahState('surah-1', new Set(), deselected)).toBe('none');
  });

  it('a surah selected explicitly in sourate view is "selected" (not "partial") even if its juz is also selected', () => {
    const juzViewIds = toggleJuz('juz-1', new Set());
    const surahIds = new Set(['surah-1']);
    // surah-1 is explicitly selected → 'selected', not 'partial'
    expect(getSurahState('surah-1', surahIds, juzViewIds)).toBe('selected');
  });

  it('partial state is not triggered by surahs selected in sourate view (only juz-view hizbs count)', () => {
    // Select surah-1 in sourate view — hizb-1 is surah-derived, NOT in juzViewIds
    const surahIds = toggleSurah('surah-1', new Set());
    const juzViewIds = new Set<string>(); // no juz-view selections
    // Al-Fatiha is 'selected'
    expect(getSurahState('surah-1', surahIds, juzViewIds)).toBe('selected');
    // Al-Baqara overlaps hizb-1, but hizb-1 is NOT in juzViewIds → should NOT be 'partial'
    expect(getSurahState('surah-2', surahIds, juzViewIds)).toBe('none');
  });
});

// ── Sourate view → Juz view coherence ─────────────────────────────────────

describe('Sourate view → Juz view: derived selectedJuzIds', () => {
  it('selecting Al-Fatiha adds hizb-1 to selectedJuzIds', () => {
    const surahIds = toggleSurah('surah-1', new Set());
    expect(computeSelectedJuzIds(new Set(), surahIds).has('hizb-1')).toBe(true);
  });

  it('selecting Al-Fatiha does NOT select juz-1 (only hizb-1 covered, not hizb-2)', () => {
    const surahIds = toggleSurah('surah-1', new Set());
    const ids = computeSelectedJuzIds(new Set(), surahIds);
    expect(ids.has('juz-1')).toBe(false);
    expect(ids.has('hizb-2')).toBe(false);
  });

  it('deselecting Al-Fatiha removes hizb-1 from selectedJuzIds', () => {
    let surahIds = toggleSurah('surah-1', new Set());
    surahIds = toggleSurah('surah-1', surahIds); // deselect
    expect(computeSelectedJuzIds(new Set(), surahIds).has('hizb-1')).toBe(false);
  });

  it('juz-1 is auto-selected in selectedJuzIds when both hizbs are covered by surah selections', () => {
    // surah-2 (Al-Baqara pages 2-49) overlaps hizb-1 AND hizb-2
    const surahIds = toggleSurah('surah-2', new Set());
    const ids = computeSelectedJuzIds(new Set(), surahIds);
    expect(ids.has('hizb-1')).toBe(true);
    expect(ids.has('hizb-2')).toBe(true);
    expect(ids.has('juz-1')).toBe(true);
  });
});

// ── Cross-view deselection coherence ──────────────────────────────────────

describe('Cross-view deselection coherence', () => {
  it('selecting juz-1 then surah-1: Al-Fatiha is selected in both cases (juz-view fully covers it)', () => {
    const juzViewIds = toggleJuz('juz-1', new Set());
    // Before explicit surah selection: already 'selected' (juz-view fully covers Al-Fatiha)
    expect(getSurahState('surah-1', new Set(), juzViewIds)).toBe('selected');
    // After explicit surah selection: still 'selected'
    const surahIds = toggleSurah('surah-1', new Set());
    expect(getSurahState('surah-1', surahIds, juzViewIds)).toBe('selected');
  });

  it('deselecting juz-1 while surah-1 is selected: Al-Fatiha stays selected (surahIds unchanged)', () => {
    let juzViewIds = toggleJuz('juz-1', new Set());
    const surahIds = toggleSurah('surah-1', new Set());
    juzViewIds = toggleJuz('juz-1', juzViewIds); // deselect juz-1
    // surahIds is untouched — surah-1 is still 'selected'
    expect(getSurahState('surah-1', surahIds, juzViewIds)).toBe('selected');
  });

  it('deselecting surah-1 while juz-1 is selected: hizb-1 preserved in selectedJuzIds', () => {
    // juz-view: select juz-1 → juzViewIds has hizb-1
    const juzViewIds = toggleJuz('juz-1', new Set());
    // sourate-view: select then deselect surah-1 → surahIds ends up empty
    let surahIds = toggleSurah('surah-1', new Set());
    surahIds = toggleSurah('surah-1', surahIds);
    // selectedJuzIds = juzViewIds ∪ surahDerived({}) = juzViewIds
    const ids = computeSelectedJuzIds(juzViewIds, surahIds);
    expect(surahIds.has('surah-1')).toBe(false); // surah removed ✓
    expect(ids.has('hizb-1')).toBe(true);  // hizb-1 preserved (juzViewIds protects it) ✓
    expect(ids.has('juz-1')).toBe(true);   // juz-1 preserved ✓
    expect(ids.has('hizb-2')).toBe(true);  // hizb-2 untouched ✓
  });

  it('selecting surah-1 then deselecting juz-1: hizb-1 preserved by surah-view', () => {
    // sourate-view: select surah-1 → surahDerived includes hizb-1
    const surahIds = toggleSurah('surah-1', new Set());
    // juz-view: select then deselect juz-1 → juzViewIds ends up empty
    let juzViewIds = toggleJuz('juz-1', new Set());
    juzViewIds = toggleJuz('juz-1', juzViewIds);
    // selectedJuzIds = {} ∪ surahDerived({surah-1}) = {hizb-1}
    const ids = computeSelectedJuzIds(juzViewIds, surahIds);
    expect(ids.has('hizb-1')).toBe(true);  // preserved by surah-view ✓
    // getSurahState returns 'selected' because surah-1 is still in surahIds
    expect(getSurahState('surah-1', surahIds, juzViewIds)).toBe('selected');
  });

  it('two surahs sharing a hizb: deselecting one does not remove the shared hizb', () => {
    // surah-1 (hizb-1) and surah-2 (hizbs 1-5) both cover hizb-1
    let surahIds = toggleSurah('surah-1', new Set());
    surahIds = toggleSurah('surah-2', surahIds);
    // Deselect surah-1 — surah-2 still needs hizb-1
    surahIds = toggleSurah('surah-1', surahIds);
    const ids = computeSelectedJuzIds(new Set(), surahIds);
    expect(ids.has('hizb-1')).toBe(true);  // protected by surah-2 ✓
    expect(surahIds.has('surah-1')).toBe(false);
    expect(surahIds.has('surah-2')).toBe(true);
  });
});

// ── Round-trip coherence ───────────────────────────────────────────────────

describe('Round-trip: select in juz view, verify sourate view, back to juz view', () => {
  it('select juz-1 → check Al-Fatiha selected (1 hizb fully covered) → deselect → Al-Fatiha none', () => {
    let juzViewIds = new Set<string>();
    const surahIds = new Set<string>();

    // Step 1: select juz-1 in juz view
    juzViewIds = toggleJuz('juz-1', juzViewIds);
    expect(juzViewIds.has('juz-1')).toBe(true);
    expect(juzViewIds.has('hizb-1')).toBe(true);

    // Step 2: sourate view shows Al-Fatiha as selected (all 1 hizb covered)
    expect(getSurahState('surah-1', surahIds, juzViewIds)).toBe('selected');

    // Step 3: deselect juz-1 in juz view
    juzViewIds = toggleJuz('juz-1', juzViewIds);
    expect(juzViewIds.size).toBe(0);

    // Step 4: sourate view shows Al-Fatiha as none
    expect(getSurahState('surah-1', surahIds, juzViewIds)).toBe('none');
  });

  it('select surah-2 (spans juz-1 fully) → selectedJuzIds has juz-1 → deselect surah-2 → juz-1 gone', () => {
    let surahIds = toggleSurah('surah-2', new Set());
    const juzViewIds = new Set<string>();

    // surah-2 covers hizb-1 AND hizb-2 → juz-1 auto-selected in derived set
    let ids = computeSelectedJuzIds(juzViewIds, surahIds);
    expect(ids.has('juz-1')).toBe(true);
    expect(ids.has('hizb-1')).toBe(true);
    expect(ids.has('hizb-2')).toBe(true);

    // Deselect surah-2
    surahIds = toggleSurah('surah-2', surahIds);
    ids = computeSelectedJuzIds(juzViewIds, surahIds);
    expect(ids.has('juz-1')).toBe(false);
    expect(ids.has('hizb-1')).toBe(false);
    expect(ids.has('hizb-2')).toBe(false);
  });
});

// ── Al-Imran full coverage scenario ───────────────────────────────────────

describe('Al-Imran (surah-3, pages 50-76) with juz-3 + juz-4 selected', () => {
  // Al-Imran's hizbs: hizb-5 (p42-50, juz-3), hizb-6 (p51-61, juz-3),
  //                   hizb-7 (p62-71, juz-4), hizb-8 (p72-81, juz-4)
  it('selecting juz-3 + juz-4 makes Al-Imran appear as selected (all hizbs covered)', () => {
    let juzViewIds = toggleJuz('juz-3', new Set());
    juzViewIds = toggleJuz('juz-4', juzViewIds);
    expect(getSurahState('surah-3', new Set(), juzViewIds)).toBe('selected');
  });

  it('selecting only juz-3 makes Al-Imran appear as partial (hizb-7, hizb-8 missing)', () => {
    const juzViewIds = toggleJuz('juz-3', new Set());
    expect(getSurahState('surah-3', new Set(), juzViewIds)).toBe('partial');
  });

  it('selecting only juz-4 makes Al-Imran appear as partial (hizb-5, hizb-6 missing)', () => {
    const juzViewIds = toggleJuz('juz-4', new Set());
    expect(getSurahState('surah-3', new Set(), juzViewIds)).toBe('partial');
  });

  it('Al-Baqara stays partial with juz-3+juz-4 (hizb-1, hizb-2 not covered)', () => {
    let juzViewIds = toggleJuz('juz-3', new Set());
    juzViewIds = toggleJuz('juz-4', juzViewIds);
    expect(getSurahState('surah-2', new Set(), juzViewIds)).toBe('partial');
  });

  it('selecting juz-2+juz-3+juz-4 makes Al-Baqara partial (still missing juz-1/hizb-1,2)', () => {
    let juzViewIds = toggleJuz('juz-2', new Set());
    juzViewIds = toggleJuz('juz-3', juzViewIds);
    juzViewIds = toggleJuz('juz-4', juzViewIds);
    // Al-Baqara spans hizb-1..hizb-5; juz-1's hizb-1,hizb-2 are missing
    expect(getSurahState('surah-2', new Set(), juzViewIds)).toBe('partial');
    // Al-Imran is fully covered
    expect(getSurahState('surah-3', new Set(), juzViewIds)).toBe('selected');
  });
});

// ── Al-Baqara full scenario (reported regression check) ───────────────────

describe('Al-Baqara (surah-2, pages 2-49) covers 5 hizbs across 2 full juzs', () => {
  it('selecting Al-Baqara activates hizb-1, hizb-2 (juz-1 members)', () => {
    const surahIds = toggleSurah('surah-2', new Set());
    const ids = computeSelectedJuzIds(new Set(), surahIds);
    expect(ids.has('hizb-1')).toBe(true); // pages 1-10
    expect(ids.has('hizb-2')).toBe(true); // pages 11-21 ← was reported as missing
    expect(ids.has('juz-1')).toBe(true);  // auto-added (both hizbs covered)
  });

  it('selecting Al-Baqara activates hizb-3, hizb-4 (juz-2 members)', () => {
    const surahIds = toggleSurah('surah-2', new Set());
    const ids = computeSelectedJuzIds(new Set(), surahIds);
    expect(ids.has('hizb-3')).toBe(true); // pages 22-31
    expect(ids.has('hizb-4')).toBe(true); // pages 32-41
    expect(ids.has('juz-2')).toBe(true);  // auto-added (both hizbs covered)
  });

  it('selecting Al-Baqara activates hizb-5 (partial juz-3) but NOT hizb-6 or juz-3', () => {
    const surahIds = toggleSurah('surah-2', new Set());
    const ids = computeSelectedJuzIds(new Set(), surahIds);
    expect(ids.has('hizb-5')).toBe(true);  // pages 42-50, overlaps Al-Baqara (ends p49)
    expect(ids.has('hizb-6')).toBe(false); // pages 51-61, outside Al-Baqara
    expect(ids.has('juz-3')).toBe(false);  // juz-3 not complete (hizb-6 missing)
  });

  it('count: 2 juzs + 5 hizbs in selectedJuzIds (5 ≠ 2×2, so label shows hizb count)', () => {
    // This is expected behavior: Al-Baqara covers 2 complete juzs + 1 orphan hizb (juz-3/hizb-5)
    // The "2 juz" label only shows when EVERY hizb in selectedJuzIds belongs to a complete juz pair
    const surahIds = toggleSurah('surah-2', new Set());
    const ids = computeSelectedJuzIds(new Set(), surahIds);
    const allIds = Array.from(ids);
    const juzCount  = allIds.filter(id => id.startsWith('juz-')).length;
    const hizbCount = allIds.filter(id => id.startsWith('hizb-')).length;
    expect(juzCount).toBe(2);   // juz-1, juz-2
    expect(hizbCount).toBe(5);  // hizb-1..hizb-5
    // 5 ≠ 2×2=4 → label correctly shows "5 hizb · X pages" (not "2 juz")
    expect(hizbCount).not.toBe(juzCount * 2);
  });

  it('deselecting Al-Baqara clears all 5 hizbs and 2 juzs', () => {
    let surahIds = toggleSurah('surah-2', new Set());
    surahIds = toggleSurah('surah-2', surahIds);
    const ids = computeSelectedJuzIds(new Set(), surahIds);
    expect(ids.size).toBe(0);
  });
});
