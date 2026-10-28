import { describe, it, expect } from 'vitest';
import { normalizeArcs, normalizeHue, normalizePoints } from './layers';

const ROWS = [{ id: 'a', lat: 0, lon: 0 }];

describe('normalizeHue', () => {
  it('turns a single key into a one-key list', () => {
    expect(normalizeHue('mode', 2)).toEqual(['mode']);
  });

  it('keeps non-empty keys, at most one per channel', () => {
    expect(normalizeHue(['mode', 'kind', 'extra'], 2)).toEqual(['mode', 'kind']);
    expect(normalizeHue(['', null, 'kind'], 2)).toEqual(['kind']);
  });

  it('returns an empty list without hue', () => {
    expect(normalizeHue(null, 3)).toEqual([]);
    expect(normalizeHue(undefined, 3)).toEqual([]);
  });
});

describe('normalizePoints', () => {
  it('accepts an array as a shorthand for { data }', () => {
    const layer = normalizePoints(ROWS);
    expect(layer.data).toBe(ROWS);
    expect(layer.mark).toBe('badge');
    expect(layer.hue).toEqual([]);
    expect(layer.z).toBeNull();
  });

  it('falls back to an empty layer for a missing or null prop', () => {
    expect(normalizePoints(undefined).data).toEqual([]);
    expect(normalizePoints({ data: null }).data).toEqual([]);
  });

  it('encodes only the color of a badge, which carries an icon', () => {
    const layer = normalizePoints({ data: ROWS, hue: ['region', 'level'] });
    expect(layer.hue).toEqual(['region']);
    expect(layer.channels).toEqual(['color']);
  });

  it('encodes up to three channels on a bubble, like hue on <Chart>', () => {
    const layer = normalizePoints({ data: ROWS, mark: 'bubble', hue: ['region', 'level', 'type', 'extra'] });
    expect(layer.hue).toEqual(['region', 'level', 'type']);
    expect(layer.channels).toEqual(['color', 'style', 'marker']);
  });

  it('pulses a badge and keeps a bubble still by default', () => {
    expect(normalizePoints(ROWS).pulse).toBe(true);
    expect(normalizePoints({ data: ROWS, mark: 'bubble' }).pulse).toBe(false);
    expect(normalizePoints({ data: ROWS, mark: 'bubble', pulse: true }).pulse).toBe(true);
  });

  it('falls back to the defaults for unknown values', () => {
    const layer = normalizePoints({ data: ROWS, mark: 'pin', fill: 'none', icon: 'svg', labels: null });
    expect(layer.mark).toBe('badge');
    expect(layer.fill).toBe('fill');
    expect(layer.icon).toBeNull();
    expect(layer.labels).toEqual({});
  });
});

describe('normalizeArcs', () => {
  it('accepts an array as a shorthand for { data }', () => {
    const layer = normalizeArcs([{ from: 'a', to: 'b' }]);
    expect(layer.mark).toBe('arrow');
    expect(layer.data).toHaveLength(1);
  });

  it('keeps the color and style channels, and a valid mark', () => {
    const layer = normalizeArcs({ data: [], mark: 'glow', hue: ['mode', 'kind', 'extra'], z: 'volume' });
    expect(layer.mark).toBe('glow');
    expect(layer.hue).toEqual(['mode', 'kind']);
    expect(layer.channels).toEqual(['color', 'style']);
    expect(layer.z).toBe('volume');
  });

  it('falls back to the arrow for an unknown mark', () => {
    expect(normalizeArcs({ mark: 'curve' }).mark).toBe('arrow');
  });
});
