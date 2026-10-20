import { describe, it, expect } from 'vitest';
import { formatValue, valueFormatter } from './formatValue';

// Espaces typographiques de d3-format fr-FR : insécable pour les milliers, fine insécable
// avant le signe pourcent.
const NBSP = ' ';
const NNBSP = ' ';

describe('formatValue', () => {
  it('applies a d3 specifier and appends the unit, in French', () => {
    const field = { displayFormat: ',.2f', unit: '€' };
    expect(formatValue(1234.5, field, 'fr-FR')).toBe(`1${NBSP}234,50${NBSP}€`);
  });

  it('follows the Intl locale for the separators', () => {
    const field = { displayFormat: ',.2f', unit: '€' };
    expect(formatValue(1234.5, field, 'en-US')).toBe(`1,234.50${NBSP}€`);
  });

  it('writes a percentage with the locale sign when the specifier is a percent one', () => {
    expect(formatValue(0.256, { displayFormat: '.0%' }, 'fr-FR')).toBe(`26${NNBSP}%`);
    expect(formatValue(0.256, { displayFormat: '.0%' }, 'en-US')).toBe('26%');
    expect(formatValue(0.256, { displayFormat: '.1%' }, 'fr-FR')).toBe(`25,6${NNBSP}%`);
  });

  it('does not repeat a unit the specifier already wrote', () => {
    expect(formatValue(0.256, { displayFormat: '.1%', unit: '%' }, 'en-US')).toBe('25.6%');
    expect(formatValue(0.256, { displayFormat: '.1%', unit: '%' }, 'fr-FR')).toBe(`25,6${NNBSP}%`);
  });

  it('puts the locale spacing before a plain percent unit', () => {
    expect(formatValue(12.5, { displayFormat: ',.1f', unit: '%' }, 'fr-FR')).toBe(`12,5${NNBSP}%`);
    expect(formatValue(12.5, { displayFormat: ',.1f', unit: '%' }, 'en-US')).toBe('12.5%');
  });

  it('returns null without displayFormat so the caller keeps its current rendering', () => {
    expect(formatValue(1234.5, {}, 'fr-FR')).toBeNull();
    expect(formatValue(1234.5, { unit: '€' }, 'fr-FR')).toBeNull();
    expect(formatValue(1234.5, { displayFormat: null, unit: '€' }, 'fr-FR')).toBeNull();
    expect(formatValue(1234.5, null, 'fr-FR')).toBeNull();
    expect(formatValue(1234.5, undefined, 'fr-FR')).toBeNull();
  });

  it('returns null for a specifier d3 rejects', () => {
    expect(formatValue(1, { displayFormat: 'not-a-format' }, 'fr-FR')).toBeNull();
  });

  it('accepts numeric strings and leaves other text as received', () => {
    const field = { displayFormat: ',.1f' };
    expect(formatValue('12.34', field, 'en-US')).toBe('12.3');
    expect(formatValue('abc', field, 'en-US')).toBe('abc');
  });
});

describe('valueFormatter', () => {
  it('is null without displayFormat and reusable otherwise', () => {
    expect(valueFormatter({ unit: '€' })).toBeNull();
    const fmt = valueFormatter({ displayFormat: '.1f' }, 'en-US');
    expect([fmt(1), fmt(2.25)]).toEqual(['1.0', '2.3']);
  });

  it('returns the same formatter for the same inputs', () => {
    const field = { displayFormat: ',.0f', unit: 'kg' };
    expect(valueFormatter(field, 'fr-FR')).toBe(valueFormatter({ ...field }, 'fr-FR'));
  });
});
