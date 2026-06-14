import { JUZS } from './juz';
import { HIZBS } from './hizb';
import { RUBS } from './rub';
import { SURAHS } from './surahs';
import type { QuranSection, SectionType } from '../../types/quran';

export function getSectionById(id: string): QuranSection | undefined {
  if (id.startsWith('juz-')) return JUZS.find(j => j.id === id);
  if (id.startsWith('hizb-')) return HIZBS.find(h => h.id === id);
  if (id.startsWith('rub-')) return RUBS.find(r => r.id === id);
  if (id.startsWith('surah-')) return SURAHS.find(s => s.id === id);
  return undefined;
}

export function getSectionsByType(type: SectionType): QuranSection[] {
  switch (type) {
    case 'juz': return JUZS;
    case 'hizb': return HIZBS;
    case 'rub': return RUBS;
    case 'sourate': return SURAHS;
    default: return [];
  }
}

export function getHizbsForJuz(juzNumber: number): typeof HIZBS {
  return HIZBS.filter(h => h.juzNumber === juzNumber);
}

export function getRubsForHizb(hizbNumber: number): typeof RUBS {
  return RUBS.filter(r => r.hizbNumber === hizbNumber);
}

export { JUZS, HIZBS, RUBS, SURAHS };
