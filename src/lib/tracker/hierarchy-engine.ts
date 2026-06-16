import type { SectionType } from '../../types/quran';
import { JUZS, HIZBS, RUBS, SURAHS } from '../../data/quran/quran-structure';

export function getChildIds(parentType: SectionType, parentId: string): string[] {
  switch (parentType) {
    case 'juz': {
      const juz = JUZS.find(j => j.id === parentId);
      return juz?.childrenIds || [];
    }
    case 'hizb': {
      const hizb = HIZBS.find(h => h.id === parentId);
      return hizb?.childrenIds || [];
    }
    default:
      return [];
  }
}

export function getDescendantIds(type: SectionType, id: string): string[] {
  const direct = getChildIds(type, id);
  if (type === 'juz') {
    return direct.flatMap(hizbId => [hizbId, ...getChildIds('hizb', hizbId)]);
  }
  return direct;
}

export function propagateCompletion(
  validatedIds: Set<string>,
  type: SectionType,
  id: string
): Set<string> {
  const result = new Set(validatedIds);
  const descendants = getDescendantIds(type, id);
  descendants.forEach(d => result.add(d));
  result.add(id);
  return result;
}

export function propagateUndoCompletion(
  validatedIds: Set<string>,
  childId: string
): Set<string> {
  const result = new Set(validatedIds);
  result.delete(childId);

  const hizb = HIZBS.find(h => h.childrenIds.includes(childId));
  if (hizb) {
    result.delete(hizb.id);
    const juz = JUZS.find(j => j.childrenIds.includes(hizb.id));
    if (juz) result.delete(juz.id);
  }

  return result;
}

export function computeParentCompletion(
  validatedIds: Set<string>,
  type: SectionType,
  id: string
): 'none' | 'partial' | 'full' {
  const children = getChildIds(type, id);
  if (children.length === 0) return validatedIds.has(id) ? 'full' : 'none';
  const doneCount = children.filter(c => validatedIds.has(c)).length;
  if (doneCount === 0) return 'none';
  if (doneCount === children.length) return 'full';
  return 'partial';
}
