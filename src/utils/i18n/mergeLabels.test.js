import { describe, it, expect } from 'vitest';
import { mergeLabels } from './mergeLabels';

const DEFAULTS = {
  search: 'Rechercher',
  clear: 'Effacer la recherche',
  suggestions: 'Suggestions de recherche',
};

describe('mergeLabels', () => {
  it('returns the defaults untouched when no override is given', () => {
    expect(mergeLabels(DEFAULTS)).toEqual(DEFAULTS);
    expect(mergeLabels(DEFAULTS, null)).toEqual(DEFAULTS);
    expect(mergeLabels(DEFAULTS, undefined)).toEqual(DEFAULTS);
  });

  it('applies a full override', () => {
    const overrides = { search: 'Search', clear: 'Clear search', suggestions: 'Search suggestions' };

    expect(mergeLabels(DEFAULTS, overrides)).toEqual(overrides);
  });

  it('keeps the defaults for the keys a partial dictionary omits', () => {
    expect(mergeLabels(DEFAULTS, { search: 'Search' })).toEqual({
      search: 'Search',
      clear: 'Effacer la recherche',
      suggestions: 'Suggestions de recherche',
    });
  });

  it('never mutates its arguments', () => {
    const defaults = { ...DEFAULTS };
    const overrides = { search: 'Search' };

    mergeLabels(defaults, overrides);

    expect(defaults).toEqual(DEFAULTS);
    expect(overrides).toEqual({ search: 'Search' });
  });

  it('ignores keys the component does not declare', () => {
    expect(mergeLabels(DEFAULTS, { seach: 'typo', unrelated: 'x' })).toEqual(DEFAULTS);
  });

  it('passes non-string values through', () => {
    const defaults = { count: 3, nested: { one: 'a' } };
    const overrides = { count: 5, nested: { one: 'b' } };

    expect(mergeLabels(defaults, overrides)).toEqual(overrides);
  });

  // ---------------------------------------------------------------
  // L'invariant d'accessibilité du template : un dictionnaire partiel,
  // incomplet ou fautif ne peut JAMAIS produire un nom accessible vide.
  // ---------------------------------------------------------------
  describe('accessibility invariant: no override can blank a label', () => {
    const blankingOverrides = [
      ['undefined', undefined],
      ['null', null],
      ['an empty string', ''],
      ['a whitespace-only string', '   '],
      ['a non-breaking space', ' '],
    ];

    for (const [name, value] of blankingOverrides) {
      it(`discards ${name} and keeps the default`, () => {
        expect(mergeLabels(DEFAULTS, { clear: value }).clear).toBe('Effacer la recherche');
      });
    }

    it('leaves every label non-empty when the whole dictionary is blank', () => {
      const blank = { search: '', clear: null, suggestions: undefined };

      for (const label of Object.values(mergeLabels(DEFAULTS, blank))) {
        expect(label.trim()).not.toBe('');
      }
    });
  });
});
