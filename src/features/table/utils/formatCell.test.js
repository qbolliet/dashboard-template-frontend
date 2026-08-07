import { describe, it, expect } from 'vitest';
import { isNumericCol, formatCell } from './formatCell';
import { EMPTY_PLACEHOLDER } from '@/utils/format/constants';

describe('isNumericCol', () => {
  it('is true for type: "number"', () => {
    expect(isNumericCol({ type: 'number' })).toBe(true);
  });

  it('is true for a FormatSpec with no style (defaults to numeric)', () => {
    expect(isNumericCol({ format: {} })).toBe(true);
  });

  it.each(['number', 'currency', 'percent'])('is true for FormatSpec style "%s"', (style) => {
    expect(isNumericCol({ format: { style } })).toBe(true);
  });

  it('is false when format is a function (not a FormatSpec object)', () => {
    expect(isNumericCol({ format: () => 'x' })).toBe(false);
  });

  it('is false for a plain text column', () => {
    expect(isNumericCol({ key: 'name' })).toBe(false);
  });
});

describe('formatCell', () => {
  it('renders EMPTY_PLACEHOLDER for null, undefined and empty-string values', () => {
    expect(formatCell(null, {}, {})).toBe(EMPTY_PLACEHOLDER);
    expect(formatCell(undefined, {}, {})).toBe(EMPTY_PLACEHOLDER);
    expect(formatCell('', {}, {})).toBe(EMPTY_PLACEHOLDER);
  });

  it('prioritizes col.render over the null/empty guard — the render function owns its own empty state', () => {
    const col = { render: (value, row) => `custom:${value}:${row.id}` };
    expect(formatCell('x', col, { id: 1 })).toBe('custom:x:1');
    expect(formatCell(null, col, { id: 1 })).toBe('custom:null:1');
  });

  it('uses col.format as a function, forwarding (value, row)', () => {
    const col = { format: (value, row) => `${value}-${row.id}` };
    expect(formatCell(5, col, { id: 42 })).toBe('5-42');
  });

  it('uses col.format as a FormatSpec object via formatNumber', () => {
    const col = { format: { decimals: 2 } };
    expect(formatCell(5, col, {})).toBe('5,00');
  });

  it('formats type: "number" as a localized fr-FR number', () => {
    const col = { type: 'number' };
    // Built from toLocaleString rather than a hardcoded literal: fr-FR's thousands
    // separator is U+202F (narrow no-break space), not a regular space.
    expect(formatCell(1234.5, col, {})).toBe((1234.5).toLocaleString('fr-FR'));
  });

  it('falls back to the raw string for a non-numeric value on a numeric column', () => {
    const col = { type: 'number' };
    expect(formatCell('abc', col, {})).toBe('abc');
  });

  it('stringifies any other value as-is', () => {
    expect(formatCell('hello', {}, {})).toBe('hello');
    expect(formatCell(42, {}, {})).toBe('42');
  });
});
