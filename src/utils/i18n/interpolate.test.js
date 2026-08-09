import { describe, it, expect } from 'vitest';
import { interpolate, placeholdersOf } from './interpolate';

describe('interpolate', () => {
  it('fills a named placeholder', () => {
    expect(interpolate('Trier par {column}', { column: 'Région' })).toBe('Trier par Région');
  });

  it('fills the same placeholder everywhere it appears', () => {
    expect(interpolate('{a} et {a}', { a: 'x' })).toBe('x et x');
  });

  it('fills several placeholders regardless of their order in the template', () => {
    expect(interpolate('{b} before {a}', { a: 'A', b: 'B' })).toBe('B before A');
  });

  it('returns the template untouched when it holds no placeholder', () => {
    expect(interpolate('Rechercher', { column: 'x' })).toBe('Rechercher');
  });

  it('returns the template untouched when no values are given', () => {
    expect(interpolate('Trier par {column}')).toBe('Trier par {column}');
  });

  it('coerces non-string values', () => {
    expect(interpolate('{count} lignes', { count: 12 })).toBe('12 lignes');
  });

  it('substitutes falsy but meaningful values', () => {
    expect(interpolate('{count} lignes', { count: 0 })).toBe('0 lignes');
    expect(interpolate('[{value}]', { value: '' })).toBe('[]');
    expect(interpolate('{flag}', { flag: false })).toBe('false');
  });

  // Un trou laissé visible NOMME la clé manquante ; le remplacer par une chaîne vide
  // produirait un libellé mutilé que personne ne remarque.
  it('leaves an unfilled placeholder verbatim rather than blanking it', () => {
    expect(interpolate('Trier par {column}', { other: 'x' })).toBe('Trier par {column}');
    expect(interpolate('Trier par {column}', { column: null })).toBe('Trier par {column}');
    expect(interpolate('Trier par {column}', { column: undefined })).toBe('Trier par {column}');
  });

  it('ignores braces that are not well-formed placeholders', () => {
    expect(interpolate('{ spaced }', { spaced: 'x' })).toBe('{ spaced }');
    expect(interpolate('const x = {};', {})).toBe('const x = {};');
    expect(interpolate('{a-b}', { 'a-b': 'x' })).toBe('{a-b}');
  });

  it('coerces non-string templates to an empty string', () => {
    expect(interpolate(null, { a: 1 })).toBe('');
    expect(interpolate(undefined)).toBe('');
  });
});

describe('placeholdersOf', () => {
  it('lists placeholder names in order of first appearance', () => {
    expect(placeholdersOf('{b} then {a} then {b}')).toEqual(['b', 'a']);
  });

  it('returns an empty array for a template with no placeholder', () => {
    expect(placeholdersOf('Rechercher')).toEqual([]);
    expect(placeholdersOf(null)).toEqual([]);
  });
});
