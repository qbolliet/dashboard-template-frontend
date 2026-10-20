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

  it('formats type: "number" with the displayFormat and unit of the API metadata', () => {
    const col = { type: 'number', displayFormat: ',.2f', unit: '€' };
    expect(formatCell(1234.5, col, {}, 'fr-FR')).toBe('1 234,50 €');
    expect(formatCell(1234.5, col, {}, 'en-US')).toBe('1,234.50 €');
  });

  it('shows a ".1%" measure as a percentage', () => {
    const col = { type: 'number', displayFormat: '.1%' };
    expect(formatCell(0.256, col, {}, 'fr-FR')).toBe('25,6 %');
  });

  it('keeps the localized default when the column has no displayFormat', () => {
    // La `unit` seule ne change rien : sans spécificateur, le rendu historique s'applique.
    const col = { type: 'number', unit: '€' };
    expect(formatCell(1234.5, col, {})).toBe((1234.5).toLocaleString('fr-FR'));
  });

  it('lets an explicit col.format win over displayFormat', () => {
    const col = { type: 'number', displayFormat: '.1%', format: { decimals: 2 } };
    expect(formatCell(5, col, {})).toBe('5,00');
  });

  it('does not apply displayFormat to a column that is not numeric', () => {
    expect(formatCell('01012100', { displayFormat: ',.2f' }, {})).toBe('01012100');
  });

  it('renders « code — libellé » when the column has a label column', () => {
    const col = { key: 'nc8', labelKey: 'nc8_label' };
    expect(formatCell('01012100', col, { nc8_label: 'Chevaux' })).toBe('01012100 — Chevaux');
  });

  it('shows the code alone when its label is missing or empty', () => {
    const col = { key: 'nc8', labelKey: 'nc8_label' };
    expect(formatCell('01012100', col, { nc8_label: null })).toBe('01012100');
    expect(formatCell('01012100', col, { nc8_label: '' })).toBe('01012100');
    expect(formatCell('01012100', col, {})).toBe('01012100');
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
