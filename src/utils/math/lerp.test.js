import { describe, it, expect } from 'vitest';
import { lerp } from './lerp';

describe('lerp', () => {
  it('returns `a` at t=0 and `b` at t=1', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('interpolates at the midpoint', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('extrapolates outside [0, 1]', () => {
    expect(lerp(10, 20, 2)).toBe(30);
    expect(lerp(10, 20, -1)).toBe(0);
  });
});
