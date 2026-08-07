import { describe, it, expect } from 'vitest';
import { clamp } from './clamp';

describe('clamp', () => {
  it('returns the value unchanged when inside the interval', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps below the lower bound', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps above the upper bound', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('is inclusive at both bounds', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('resolves an inconsistent interval (lo > hi) in favor of the upper bound', () => {
    // Documented degenerate case: callers should not produce lo > hi, but when they
    // do, hi wins — see the docstring for why this specific tie-break was picked.
    expect(clamp(5, 10, 0)).toBe(0);
  });
});
