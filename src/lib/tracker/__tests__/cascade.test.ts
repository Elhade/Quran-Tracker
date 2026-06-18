import { describe, it, expect } from 'vitest';
import { JUZS, HIZBS, RUBS } from '@/data/quran/quran-structure';
import type { SectionType } from '@/types/quran';

// Re-implementation of getMarkCascadeIds / getUndoCascadeIds from useTrackerStore.ts
// These are private helpers in the store, so we test the logic inline here.

const MODE = 'lecture';

function getMarkCascadeIds(
  sectionId: string,
  sectionType: SectionType,
  trackedIds: Set<string>,
  doneKeys: Set<string>,
): { id: string; type: SectionType }[] {
  const toMark: { id: string; type: SectionType }[] = [];
  const willBeDone = new Set(doneKeys);

  const add = (id: string, type: SectionType) => {
    const key = `${MODE}:${id}`;
    if (trackedIds.has(id) && !willBeDone.has(key)) {
      toMark.push({ id, type });
      willBeDone.add(key);
    }
  };

  add(sectionId, sectionType);

  if (sectionType === 'juz') {
    const juz = JUZS.find(j => j.id === sectionId);
    if (juz) {
      for (const hizbId of juz.childrenIds) {
        add(hizbId, 'hizb');
        const hizb = HIZBS.find(h => h.id === hizbId);
        if (hizb) hizb.childrenIds.forEach(rubId => add(rubId, 'rub'));
      }
    }
  } else if (sectionType === 'hizb') {
    const hizb = HIZBS.find(h => h.id === sectionId);
    if (hizb) hizb.childrenIds.forEach(rubId => add(rubId, 'rub'));
  }

  if (sectionType === 'rub') {
    const rub = RUBS.find(r => r.id === sectionId);
    if (rub) {
      const hizbId = `hizb-${rub.hizbNumber}`;
      const hizb = HIZBS.find(h => h.id === hizbId);
      if (hizb && hizb.childrenIds.every(rid => willBeDone.has(`${MODE}:${rid}`))) {
        add(hizbId, 'hizb');
        const juzId = `juz-${hizb.juzNumber}`;
        const juz = JUZS.find(j => j.id === juzId);
        if (juz && juz.childrenIds.every(hid => willBeDone.has(`${MODE}:${hid}`))) {
          add(juzId, 'juz');
        }
      }
    }
  }

  if (sectionType === 'hizb') {
    const hizb = HIZBS.find(h => h.id === sectionId);
    if (hizb) {
      const juzId = `juz-${hizb.juzNumber}`;
      const juz = JUZS.find(j => j.id === juzId);
      if (juz && juz.childrenIds.every(hid => willBeDone.has(`${MODE}:${hid}`))) {
        add(juzId, 'juz');
      }
    }
  }

  return toMark;
}

function getUndoCascadeIds(sectionId: string, doneKeys: Set<string>): string[] {
  const toRemove: string[] = [];
  const willBeUndone = new Set(doneKeys);

  const remove = (id: string) => {
    const key = `${MODE}:${id}`;
    if (willBeUndone.has(key)) { toRemove.push(id); willBeUndone.delete(key); }
  };

  const type: SectionType = sectionId.startsWith('juz-') ? 'juz'
    : sectionId.startsWith('hizb-') ? 'hizb'
    : sectionId.startsWith('rub-')  ? 'rub'
    : 'sourate';

  remove(sectionId);

  if (type === 'rub') {
    const rub = RUBS.find(r => r.id === sectionId);
    if (rub) {
      remove(`hizb-${rub.hizbNumber}`);
      const hizb = HIZBS.find(h => h.number === rub.hizbNumber);
      if (hizb) remove(`juz-${hizb.juzNumber}`);
    }
  } else if (type === 'hizb') {
    const hizb = HIZBS.find(h => h.id === sectionId);
    if (hizb) {
      hizb.childrenIds.forEach(rubId => remove(rubId));
      remove(`juz-${hizb.juzNumber}`);
    }
  } else if (type === 'juz') {
    const juz = JUZS.find(j => j.id === sectionId);
    if (juz) {
      for (const hizbId of juz.childrenIds) {
        remove(hizbId);
        const hizb = HIZBS.find(h => h.id === hizbId);
        if (hizb) hizb.childrenIds.forEach(rubId => remove(rubId));
      }
    }
  }

  return toRemove;
}

