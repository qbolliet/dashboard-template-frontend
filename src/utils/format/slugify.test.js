import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips diacritics rather than encoding them', () => {
    expect(slugify('Accessibilité')).toBe('accessibilite');
    expect(slugify('Accessibilite')).toBe('accessibilite');
  });

  it('collapses any run of non-alphanumeric characters into a single hyphen', () => {
    expect(slugify('foo & bar / baz')).toBe('foo-bar-baz');
    expect(slugify('a   b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
  });

  it('coerces non-string input', () => {
    expect(slugify(42)).toBe('42');
  });

  it('returns an empty string for input with no alphanumeric content', () => {
    expect(slugify('###')).toBe('');
  });
});
