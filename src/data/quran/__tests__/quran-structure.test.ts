import { describe, it, expect } from 'vitest';
import {
  JUZS, HIZBS, RUBS, SURAHS,
  getHizbsForJuz, getRubsForHizb, getHizbsForSurah, getJuzsForSurah, getSurahHierarchyMode,
} from '../quran-structure';

describe('Quran data integrity', () => {
  it('has exactly 30 juzs', () => {
    expect(JUZS.length).toBe(30);
  });

  it('has exactly 60 hizbs', () => {
    expect(HIZBS.length).toBe(60);
  });

  it('has exactly 240 rubs', () => {
    expect(RUBS.length).toBe(240);
  });

  it('has exactly 114 surahs', () => {
    expect(SURAHS.length).toBe(114);
  });

  it('every juz has exactly 2 hizb children', () => {
    JUZS.forEach(juz => {
      expect(juz.childrenIds.length).toBe(2);
    });
  });

  it('every hizb has exactly 4 rub children', () => {
    HIZBS.forEach(hizb => {
      expect(hizb.childrenIds.length).toBe(4);
    });
  });

  it('all hizb IDs referenced in juz.childrenIds actually exist', () => {
    const hizbIdSet = new Set(HIZBS.map(h => h.id));
    JUZS.forEach(juz => {
      juz.childrenIds.forEach(hId => {
        expect(hizbIdSet.has(hId), `${hId} referenced by ${juz.id} not found`).toBe(true);
      });
    });
  });

  it('all rub IDs referenced in hizb.childrenIds actually exist', () => {
    const rubIdSet = new Set(RUBS.map(r => r.id));
    HIZBS.forEach(hizb => {
      hizb.childrenIds.forEach(rId => {
        expect(rubIdSet.has(rId), `${rId} referenced by ${hizb.id} not found`).toBe(true);
      });
    });
  });

  it('no duplicate juz IDs', () => {
    const ids = JUZS.map(j => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate hizb IDs', () => {
    const ids = HIZBS.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate rub IDs', () => {
    const ids = RUBS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all hizbs cover exactly 604 pages total (full Quran)', () => {
    const total = HIZBS.reduce((sum, h) => sum + (h.pageEnd - h.pageStart + 1), 0);
    expect(total).toBe(604);
  });

  it('juz pages approximately match hizb pages (within 1 page at juz boundaries)', () => {
    // Some juz boundaries share a page in the Madina mushaf, causing ±1 tolerance
    JUZS.forEach(juz => {
      const hizbs = getHizbsForJuz(juz.number);
      const hizbStart = Math.min(...hizbs.map(h => h.pageStart));
      const hizbEnd   = Math.max(...hizbs.map(h => h.pageEnd));
      expect(Math.abs(hizbStart - juz.pageStart)).toBeLessThanOrEqual(1);
      expect(Math.abs(hizbEnd   - juz.pageEnd  )).toBeLessThanOrEqual(1);
    });
  });

  it('each hizb belongs to the correct juz (juzNumber consistent with parent)', () => {
    JUZS.forEach(juz => {
      juz.childrenIds.forEach(hId => {
        const hizb = HIZBS.find(h => h.id === hId);
        expect(hizb?.juzNumber).toBe(juz.number);
      });
    });
  });
});

describe('getHizbsForJuz', () => {
  it('returns exactly 2 hizbs for any juz', () => {
    JUZS.forEach(juz => {
      expect(getHizbsForJuz(juz.number).length).toBe(2);
    });
  });

  it('returns hizbs with matching juzNumber', () => {
    const hizbs = getHizbsForJuz(1);
    expect(hizbs.map(h => h.id)).toEqual(['hizb-1', 'hizb-2']);
    expect(hizbs.every(h => h.juzNumber === 1)).toBe(true);
  });

  it('juz-1 hizbs are hizb-1 and hizb-2', () => {
    const hizbs = getHizbsForJuz(1);
    expect(hizbs[0].id).toBe('hizb-1');
    expect(hizbs[1].id).toBe('hizb-2');
  });
});

describe('getRubsForHizb', () => {
  it('returns exactly 4 rubs for any hizb', () => {
    HIZBS.forEach(hizb => {
      expect(getRubsForHizb(hizb.number).length).toBe(4);
    });
  });

  it('returns rubs with matching hizbNumber', () => {
    const rubs = getRubsForHizb(1);
    expect(rubs.map(r => r.id)).toEqual(['rub-1', 'rub-2', 'rub-3', 'rub-4']);
    expect(rubs.every(r => r.hizbNumber === 1)).toBe(true);
  });
});

describe('getHizbsForSurah', () => {
  it('Al-Fatiha (page 1) → only hizb-1', () => {
    const surah = SURAHS.find(s => s.id === 'surah-1')!;
    const hizbs = getHizbsForSurah(surah);
    expect(hizbs.map(h => h.id)).toContain('hizb-1');
    expect(hizbs.length).toBe(1);
  });

  it('Al-Baqara (pages 2-49) → spans multiple hizbs', () => {
    const surah = SURAHS.find(s => s.id === 'surah-2')!;
    const hizbs = getHizbsForSurah(surah);
    expect(hizbs.length).toBeGreaterThan(2);
  });

  it('all returned hizbs actually overlap the surah page range', () => {
    SURAHS.forEach(surah => {
      const hizbs = getHizbsForSurah(surah);
      hizbs.forEach(h => {
        expect(h.pageStart <= surah.pageEnd && h.pageEnd >= surah.pageStart).toBe(true);
      });
    });
  });
});

describe('getJuzsForSurah', () => {
  it('Al-Fatiha (1 page) → only juz-1', () => {
    const surah = SURAHS.find(s => s.id === 'surah-1')!;
    const juzs = getJuzsForSurah(surah);
    expect(juzs.map(j => j.id)).toEqual(['juz-1']);
  });

  it('Al-Baqara (pages 2-49) → spans multiple juzs', () => {
    const surah = SURAHS.find(s => s.id === 'surah-2')!;
    const juzs = getJuzsForSurah(surah);
    expect(juzs.length).toBeGreaterThan(1);
  });
});

describe('getSurahHierarchyMode', () => {
  it('Al-Fatiha → single (1 juz, 1 hizb)', () => {
    const surah = SURAHS.find(s => s.id === 'surah-1')!;
    expect(getSurahHierarchyMode(surah)).toBe('single');
  });

  it('Al-Baqara → multi-juz (spans multiple juzs)', () => {
    const surah = SURAHS.find(s => s.id === 'surah-2')!;
    expect(getSurahHierarchyMode(surah)).toBe('multi-juz');
  });
});
