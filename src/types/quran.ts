export type SectionType = 'juz' | 'hizb' | 'rub' | 'sourate' | 'page' | 'ayah';

export type ModeKey = 'lecture' | 'memorisation' | string;

export interface QuranSection {
  id: string;
  type: SectionType;
  number: number;
  name: string;
  arabicName: string;
  reference: string;
  startSurah: number;
  startAyah: number;
  endAyah: number;
  pageStart: number;
  pageEnd: number;
  juzNumber?: number;
  hizbNumber?: number;
  childrenIds: string[];
}

export interface Juz extends QuranSection {
  type: 'juz';
}

export interface Hizb extends QuranSection {
  type: 'hizb';
  juzNumber: number;
}

export interface Rub extends QuranSection {
  type: 'rub';
  hizbNumber: number;
  juzNumber: number;
  verseArabic?: string;
}

export interface Surah extends QuranSection {
  type: 'sourate';
  verseCount: number;
  revelationType: 'mecquoise' | 'medinoise';
  firstVerseArabic?: string;
}

export interface QuranPage {
  id: string;
  type: 'page';
  number: number;
  juzNumber: number;
  hizbNumber: number;
  surahStart: number;
  ayahStart: number;
}

export interface Ayah {
  id: string;
  type: 'ayah';
  number: number;
  surahNumber: number;
  text?: string;
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  rubNumber: number;
}

export interface QuranTextProvider {
  getAyahsForSection(sectionId: string, type: SectionType): Promise<Ayah[]>;
  getAyahText(surah: number, ayah: number): string | null;
  isLoaded: boolean;
}
