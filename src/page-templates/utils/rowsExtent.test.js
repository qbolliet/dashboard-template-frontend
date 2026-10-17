import { describe, it, expect } from 'vitest';
import { rowsExtent } from './rowsExtent';

describe('rowsExtent', () => {
  it('returns [min, max] for a measure, whatever the row order', () => {
    expect(rowsExtent([{ y: 3 }, { y: -1 }, { y: 8 }], 'y')).toEqual([-1, 8]);
  });

  it('returns [earliest, latest] for ISO dates, whatever the row order', () => {
    const rows = [{ x: '2021-01-01' }, { x: '2019-06-30' }, { x: '2020-12-31' }];
    expect(rowsExtent(rows, 'x')).toEqual(['2019-06-30', '2021-01-01']);
  });

  it('returns [first, last] for a categorical dimension', () => {
    expect(rowsExtent([{ c: 'FR' }, { c: 'DE' }, { c: 'ES' }], 'c')).toEqual(['FR', 'ES']);
  });

  it('ignores missing values and gives null when nothing is left', () => {
    expect(rowsExtent([{ y: null }, { y: 2 }, {}], 'y')).toEqual([2, 2]);
    expect(rowsExtent([], 'y')).toBeNull();
    expect(rowsExtent([{ y: null }], 'y')).toBeNull();
  });
});
