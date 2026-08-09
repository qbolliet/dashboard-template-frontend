import { describe, it, expect } from 'vitest';
import { pluralize } from './pluralize';

const FR = { one: '{count} ligne', other: '{count} lignes' };
const EN = { one: '{count} row', other: '{count} rows' };

describe('pluralize', () => {
  it('agrees in French, where zero is singular', () => {
    expect(pluralize(FR, 0, 'fr-FR')).toBe('0 ligne');
    expect(pluralize(FR, 1, 'fr-FR')).toBe('1 ligne');
    expect(pluralize(FR, 2, 'fr-FR')).toBe('2 lignes');
  });

  // C'est exactement ce que le motif `n > 1 ? 's' : ''` du dépôt rendait faux :
  // l'anglais met zéro au pluriel.
  it('agrees in English, where zero is plural', () => {
    expect(pluralize(EN, 0, 'en-US')).toBe('0 rows');
    expect(pluralize(EN, 1, 'en-US')).toBe('1 row');
    expect(pluralize(EN, 2, 'en-US')).toBe('2 rows');
  });

  // Le count est substitué BRUT : la mise en forme du nombre appartient à
  // formatNumber, pas au dictionnaire. Ce que ce cas vérifie, c'est la catégorie
  // d'accord — le motif `n > 1` du dépôt mettait 1,5 au pluriel.
  it('treats a French decimal below two as singular', () => {
    expect(pluralize(FR, 1.5, 'fr-FR')).toBe('1.5 ligne');
  });

  it('accepts a plain string for a label that does not vary', () => {
    expect(pluralize('{count} × ', 3, 'fr-FR')).toBe('3 × ');
  });

  it('merges extra placeholder values with count', () => {
    const forms = { one: '{count} ligne de {table}', other: '{count} lignes de {table}' };

    expect(pluralize(forms, 2, 'fr-FR', { table: 'PIB' })).toBe('2 lignes de PIB');
  });

  it('falls back to `other` when the matching category is missing', () => {
    expect(pluralize({ other: '{count} lignes' }, 1, 'fr-FR')).toBe('1 lignes');
  });

  it('returns an empty string for a malformed label', () => {
    expect(pluralize(null, 1, 'fr-FR')).toBe('');
    expect(pluralize(undefined, 1, 'fr-FR')).toBe('');
  });
});
