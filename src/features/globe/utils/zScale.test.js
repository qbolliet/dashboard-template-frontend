import { describe, it, expect } from 'vitest';
import { bubbleDiameter, resolveZ } from './zScale';

const POINTS = [
  { id: 'a', value: 100 },
  { id: 'b', value: 25 },
  { id: 'c', value: '4' },
  { id: 'd', value: 0 },
  { id: 'e' },
];

describe('resolveZ', () => {
  it('keeps the default size without z', () => {
    const z = resolveZ(POINTS, null);
    expect(z.key).toBeNull();
    expect(z.ratioFor(POINTS[0])).toBeNull();
    expect(resolveZ(POINTS, '').ratioFor(POINTS[0])).toBeNull();
  });

  it('divides each value by the largest positive one', () => {
    const z = resolveZ(POINTS, 'value');
    expect(z.max).toBe(100);
    expect(z.ratioFor(POINTS[0])).toBe(1);
    expect(z.ratioFor(POINTS[1])).toBeCloseTo(0.25, 9);
    // Chaîne numérique acceptée.
    expect(z.ratioFor(POINTS[2])).toBeCloseTo(0.04, 9);
  });

  it('gives 0 to a null, zero or missing value', () => {
    const z = resolveZ(POINTS, 'value');
    expect(z.ratioFor(POINTS[3])).toBe(0);
    expect(z.ratioFor(POINTS[4])).toBe(0);
  });

  it('gives 0 everywhere when no value is positive', () => {
    const z = resolveZ([{ v: 0 }, { v: -2 }], 'v');
    expect(z.max).toBe(0);
    expect(z.ratioFor({ v: 0 })).toBe(0);
  });

  it('tolerates null rows', () => {
    expect(resolveZ(null, 'v').max).toBe(0);
  });
});

describe('bubbleDiameter', () => {
  it('makes the area proportional to the ratio', () => {
    expect(bubbleDiameter(1, 30)).toBeCloseTo(30, 9);
    // Rapport divisé par 4 -> aire divisée par 4 -> diamètre divisé par 2.
    expect(bubbleDiameter(0.25, 30)).toBeCloseTo(15, 9);
  });

  it('draws nothing for a zero ratio and keeps the default without encoding', () => {
    expect(bubbleDiameter(0, 30)).toBe(0);
    expect(bubbleDiameter(null, 30)).toBeNull();
  });
});