// ── Juz 1 tracked IDs for tests ───────────────────────────────────────────
// juz-1 → hizb-1 + hizb-2 → rub-1..rub-8 (11 IDs total)
const JUZ1_ALL = new Set(['juz-1', 'hizb-1', 'hizb-2', 'rub-1', 'rub-2', 'rub-3', 'rub-4', 'rub-5', 'rub-6', 'rub-7', 'rub-8']);
const JUZ1_HIZB1 = new Set(['hizb-1', 'rub-1', 'rub-2', 'rub-3', 'rub-4']);

const doneFor = (...ids: string[]): Set<string> => new Set(ids.map(id => `${MODE}:${id}`));

// ── Mark cascade ───────────────────────────────────────────────────────────

describe('getMarkCascadeIds — downward (parent → children)', () => {
  it('marking juz-1 marks the juz + 2 hizbs + 8 rubs (11 total)', () => {
    const result = getMarkCascadeIds('juz-1', 'juz', JUZ1_ALL, new Set());
    const ids = result.map(r => r.id);
    expect(ids).toContain('juz-1');
    expect(ids).toContain('hizb-1');
    expect(ids).toContain('hizb-2');
    for (let i = 1; i <= 8; i++) expect(ids).toContain(`rub-${i}`);
    expect(ids.length).toBe(11);
  });

  it('marking hizb-1 marks hizb-1 + its 4 rubs (5 total, no juz)', () => {
    const result = getMarkCascadeIds('hizb-1', 'hizb', JUZ1_HIZB1, new Set());
    const ids = result.map(r => r.id);
    expect(ids).toContain('hizb-1');
    for (let i = 1; i <= 4; i++) expect(ids).toContain(`rub-${i}`);
    expect(ids).not.toContain('juz-1');
    expect(ids.length).toBe(5);
  });

  it('marking hizb-1 when hizb-2 already done → also marks juz-1', () => {
    // hizb-2 is already done
    const done = doneFor('hizb-2', 'rub-5', 'rub-6', 'rub-7', 'rub-8');
    const result = getMarkCascadeIds('hizb-1', 'hizb', JUZ1_ALL, done);
    const ids = result.map(r => r.id);
    expect(ids).toContain('juz-1');
  });

  it('marking hizb-1 when hizb-2 NOT done → does NOT mark juz-1', () => {
    const result = getMarkCascadeIds('hizb-1', 'hizb', JUZ1_ALL, new Set());
    const ids = result.map(r => r.id);
    expect(ids).not.toContain('juz-1');
  });

  it('does not mark already-done sections', () => {
    const alreadyDone = doneFor('hizb-1', 'rub-1');
    const result = getMarkCascadeIds('juz-1', 'juz', JUZ1_ALL, alreadyDone);
    const ids = result.map(r => r.id);
    expect(ids).not.toContain('hizb-1');
    expect(ids).not.toContain('rub-1');
  });

  it('does not mark untracked sections', () => {
    // Only track the juz, no hizbs/rubs
    const tracked = new Set(['juz-1']);
    const result = getMarkCascadeIds('juz-1', 'juz', tracked, new Set());
    expect(result.map(r => r.id)).toEqual(['juz-1']);
  });
});

