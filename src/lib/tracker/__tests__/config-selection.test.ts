import { describe, it, expect } from 'vitest';
import { JUZS, HIZBS, SURAHS, getHizbsForSurah } from '@/data/quran/quran-structure';

// Pure re-implementations of the toggle logic from app/config/page.tsx

function toggleJuz(juzId: string, current: Set<string>): Set<string> {
  const juz = JUZS.find(j => j.id === juzId);
  if (!juz) return current;
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

function toggleHizb(hizbId: string, juzId: string, current: Set<string>): Set<string> {
  const juz = JUZS.find(j => j.id === juzId);
  if (!juz) return current;
  const next = new Set(current);
  if (next.has(hizbId)) {
    next.delete(hizbId);
    next.delete(juzId);
  } else {
    next.add(hizbId);
    const allHizbsSelected = juz.childrenIds.every(hId => hId === hizbId || next.has(hId));
    if (allHizbsSelected) next.add(juzId);
  }
  return next;
}

function toggleSurah(
  surahId: string,
  currentSurahIds: Set<string>,
  currentJuzIds: Set<string>,
): { surahIds: Set<string>; juzIds: Set<string> } {
  const surah = SURAHS.find(s => s.id === surahId);
  if (!surah) return { surahIds: currentSurahIds, juzIds: currentJuzIds };
  const hizbs = getHizbsForSurah(surah);
  const isSelected = currentSurahIds.has(surahId);
  const nextSurahIds = new Set(currentSurahIds);
  const nextHizbIds  = new Set(currentJuzIds);

  if (isSelected) {
    nextSurahIds.delete(surahId);
    hizbs.forEach(h => {
      const stillNeeded = SURAHS.some(s =>
        s.id !== surahId && nextSurahIds.has(s.id) && getHizbsForSurah(s).some(sh => sh.id === h.id)
      );
      if (!stillNeeded) {
        nextHizbIds.delete(h.id);
        nextHizbIds.delete(`juz-${h.juzNumber}`);
      }
    });
  } else {
    nextSurahIds.add(surahId);
    hizbs.forEach(h => {
      nextHizbIds.add(h.id);
      const juz = JUZS.find(j => j.number === h.juzNumber);
      if (juz && juz.childrenIds.every(hId => nextHizbIds.has(hId))) {
        nextHizbIds.add(juz.id);
      }
    });
  }
  return { surahIds: nextSurahIds, juzIds: nextHizbIds };
}

// ── toggleJuz ──────────────────────────────────────────────────────────────

describe('toggleJuz', () => {
  it('selecting a juz adds the juz + both its hizbs', () => {
    const result = toggleJuz('juz-1', new Set());
    expect(result.has('juz-1')).toBe(true);
    expect(result.has('hizb-1')).toBe(true);
    expect(result.has('hizb-2')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('deselecting a juz removes the juz + both its hizbs', () => {
    const initial = new Set(['juz-1', 'hizb-1', 'hizb-2']);
    const result = toggleJuz('juz-1', initial);
    expect(result.has('juz-1')).toBe(false);
    expect(result.has('hizb-1')).toBe(false);
    expect(result.has('hizb-2')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('selecting two independent juzs accumulates both', () => {
    const after1 = toggleJuz('juz-1', new Set());
    const after2 = toggleJuz('juz-2', after1);
    expect(after2.has('juz-1')).toBe(true);
    expect(after2.has('juz-2')).toBe(true);
    expect(after2.has('hizb-1')).toBe(true);
    expect(after2.has('hizb-2')).toBe(true);
    expect(after2.has('hizb-3')).toBe(true);
    expect(after2.has('hizb-4')).toBe(true);
    expect(after2.size).toBe(6);
  });

  it('deselecting one juz does not affect the other', () => {
    const both = toggleJuz('juz-2', toggleJuz('juz-1', new Set()));
    const result = toggleJuz('juz-1', both);
    expect(result.has('juz-1')).toBe(false);
    expect(result.has('hizb-1')).toBe(false);
    expect(result.has('juz-2')).toBe(true);
    expect(result.has('hizb-3')).toBe(true);
    expect(result.has('hizb-4')).toBe(true);
  });

  it('works correctly for all 30 juzs', () => {
    JUZS.forEach(juz => {
      const result = toggleJuz(juz.id, new Set());
      expect(result.size).toBe(3); // juz + 2 hizbs
      expect(result.has(juz.id)).toBe(true);
      juz.childrenIds.forEach(hId => expect(result.has(hId)).toBe(true));
    });
  });
});

// ── toggleHizb ─────────────────────────────────────────────────────────────

describe('toggleHizb', () => {
  it('selecting a single hizb does NOT auto-select the parent juz', () => {
    const result = toggleHizb('hizb-1', 'juz-1', new Set());
    expect(result.has('hizb-1')).toBe(true);
    expect(result.has('juz-1')).toBe(false);
    expect(result.has('hizb-2')).toBe(false);
  });

  it('selecting the second hizb auto-selects the parent juz', () => {
    const after1 = toggleHizb('hizb-1', 'juz-1', new Set());
    const after2 = toggleHizb('hizb-2', 'juz-1', after1);
    expect(after2.has('hizb-1')).toBe(true);
    expect(after2.has('hizb-2')).toBe(true);
    expect(after2.has('juz-1')).toBe(true);
  });

  it('deselecting a hizb also removes the parent juz', () => {
    const full = new Set(['juz-1', 'hizb-1', 'hizb-2']);
    const result = toggleHizb('hizb-1', 'juz-1', full);
    expect(result.has('hizb-1')).toBe(false);
    expect(result.has('juz-1')).toBe(false);
    expect(result.has('hizb-2')).toBe(true);
  });

  it('re-selecting deselected hizb does not prematurely add juz', () => {
    // Start with only hizb-2, add hizb-1: now both selected → juz-1 should appear
    const withHizb2 = new Set(['hizb-2']);
    const result = toggleHizb('hizb-1', 'juz-1', withHizb2);
    expect(result.has('hizb-1')).toBe(true);
    expect(result.has('hizb-2')).toBe(true);
    expect(result.has('juz-1')).toBe(true);
  });
});

// ── toggleSurah ────────────────────────────────────────────────────────────

describe('toggleSurah', () => {
  it('selecting Al-Fatiha (page 1) adds hizb-1', () => {
    const { juzIds, surahIds } = toggleSurah('surah-1', new Set(), new Set());
    expect(juzIds.has('hizb-1')).toBe(true);
    expect(surahIds.has('surah-1')).toBe(true);
    // juz-1 should NOT be added (only hizb-1 covered, hizb-2 not included)
    expect(juzIds.has('juz-1')).toBe(false);
  });

  it('deselecting Al-Fatiha removes hizb-1', () => {
    const selected = toggleSurah('surah-1', new Set(), new Set());
    const deselected = toggleSurah('surah-1', selected.surahIds, selected.juzIds);
    expect(deselected.juzIds.has('hizb-1')).toBe(false);
    expect(deselected.surahIds.has('surah-1')).toBe(false);
  });

  it('select then deselect returns to empty state', () => {
    const { surahIds, juzIds } = toggleSurah('surah-1', new Set(), new Set());
    const back = toggleSurah('surah-1', surahIds, juzIds);
    expect(back.surahIds.size).toBe(0);
    expect(back.juzIds.size).toBe(0);
  });

  it('shared hizb is NOT removed when one surah deselected but another needs it', () => {
    // surah-1 (page 1) and surah-2 (pages 2-49) both overlap hizb-1 (pages 1-10)
    const s1 = toggleSurah('surah-1', new Set(), new Set());
    const s2 = toggleSurah('surah-2', s1.surahIds, s1.juzIds);
    // Deselect surah-1 — hizb-1 still needed by surah-2
    const deselected = toggleSurah('surah-1', s2.surahIds, s2.juzIds);
    expect(deselected.juzIds.has('hizb-1')).toBe(true);
    expect(deselected.surahIds.has('surah-1')).toBe(false);
    expect(deselected.surahIds.has('surah-2')).toBe(true);
  });

  it('all returned hizbs are real HIZB IDs', () => {
    const { juzIds } = toggleSurah('surah-2', new Set(), new Set());
    const hizbIdSet = new Set(HIZBS.map(h => h.id));
    Array.from(juzIds).filter(id => id.startsWith('hizb-')).forEach(hId => {
      expect(hizbIdSet.has(hId)).toBe(true);
    });
  });
});
