import { describe, it, expect } from 'vitest';
import { getDictionary, deepMerge } from './getDictionary';
import fr from './dictionaries/fr';
import en from './dictionaries/en';

/**
 * Collects every leaf path of a dictionary, so two languages can be compared as sets.
 *
 * @param {Object} value - Dictionary or sub-tree.
 * @param {string} [prefix=''] - Accumulated dotted path.
 * @returns {string[]} Dotted paths of every leaf.
 */
const leafPaths = (value, prefix = '') =>
  Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child !== null && typeof child === 'object' ? leafPaths(child, path) : [path];
  });

describe('dictionaries', () => {
  it('ship the exact same key set in every language', () => {
    expect(leafPaths(en).sort()).toEqual(leafPaths(fr).sort());
  });

  it('hold no blank label', () => {
    for (const dictionary of [fr, en]) {
      for (const path of leafPaths(dictionary)) {
        const value = path.split('.').reduce((node, key) => node[key], dictionary);
        expect(String(value).trim(), path).not.toBe('');
      }
    }
  });
});

describe('deepMerge', () => {
  const reference = {
    header: { skip: 'Passer', logo: 'Logo du site' },
    table: { rowCount: { one: '{count} ligne', other: '{count} lignes' } },
  };

  it('takes the translation where it is present', () => {
    const merged = deepMerge(reference, { header: { skip: 'Skip' } });

    expect(merged.header.skip).toBe('Skip');
  });

  it('falls back to the reference for a missing key', () => {
    const merged = deepMerge(reference, { header: { skip: 'Skip' } });

    expect(merged.header.logo).toBe('Logo du site');
  });

  it('falls back to the reference for a missing namespace', () => {
    const merged = deepMerge(reference, { header: { skip: 'Skip' } });

    expect(merged.table.rowCount.other).toBe('{count} lignes');
  });

  it('falls back to the reference for a blank or nullish translation', () => {
    const merged = deepMerge(reference, { header: { skip: '', logo: null } });

    expect(merged.header.skip).toBe('Passer');
    expect(merged.header.logo).toBe('Logo du site');
  });

  it('ignores keys absent from the reference', () => {
    const merged = deepMerge(reference, { header: { unknown: 'x' } });

    expect('unknown' in merged.header).toBe(false);
  });

  it('merges plural-form maps key by key', () => {
    const merged = deepMerge(reference, { table: { rowCount: { one: '{count} row' } } });

    expect(merged.table.rowCount).toEqual({ one: '{count} row', other: '{count} lignes' });
  });

  it('returns the reference when the translation is not an object', () => {
    expect(deepMerge(reference, null)).toBe(reference);
    expect(deepMerge(reference, undefined)).toBe(reference);
  });

  it('leaves its arguments untouched', () => {
    const translation = { header: { skip: 'Skip' } };
    deepMerge(reference, translation);

    expect(reference.header.skip).toBe('Passer');
    expect(translation).toEqual({ header: { skip: 'Skip' } });
  });
});

describe('getDictionary', () => {
  it('returns the French reference for the default locale', async () => {
    await expect(getDictionary('fr')).resolves.toBe(fr);
  });

  it('returns a fully-keyed dictionary for a translated locale', async () => {
    const dictionary = await getDictionary('en');

    expect(leafPaths(dictionary).sort()).toEqual(leafPaths(fr).sort());
    expect(dictionary.header.skipToContent).toBe('Skip navigation');
  });

  it('falls back to the reference for an unknown locale rather than throwing', async () => {
    await expect(getDictionary('de')).resolves.toBe(fr);
    await expect(getDictionary(undefined)).resolves.toBe(fr);
  });

  // L'invariant de bout en bout : quelle que soit la langue demandée, aucun libellé
  // n'est vide. C'est ce qui garantit qu'aucun aria-label ne le sera non plus.
  it('never yields a blank label, in any shipped locale', async () => {
    for (const locale of ['fr', 'en', 'de']) {
      const dictionary = await getDictionary(locale);

      for (const path of leafPaths(dictionary)) {
        const value = path.split('.').reduce((node, key) => node[key], dictionary);
        expect(String(value).trim(), `${locale} → ${path}`).not.toBe('');
      }
    }
  });
});
