import { describe, expect, it } from 'vitest';
import { defaultFlagSrc, flagCdnSrc } from './languages';

describe('defaultFlagSrc', () => {
  it('renvoie le fichier local puis flagcdn.com, dans cet ordre', () => {
    expect(defaultFlagSrc('GB')).toEqual(['/flags/gb.svg', 'https://flagcdn.com/gb.svg']);
  });

  it('met le code pays en minuscules', () => {
    expect(defaultFlagSrc('Fr')[0]).toBe('/flags/fr.svg');
    expect(defaultFlagSrc('Fr')[1]).toBe(flagCdnSrc('Fr'));
  });

  it('renvoie null sans pays', () => {
    expect(defaultFlagSrc()).toBeNull();
    expect(defaultFlagSrc('')).toBeNull();
  });
});
