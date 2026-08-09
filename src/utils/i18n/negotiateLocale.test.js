import { describe, it, expect } from 'vitest';
import { negotiateLocale, parseAcceptLanguage } from './negotiateLocale';

const SUPPORTED = ['fr', 'en'];

describe('parseAcceptLanguage', () => {
  it('parses a simple header', () => {
    expect(parseAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.8')).toEqual(['fr-FR', 'fr', 'en']);
  });

  it('sorts by quality, most preferred first', () => {
    expect(parseAcceptLanguage('en;q=0.5,fr;q=0.9')).toEqual(['fr', 'en']);
  });

  it('keeps the declared order for tags of equal quality', () => {
    expect(parseAcceptLanguage('de,fr,en')).toEqual(['de', 'fr', 'en']);
  });

  it('treats a missing q as 1', () => {
    expect(parseAcceptLanguage('en;q=0.9,fr')).toEqual(['fr', 'en']);
  });

  it('drops the wildcard', () => {
    expect(parseAcceptLanguage('fr,*;q=0.1')).toEqual(['fr']);
  });

  it('returns an empty list for an absent or empty header', () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
    expect(parseAcceptLanguage('   ')).toEqual([]);
  });
});

describe('negotiateLocale', () => {
  it('matches a candidate exactly', () => {
    expect(negotiateLocale(['en', 'fr'], SUPPORTED, 'fr')).toBe('en');
  });

  it('matches on the language subtag when no exact match exists', () => {
    expect(negotiateLocale(['fr-CA'], SUPPORTED, 'en')).toBe('fr');
    expect(negotiateLocale(['en-GB', 'de'], SUPPORTED, 'fr')).toBe('en');
  });

  it('is case-insensitive', () => {
    expect(negotiateLocale(['FR-be'], SUPPORTED, 'en')).toBe('fr');
  });

  // Une correspondance exacte plus loin dans la liste doit primer sur une
  // correspondance de langue seule trouvée plus tôt.
  it('prefers an exact match over an earlier language-only match', () => {
    expect(negotiateLocale(['fr-CA', 'en'], ['en', 'fr-CA'], 'en')).toBe('fr-CA');
  });

  // L'ordre de `site.locales` est donc significatif : la première variante déclarée
  // d'une langue est celle qu'obtient un candidat sans région.
  it('returns the first declared variant of a language for a region-less candidate', () => {
    expect(negotiateLocale(['pt'], ['pt-BR', 'pt-PT'], 'en')).toBe('pt-BR');
    expect(negotiateLocale(['pt'], ['pt-PT', 'pt-BR'], 'en')).toBe('pt-PT');
  });

  it('falls back when nothing matches', () => {
    expect(negotiateLocale(['de', 'it'], SUPPORTED, 'fr')).toBe('fr');
  });

  it('falls back on empty or malformed input', () => {
    expect(negotiateLocale([], SUPPORTED, 'fr')).toBe('fr');
    expect(negotiateLocale(null, SUPPORTED, 'fr')).toBe('fr');
    expect(negotiateLocale(['fr'], [], 'fr')).toBe('fr');
    expect(negotiateLocale([null, undefined, 42, 'en'], SUPPORTED, 'fr')).toBe('en');
  });

  it('composes with parseAcceptLanguage', () => {
    const header = 'en-US,en;q=0.9,fr;q=0.8';

    expect(negotiateLocale(parseAcceptLanguage(header), SUPPORTED, 'fr')).toBe('en');
  });
});
