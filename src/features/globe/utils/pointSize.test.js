import { describe, it, expect } from 'vitest';
import { resolvePointSize } from './pointSize';

const POINTS = [
  { id: 'a', value: 100 },
  { id: 'b', value: 25 },
  { id: 'c', value: '4' },
  { id: 'd', value: 0 },
  { id: 'e' },
];

describe('resolvePointSize', () => {
  it('keeps the variant default without pointSize', () => {
    const s = resolvePointSize(POINTS, null);
    expect(s.mode).toBe('default');
    expect(s.diameterFor(POINTS[0], 30)).toBeNull();
  });

  it('gives every point the same diameter for a number', () => {
    const s = resolvePointSize(POINTS, 12);
    expect(s.mode).toBe('fixed');
    expect(POINTS.map((p) => s.diameterFor(p, 30))).toEqual([12, 12, 12, 12, 12]);
  });

  it('ignores a non-positive number', () => {
    expect(resolvePointSize(POINTS, 0).mode).toBe('default');
    expect(resolvePointSize(POINTS, -3).mode).toBe('default');
  });

  it('makes the area proportional to the value of a key', () => {
    const s = resolvePointSize(POINTS, 'value');
    expect(s.mode).toBe('value');
    expect(s.max).toBe(100);
    expect(s.diameterFor(POINTS[0], 30)).toBeCloseTo(30, 9);
    // Valeur divisée par 4 -> aire divisée par 4 -> diamètre divisé par 2.
    expect(s.diameterFor(POINTS[1], 30)).toBeCloseTo(15, 9);
    // Chaîne numérique acceptée.
    expect(s.diameterFor(POINTS[2], 30)).toBeCloseTo(6, 9);
  });

  it('draws nothing for a null, zero or missing value', () => {
    const s = resolvePointSize(POINTS, 'value');
    expect(s.diameterFor(POINTS[3], 30)).toBe(0);
    expect(s.diameterFor(POINTS[4], 30)).toBe(0);
  });

  it('draws nothing when no value is positive', () => {
    const s = resolvePointSize([{ v: 0 }, { v: -2 }], 'v');
    expect(s.max).toBe(0);
    expect(s.diameterFor({ v: 0 }, 30)).toBe(0);
  });
});
