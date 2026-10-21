// Importation des modules
import { createElement } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { boundToNumber, stepFor, useRangeBounds } from './useRangeBounds';

// Cache SWR isolé par test : sans lui, les réponses d'un test fuiraient dans le suivant.
const wrapper = ({ children }) => createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const FRANCE = { children: [{ criterion: { variable: 'country', operation: 'EQ', value: 'France' } }] };

describe('boundToNumber', () => {
  it('converts numbers and decimal strings, drops missing and textual bounds', () => {
    expect(boundToNumber(4.5, 'NUMBER')).toBe(4.5);
    expect(boundToNumber('12', 'INTEGER')).toBe(12);
    expect(boundToNumber(null, 'NUMBER')).toBeUndefined();
    expect(boundToNumber('Agriculture', 'VARCHAR')).toBeUndefined();
  });

  it('reads a bare ISO date at local midnight, like a typed date', () => {
    expect(boundToNumber('2023-01-01', 'DATE')).toBe(new Date(2023, 0, 1).getTime());
    expect(boundToNumber('2023-01-01T10:00:00Z', 'TIMESTAMP')).toBe(Date.parse('2023-01-01T10:00:00Z'));
    expect(boundToNumber('nope', 'DATE')).toBeUndefined();
  });
});

describe('stepFor', () => {
  it('fixes the step of integers, dates and timestamps', () => {
    expect(stepFor({ typeFamily: 'INTEGER' })).toBe(1);
    expect(stepFor({ typeFamily: 'DATE' })).toBe(86_400_000);
    expect(stepFor({ typeFamily: 'TIMESTAMP' })).toBe(3_600_000);
  });

  it('takes the precision of displayFormat for a number', () => {
    expect(stepFor({ typeFamily: 'NUMBER', displayFormat: ',.1f', min: 0, max: 1000 })).toBe(0.1);
    expect(stepFor({ typeFamily: 'NUMBER', displayFormat: ',.2f', min: 0, max: 1000 })).toBe(0.01);
    expect(stepFor({ typeFamily: 'NUMBER', displayFormat: ',.0f', min: 0, max: 1 })).toBe(1);
  });

  it('falls back on (max - min) / 100 rounded down to a power of 10', () => {
    expect(stepFor({ typeFamily: 'NUMBER', min: 0, max: 25 })).toBe(0.1);
    expect(stepFor({ typeFamily: 'NUMBER', min: 0, max: 1000 })).toBe(10);
    expect(stepFor({ typeFamily: 'NUMBER', min: 5, max: 5 })).toBe(1);
    expect(stepFor({ typeFamily: 'NUMBER' })).toBe(1);
  });
});

describe('useRangeBounds', () => {
  it('reads min / max from getFieldStats and the step from displayFormat', async () => {
    const { result } = renderHook(() => useRangeBounds({ fieldName: 'gdp' }), { wrapper });

    await waitFor(() => expect(result.current.step).toBeDefined());
    expect(result.current).toMatchObject({ min: 98, max: 112.2, step: 0.1, error: null });
  });

  it('turns a date field into epoch ms with a one-day step', async () => {
    const { result } = renderHook(() => useRangeBounds({ fieldName: 'date_obs' }), { wrapper });

    await waitFor(() => expect(result.current.step).toBeDefined());
    expect(result.current.min).toBe(new Date(2023, 0, 1).getTime());
    expect(result.current.step).toBe(86_400_000);
  });

  it('narrows the bounds to the scope', async () => {
    const all = renderHook(() => useRangeBounds({ fieldName: 'gdp' }), { wrapper });
    const filtered = renderHook(() => useRangeBounds({ fieldName: 'gdp', scopeFilters: FRANCE }), { wrapper });

    await waitFor(() => expect(all.result.current.step).toBeDefined());
    await waitFor(() => expect(filtered.result.current.step).toBeDefined());

    expect(filtered.result.current.max).toBeLessThan(all.result.current.max);
    expect(filtered.result.current.min).toBeGreaterThanOrEqual(all.result.current.min);
  });

  it('fetches nothing when disabled', () => {
    const { result } = renderHook(() => useRangeBounds({ fieldName: 'gdp', enabled: false }), { wrapper });

    expect(result.current).toMatchObject({ min: undefined, max: undefined, step: undefined, loading: false });
  });
});
