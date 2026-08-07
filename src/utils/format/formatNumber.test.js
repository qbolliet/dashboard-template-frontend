import { describe, it, expect } from 'vitest';
import { formatNumber } from './formatNumber';

describe('formatNumber', () => {
  it('formats a plain number with the default fr-FR locale', () => {
    expect(formatNumber(1234.5, {})).toBe(new Intl.NumberFormat('fr-FR', {}).format(1234.5));
  });

  it('tolerantly parses French-formatted textual input (space thousands, comma decimal)', () => {
    expect(formatNumber('1 234,5', {})).toBe(new Intl.NumberFormat('fr-FR', {}).format(1234.5));
  });

  it('returns the raw value stringified when parsing fails', () => {
    expect(formatNumber('not-a-number', {})).toBe('not-a-number');
    expect(formatNumber(undefined, {})).toBe('undefined');
  });

  it('applies `decimals` to both the min and max fraction digits', () => {
    expect(formatNumber(5, { decimals: 2 })).toBe('5,00');
  });

  describe('minDecimals/maxDecimals guard against RangeError (min > max)', () => {
    it('drops the inherited minimum when only maxDecimals is explicit', () => {
      // decimals:3 → min=max=3, then maxDecimals:1 overrides max only → min(3) > max(1).
      // maxDecimals is the explicit bound, so it wins: min drops to 1.
      expect(formatNumber(5, { decimals: 3, maxDecimals: 1 })).toBe('5,0');
    });

    it('raises the inherited maximum when only minDecimals is explicit', () => {
      // decimals:1 → min=max=1, then minDecimals:3 overrides min only → min(3) > max(1).
      // minDecimals is the explicit bound, so it wins: max rises to 3.
      expect(formatNumber(5, { decimals: 1, minDecimals: 3 })).toBe('5,000');
    });

    it('favors the upper bound when both minDecimals and maxDecimals are explicit', () => {
      expect(formatNumber(5, { minDecimals: 3, maxDecimals: 1 })).toBe('5,0');
    });
  });

  it('uses compact notation', () => {
    expect(formatNumber(1200000, { compact: true }))
      .toBe(new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(1200000));
  });

  it('formats style: "currency" (default EUR), ignoring prefix/suffix', () => {
    expect(formatNumber(5, { style: 'currency', prefix: '~', suffix: '!!' }))
      .toBe(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(5));
  });

  it('formats style: "currency" with a custom currency code', () => {
    expect(formatNumber(5, { style: 'currency', currency: 'USD' }))
      .toBe(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(5));
  });

  it('formats style: "percent" as the raw number (no ×100) with a " %" suffix', () => {
    expect(formatNumber(50, { style: 'percent' }))
      .toBe(`${new Intl.NumberFormat('fr-FR', {}).format(50)} %`);
  });

  it('lets an explicit suffix override the implicit " %" on style: "percent"', () => {
    expect(formatNumber(50, { style: 'percent', suffix: ' pts' }))
      .toBe(`${new Intl.NumberFormat('fr-FR', {}).format(50)} pts`);
  });

  it('applies prefix and suffix around the formatted number', () => {
    expect(formatNumber(5, { prefix: '~', suffix: 'kg' })).toBe('~5kg');
  });

  it('appends `unit` only when no suffix is already set', () => {
    expect(formatNumber(5, { unit: 'kg' })).toBe('5 kg');
    expect(formatNumber(5, { suffix: '!', unit: 'kg' })).toBe('5!');
  });

  it('respects a custom locale', () => {
    expect(formatNumber(1234.5, { locale: 'en-US' })).toBe('1,234.5');
  });
});
