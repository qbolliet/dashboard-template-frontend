import { describe, it, expect } from 'vitest';
import { formatStatValue } from './formatStatValue';
import { EMPTY_PLACEHOLDER } from '@/utils/format/constants';

describe('formatStatValue', () => {
  it('shows a placeholder for an empty value', () => {
    expect(formatStatValue(null, { displayFormat: '.1%' })).toBe(EMPTY_PLACEHOLDER);
  });

  it('formats with the displayFormat and unit of the API metadata', () => {
    const spec = { displayFormat: ',.2f', unit: '€', locale: 'fr-FR' };
    expect(formatStatValue(1234.5, spec)).toBe('1 234,50 €');
    expect(formatStatValue(0.256, { displayFormat: '.1%', locale: 'en-US' })).toBe('25.6%');
  });

  it('keeps the Intl rendering of a spec without displayFormat', () => {
    expect(formatStatValue(5, { decimals: 2, locale: 'fr-FR' })).toBe('5,00');
  });
});
