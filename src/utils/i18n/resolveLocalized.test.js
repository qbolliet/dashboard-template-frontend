import { describe, it, expect } from 'vitest';
import { resolveLocalized, isLocalizedValue, resolveLocalizedTree } from './resolveLocalized';

describe('resolveLocalized', () => {
  it('returns a plain string unchanged, whatever the locale', () => {
    expect(resolveLocalized('PIB', 'en', 'fr')).toBe('PIB');
    expect(resolveLocalized('PIB', 'fr', 'fr')).toBe('PIB');
  });

  it('picks the requested locale from a locale map', () => {
    expect(resolveLocalized({ fr: 'Accueil', en: 'Home' }, 'en', 'fr')).toBe('Home');
  });

  it('falls back to the default locale when the requested one is missing', () => {
    expect(resolveLocalized({ fr: 'Accueil' }, 'en', 'fr')).toBe('Accueil');
  });

  it('falls back to the default locale when the requested one is blank', () => {
    expect(resolveLocalized({ fr: 'Accueil', en: '   ' }, 'en', 'fr')).toBe('Accueil');
  });

  it('falls back to any available value rather than returning nothing', () => {
    expect(resolveLocalized({ es: 'Inicio' }, 'en', 'fr')).toBe('Inicio');
  });

  it('never returns undefined', () => {
    expect(resolveLocalized(null, 'en', 'fr')).toBe('');
    expect(resolveLocalized(undefined, 'en', 'fr')).toBe('');
    expect(resolveLocalized({}, 'en', 'fr')).toBe('');
    expect(resolveLocalized({ fr: '' }, 'en', 'fr')).toBe('');
  });

  it('coerces a non-string scalar', () => {
    expect(resolveLocalized(42, 'fr', 'fr')).toBe('42');
  });
});

describe('isLocalizedValue', () => {
  it('recognises a locale map', () => {
    expect(isLocalizedValue({ fr: 'a' })).toBe(true);
  });

  it('rejects plain strings, arrays and nullish values', () => {
    expect(isLocalizedValue('PIB')).toBe(false);
    expect(isLocalizedValue(['fr'])).toBe(false);
    expect(isLocalizedValue(null)).toBe(false);
    expect(isLocalizedValue(undefined)).toBe(false);
  });
});

describe('resolveLocalizedTree', () => {
  const tree = [
    { path: '/', name: { fr: 'Accueil', en: 'Home' }, type: 'home' },
    {
      path: '/comptabilite-nationale',
      name: { fr: 'Comptabilité Nationale', en: 'National accounts' },
      description: { fr: 'Agrégats.', en: 'Aggregates.' },
      type: 'indicator_group',
      children: [{ path: '/pib', name: 'PIB', type: 'indicator' }],
    },
  ];

  it('collapses every localized field to a plain string, recursively', () => {
    const resolved = resolveLocalizedTree(tree, 'en', 'fr');

    expect(resolved[0].name).toBe('Home');
    expect(resolved[1].name).toBe('National accounts');
    expect(resolved[1].description).toBe('Aggregates.');
    expect(resolved[1].children[0].name).toBe('PIB');
  });

  it('keeps every other key of every node', () => {
    const resolved = resolveLocalizedTree(tree, 'en', 'fr');

    expect(resolved[1].path).toBe('/comptabilite-nationale');
    expect(resolved[1].type).toBe('indicator_group');
  });

  // Le schéma impose d'omettre `description` sur un nœud qui n'en a pas, et plusieurs
  // composants testent la présence de la clé plutôt que sa valeur.
  it('does not create a description key on a node that had none', () => {
    const resolved = resolveLocalizedTree(tree, 'en', 'fr');

    expect('description' in resolved[0]).toBe(false);
  });

  it('does not create a children key on a leaf', () => {
    const resolved = resolveLocalizedTree(tree, 'en', 'fr');

    expect('children' in resolved[1].children[0]).toBe(false);
  });

  it('leaves the input tree untouched', () => {
    resolveLocalizedTree(tree, 'en', 'fr');

    expect(tree[0].name).toEqual({ fr: 'Accueil', en: 'Home' });
  });

  it('defaults to an empty tree', () => {
    expect(resolveLocalizedTree(undefined, 'en', 'fr')).toEqual([]);
  });
});
