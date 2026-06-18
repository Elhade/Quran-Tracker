import { describe, it, expect } from 'vitest';

// Mirrors prochLabel computation from app/detail/[type]/[id]/page.tsx
function computeProchLabel(prochDays: number | null): string {
  if (prochDays === null)   return 'Non planifiée';
  if (prochDays === 0)      return "Aujourd'hui";
  if (prochDays === -1)     return 'Hier';
  if (prochDays < 0)        return `il y a ${Math.abs(prochDays)} jours`;
  if (prochDays === 1)      return 'Demain';
  return `dans ${prochDays} jour${prochDays > 1 ? 's' : ''}`;
}

describe('prochLabel (detail page — next revision label)', () => {
  it('null → Non planifiée', () => {
    expect(computeProchLabel(null)).toBe('Non planifiée');
  });

  it('0 → Aujourd\'hui', () => {
    expect(computeProchLabel(0)).toBe("Aujourd'hui");
  });

  it('-1 → Hier', () => {
    expect(computeProchLabel(-1)).toBe('Hier');
  });

  it('-2 → il y a 2 jours', () => {
    expect(computeProchLabel(-2)).toBe('il y a 2 jours');
  });

  it('-5 → il y a 5 jours', () => {
    expect(computeProchLabel(-5)).toBe('il y a 5 jours');
  });

  it('1 → Demain', () => {
    expect(computeProchLabel(1)).toBe('Demain');
  });

  it('2 → dans 2 jours (plural)', () => {
    expect(computeProchLabel(2)).toBe('dans 2 jours');
  });

  it('7 → dans 7 jours', () => {
    expect(computeProchLabel(7)).toBe('dans 7 jours');
  });
});
