import { describe, it, expect } from 'vitest';
import { hasActiveDescendant, isCurrentPath, isActivePath } from './activePath';

describe('isCurrentPath', () => {
  it('matches only the exact page', () => {
    expect(isCurrentPath('/demo/fr/about', '/demo/fr/about')).toBe(true);
    expect(isCurrentPath('/demo/fr/about', '/demo/fr')).toBe(false);
    expect(isCurrentPath('/demo/fr', '/demo/fr/about')).toBe(false);
  });

  it('keeps the home node from matching every page', () => {
    expect(isCurrentPath('/demo/fr/pib', '/demo/fr')).toBe(false);
    expect(isCurrentPath('/demo/fr', '/demo/fr')).toBe(true);
  });

  it('ignores a trailing slash', () => {
    expect(isCurrentPath('/demo/fr/about/', '/demo/fr/about')).toBe(true);
    expect(isCurrentPath('/', '/')).toBe(true);
  });

  it('never matches external or placeholder targets', () => {
    expect(isCurrentPath('/a', '#')).toBe(false);
    expect(isCurrentPath('/a', 'https://example.org/a')).toBe(false);
    expect(isCurrentPath('/a', undefined)).toBe(false);
  });
});

describe('isActivePath', () => {
  it('is active on the node and below it', () => {
    expect(isActivePath('/fr/finances-publiques', '/fr/finances-publiques')).toBe(true);
    expect(isActivePath('/fr/finances-publiques/recettes', '/fr/finances-publiques')).toBe(true);
  });

  it('is segment-bounded', () => {
    expect(isActivePath('/fr/finances-publiques-locales', '/fr/finances-publiques')).toBe(false);
  });

  it('is not active on a parent page', () => {
    expect(isActivePath('/fr', '/fr/finances-publiques')).toBe(false);
  });

  it('treats the site root as active on itself only', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/about', '/')).toBe(false);
  });

  it('never matches external or placeholder targets', () => {
    expect(isActivePath('/a', '#')).toBe(false);
    expect(isActivePath('/a', 'mailto:a@b.c')).toBe(false);
  });
});

describe('hasActiveDescendant', () => {
  const group = {
    path: '/fr/a',
    children: [{ name: 'Dossier', children: [{ path: '/fr/a/x', name: 'X' }] }, { path: '/fr/a/y', name: 'Y' }],
  };

  it('looks through folders', () => {
    expect(hasActiveDescendant('/fr/a/x', group)).toBe(true);
    expect(hasActiveDescendant('/fr/a/y', group)).toBe(true);
  });

  it('is false elsewhere and on a leaf', () => {
    expect(hasActiveDescendant('/fr/b', group)).toBe(false);
    expect(hasActiveDescendant('/fr/a/x', { path: '/fr/a/x' })).toBe(false);
  });
});