describe('getMarkCascadeIds — upward auto-propagation (rub → hizb → juz)', () => {
  it('marking final rub of hizb-1 auto-marks hizb-1', () => {
    // rub-1, rub-2, rub-3 already done; marking rub-4 should trigger hizb-1
    const done = doneFor('rub-1', 'rub-2', 'rub-3');
    const result = getMarkCascadeIds('rub-4', 'rub', JUZ1_HIZB1, done);
    const ids = result.map(r => r.id);
    expect(ids).toContain('rub-4');
    expect(ids).toContain('hizb-1');
  });

  it('marking final rub of hizb-1 does NOT mark juz-1 (hizb-2 not tracked)', () => {
    const done = doneFor('rub-1', 'rub-2', 'rub-3');
    const result = getMarkCascadeIds('rub-4', 'rub', JUZ1_HIZB1, done);
    expect(result.map(r => r.id)).not.toContain('juz-1');
  });

  it('marking final rub of hizb-1 marks juz-1 when hizb-2 already done', () => {
    const done = doneFor('rub-1', 'rub-2', 'rub-3', 'hizb-2', 'rub-5', 'rub-6', 'rub-7', 'rub-8');
    const result = getMarkCascadeIds('rub-4', 'rub', JUZ1_ALL, done);
    const ids = result.map(r => r.id);
    expect(ids).toContain('hizb-1');
    expect(ids).toContain('juz-1');
  });

  it('marking a non-final rub does NOT auto-mark the parent hizb', () => {
    const result = getMarkCascadeIds('rub-1', 'rub', JUZ1_HIZB1, new Set());
    expect(result.map(r => r.id)).not.toContain('hizb-1');
  });
});

// ── Undo cascade ───────────────────────────────────────────────────────────

describe('getUndoCascadeIds', () => {
  it('undo rub-1 removes rub-1 + parent hizb-1 + parent juz-1', () => {
    const done = doneFor('rub-1', 'hizb-1', 'juz-1');
    const result = getUndoCascadeIds('rub-1', done);
    expect(result).toContain('rub-1');
    expect(result).toContain('hizb-1');
    expect(result).toContain('juz-1');
  });

  it('undo rub-1 does NOT remove sibling rubs', () => {
    const done = doneFor('rub-1', 'rub-2', 'rub-3', 'rub-4', 'hizb-1');
    const result = getUndoCascadeIds('rub-1', done);
    expect(result).not.toContain('rub-2');
    expect(result).not.toContain('rub-3');
    expect(result).not.toContain('rub-4');
  });

  it('undo hizb-1 removes hizb-1 + its 4 rubs + parent juz-1', () => {
    const done = doneFor('hizb-1', 'rub-1', 'rub-2', 'rub-3', 'rub-4', 'juz-1');
    const result = getUndoCascadeIds('hizb-1', done);
    expect(result).toContain('hizb-1');
    for (let i = 1; i <= 4; i++) expect(result).toContain(`rub-${i}`);
    expect(result).toContain('juz-1');
  });

  it('undo hizb-1 does NOT remove sibling hizb-2', () => {
    const done = doneFor('hizb-1', 'hizb-2', 'juz-1');
    const result = getUndoCascadeIds('hizb-1', done);
    expect(result).not.toContain('hizb-2');
  });

  it('undo juz-1 removes juz-1 + both hizbs + all 8 rubs (11 total)', () => {
    const done = doneFor('juz-1', 'hizb-1', 'hizb-2', ...Array.from({ length: 8 }, (_, i) => `rub-${i + 1}`));
    const result = getUndoCascadeIds('juz-1', done);
    expect(result).toContain('juz-1');
    expect(result).toContain('hizb-1');
    expect(result).toContain('hizb-2');
    for (let i = 1; i <= 8; i++) expect(result).toContain(`rub-${i}`);
    expect(result.length).toBe(11);
  });

  it('undo only removes IDs that are in doneKeys (no phantom removals)', () => {
    // juz-1 is NOT in doneKeys — undo rub-1 should not add it
    const done = doneFor('rub-1', 'hizb-1');
    const result = getUndoCascadeIds('rub-1', done);
    expect(result).not.toContain('juz-1');
  });
});
