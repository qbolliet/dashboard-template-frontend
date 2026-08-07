import { describe, it, expect } from 'vitest';
import {
  nextFreeChannel,
  variantStyle,
  variantHatch,
  variantMarker,
  variantVisual,
  REAL_DIST_MARKER,
  PROJ_DIST_MARKER,
} from './channelAssign';
import { LINE_STYLES, HATCH_TYPES, MARKER_TYPES } from '../utils/encoding';

describe('nextFreeChannel', () => {
  it('picks "style" first when both channels are free', () => {
    expect(nextFreeChannel({ color: 'x', style: null, marker: null }, [])).toBe('style');
  });

  it('skips "style" when already taken by the main series hue', () => {
    expect(nextFreeChannel({ color: 'x', style: 'a', marker: null }, [])).toBe('marker');
  });

  it('skips channels already taken by other encoder features (usedExtra)', () => {
    expect(nextFreeChannel({ color: 'x', style: null, marker: null }, ['style'])).toBe('marker');
  });

  it('never returns "color" even when it is the only channel set', () => {
    const result = nextFreeChannel({ color: 'x', style: null, marker: null }, []);
    expect(result).not.toBe('color');
  });

  it('degrades to reusing "marker" once both channels are exhausted', () => {
    expect(nextFreeChannel({ color: 'x', style: 'a', marker: 'b' }, [])).toBe('marker');
    expect(nextFreeChannel({ color: 'x', style: null, marker: null }, ['style', 'marker'])).toBe('marker');
  });
});

describe('variantStyle / variantHatch / variantMarker', () => {
  it('skip index 0 (solid / no-hatch / circle), reserved for the main series', () => {
    expect(variantStyle(0)).toBe(LINE_STYLES[1]);
    expect(variantHatch(0)).toBe(HATCH_TYPES[1]);
    expect(variantMarker(0)).toBe(MARKER_TYPES[1]);
  });

  it('cycle back to the first variant once the palette (minus index 0) is exhausted', () => {
    expect(variantStyle(LINE_STYLES.length - 1)).toBe(LINE_STYLES[1]);
    expect(variantMarker(MARKER_TYPES.length - 1)).toBe(MARKER_TYPES[1]);
  });
});

describe('variantVisual', () => {
  it('resolves a marker shape on the "marker" channel', () => {
    expect(variantVisual('marker', 0, 'none')).toEqual({ marker: variantMarker(0) });
  });

  it('resolves a hatch pattern on non-marker channels when fillMode is fill/bars', () => {
    expect(variantVisual('style', 0, 'fill')).toEqual({ hatch: variantHatch(0) });
    expect(variantVisual('style', 0, 'bars')).toEqual({ hatch: variantHatch(0) });
  });

  it('resolves a dash pattern on non-marker channels otherwise', () => {
    expect(variantVisual('style', 0, 'line')).toEqual({ dash: variantStyle(0) });
    expect(variantVisual('style', 0, 'none')).toEqual({ dash: variantStyle(0) });
  });
});

describe('REAL_DIST_MARKER / PROJ_DIST_MARKER', () => {
  it('are distinct binary distinction markers', () => {
    expect(REAL_DIST_MARKER).toBe('circle');
    expect(PROJ_DIST_MARKER).toBe('cross');
    expect(REAL_DIST_MARKER).not.toBe(PROJ_DIST_MARKER);
  });

  it('PROJ_DIST_MARKER ("cross") is deliberately outside the MARKER_TYPES cycle', () => {
    // variantMarker() only ever cycles through MARKER_TYPES, so the projection
    // marker can never collide with a hue-assigned marker variant.
    expect(MARKER_TYPES).not.toContain(PROJ_DIST_MARKER);
  });
});
