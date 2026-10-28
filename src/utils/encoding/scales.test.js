import { describe, it, expect } from 'vitest';
import { PALETTE, LINE_STYLES, colorScale, styleScale, distinctVals } from './scales';

describe('distinctVals', () => {
  it('lists distinct values in encounter order, skipping null/undefined', () => {
    const rows = [{ m: 'b' }, { m: 'a' }, { m: null }, { m: 'b' }, {}, { m: 'c' }];
    expect(distinctVals(rows, 'm')).toEqual(['b', 'a', 'c']);
  });

  it('dedupes on the string form (2 and "2" are the same category)', () => {
    expect(distinctVals([{ k: 2 }, { k: '2' }, { k: 3 }], 'k')).toEqual([2, 3]);
  });

  it('returns the shared placeholder when the column is null', () => {
    expect(distinctVals([{ k: 1 }], null)).toEqual(['__all__']);
  });
});

describe('colorScale', () => {
  it('maps the domain onto the palette in order', () => {
    const s = colorScale(['x', 'y']);
    expect(s('x')).toBe(PALETTE[0]);
    expect(s('y')).toBe(PALETTE[1]);
  });

  it('recycles the palette beyond its length', () => {
    const domain = Array.from({ length: PALETTE.length + 1 }, (_, i) => `v${i}`);
    expect(colorScale(domain)(`v${PALETTE.length}`)).toBe(PALETTE[0]);
  });
});

describe('styleScale', () => {
  it('maps the domain onto LINE_STYLES, the first value being a solid stroke', () => {
    const s = styleScale(['a', 'b', 'c']);
    expect(s('a')).toBeNull();
    expect(s('b')).toBe(LINE_STYLES[1]);
    expect(s('c')).toBe(LINE_STYLES[2]);
  });
});
