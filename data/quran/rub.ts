import type { Rub } from '../../types/quran';

const RUB_NAMES = ['0/4', '1/4', '2/4', '3/4'];

export const RUBS: Rub[] = Array.from({ length: 240 }, (_, i) => {
  const rubNum = i + 1;
  const hizbNum = Math.ceil(rubNum / 4);
  const juzNum = Math.ceil(hizbNum / 2);
  const posInHizb = i % 4;
  const pageNum = Math.min(i + 1, 604);

  return {
    id: `rub-${rubNum}`,
    type: 'rub' as const,
    number: rubNum,
    name: `Rub' ${RUB_NAMES[posInHizb]}`,
    arabicName: `ربع ${RUB_NAMES[posInHizb]}`,
    transliteration: `Rub ${posInHizb + 1}/4`,
    reference: `Hizb ${hizbNum} · Juz ${juzNum}`,
    startSurah: 1,
    startAyah: 1,
    endSurah: 1,
    endAyah: 1,
    pageStart: pageNum,
    pageEnd: pageNum + 1,
    juzNumber: juzNum,
    hizbNumber: hizbNum,
    rubNumber: rubNum,
    childrenIds: [],
    parentId: `hizb-${hizbNum}`,
  };
});
