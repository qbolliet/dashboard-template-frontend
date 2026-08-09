import { describe, it, expect } from 'vitest';
import { readLocaleFromPath, swapLocaleInPath, localeHomePath } from './localePath';

const OPTIONS = { locales: ['fr', 'en'] };

describe('readLocaleFromPath', () => {
  it('reads the locale segment that follows the prefix', () => {
    expect(readLocaleFromPath('/demo/en/comptabilite-nationale', OPTIONS)).toBe('en');
    expect(readLocaleFromPath('/demo/fr', OPTIONS)).toBe('fr');
  });

  // trailingSlash vaut true à l'export statique et false en développement : les deux
  // formes du même chemin doivent se lire identiquement.
  it('tolerates a trailing slash', () => {
    expect(readLocaleFromPath('/demo/en/', OPTIONS)).toBe('en');
    expect(readLocaleFromPath('/demo/en/pib/', OPTIONS)).toBe('en');
  });

  it('returns null for the bare prefix', () => {
    expect(readLocaleFromPath('/demo', OPTIONS)).toBeNull();
    expect(readLocaleFromPath('/demo/', OPTIONS)).toBeNull();
  });

  it('returns null outside the prefix — the documentation site has no locale segment', () => {
    expect(readLocaleFromPath('/', OPTIONS)).toBeNull();
    expect(readLocaleFromPath('/guides/api-graphql', OPTIONS)).toBeNull();
    expect(readLocaleFromPath('/en/guides', OPTIONS)).toBeNull();
  });

  it('does not mistake a longer segment for the prefix', () => {
    expect(readLocaleFromPath('/demolition/en', OPTIONS)).toBeNull();
  });

  it('returns null when the segment is not a shipped locale', () => {
    expect(readLocaleFromPath('/demo/de/pib', OPTIONS)).toBeNull();
    expect(readLocaleFromPath('/demo/pib', OPTIONS)).toBeNull();
  });

  it('honours a custom prefix', () => {
    expect(readLocaleFromPath('/app/en/pib', { ...OPTIONS, prefix: '/app' })).toBe('en');
    // Préfixe vide : la locale est le premier segment. C'est la forme qu'obtient un
    // consommateur qui supprime le site de documentation.
    expect(readLocaleFromPath('/en/pib', { ...OPTIONS, prefix: '' })).toBe('en');
  });

  it('returns null for non-string input', () => {
    expect(readLocaleFromPath(null, OPTIONS)).toBeNull();
  });
});

describe('swapLocaleInPath', () => {
  it('rewrites the locale segment and keeps the rest of the path', () => {
    expect(swapLocaleInPath('/demo/fr/comptabilite-nationale/france/pib', 'en', OPTIONS))
      .toBe('/demo/en/comptabilite-nationale/france/pib');
  });

  it('rewrites the home page of the demo', () => {
    expect(swapLocaleInPath('/demo/fr', 'en', OPTIONS)).toBe('/demo/en');
  });

  it('preserves the trailing slash convention of the input', () => {
    expect(swapLocaleInPath('/demo/fr/pib/', 'en', OPTIONS)).toBe('/demo/en/pib/');
    expect(swapLocaleInPath('/demo/fr/pib', 'en', OPTIONS)).toBe('/demo/en/pib');
    expect(swapLocaleInPath('/demo/fr/', 'en', OPTIONS)).toBe('/demo/en/');
  });

  it('returns the path untouched when it carries no locale segment', () => {
    expect(swapLocaleInPath('/guides/api-graphql', 'en', OPTIONS)).toBe('/guides/api-graphql');
    expect(swapLocaleInPath('/demo', 'en', OPTIONS)).toBe('/demo');
    expect(swapLocaleInPath('/', 'en', OPTIONS)).toBe('/');
  });

  it('is idempotent when the target locale is the current one', () => {
    expect(swapLocaleInPath('/demo/fr/pib', 'fr', OPTIONS)).toBe('/demo/fr/pib');
  });

  it('round-trips with readLocaleFromPath', () => {
    const swapped = swapLocaleInPath('/demo/fr/pib', 'en', OPTIONS);

    expect(readLocaleFromPath(swapped, OPTIONS)).toBe('en');
  });
});

describe('localeHomePath', () => {
  it('builds the demo home path of a locale', () => {
    expect(localeHomePath('en')).toBe('/demo/en');
    expect(localeHomePath('fr', '/app')).toBe('/app/fr');
  });
});
