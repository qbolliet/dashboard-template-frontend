import { describe, it, expect } from 'vitest';
import { GLOBE_PALETTE, MAX_DASH_PARTS, parseDash, resolveHueEncoding } from './hueEncoding';
import { HATCH_TYPES, MARKER_TYPES, PALETTE } from '@/utils/encoding/scales';

const ARCS = [
  { from: 'a', to: 'b', mode: 'rail', kind: 'public' },
  { from: 'b', to: 'c', mode: 'air', kind: 'private' },
  { from: 'c', to: 'a', mode: 'rail', kind: 'private' },
  { from: 'a', to: 'c' },
];

const POINTS = [
  { id: 'a', region: 'eu', level: 'high', type: 'bank' },
  { id: 'b', region: 'us', level: 'low', type: 'office' },
  { id: 'c', region: 'eu', level: 'low', type: 'bank' },
];

const ARC_CHANNELS = ['color', 'style'];
const POINT_CHANNELS = ['color', 'style', 'marker'];

describe('GLOBE_PALETTE', () => {
  it('drops the blue hues of PALETTE (navy, steel-blue, slate), in order otherwise', () => {
    // Indices 0, 6 et 11 de PALETTE : --color-navy, --color-steel-blue, --color-slate.
    expect(GLOBE_PALETTE).toEqual(PALETTE.filter((_, i) => ![0, 6, 11].includes(i)));
    expect(GLOBE_PALETTE).toHaveLength(PALETTE.length - 3);
  });
});

describe('parseDash', () => {
  it('parses an SVG dash-array into pixel lengths', () => {
    expect(parseDash('6 4')).toEqual([6, 4]);
    expect(parseDash('8 4 1 4')).toEqual([8, 4, 1, 4]);
    expect(parseDash('6,4')).toEqual([6, 4]);
  });

  it('repeats an odd-length list, as browsers do', () => {
    expect(parseDash('5')).toEqual([5, 5]);
  });

  it('truncates to the number of parts the shader accepts', () => {
    expect(parseDash('1 2 3 4 5 6')).toHaveLength(MAX_DASH_PARTS);
  });

  it('means a solid stroke for null, empty or all-zero lists', () => {
    expect(parseDash(null)).toBeNull();
    expect(parseDash('')).toBeNull();
    expect(parseDash('0 0')).toBeNull();
  });
});

describe('resolveHueEncoding — flows', () => {
  it('is inactive without hue: token color and solid stroke for every row', () => {
    const enc = resolveHueEncoding(ARCS, [], []);
    expect(enc.active).toBe(false);
    expect(enc.colorFor(ARCS[0])).toBeNull();
    expect(enc.dashFor(ARCS[0])).toBeNull();
    expect(enc.fields).toEqual([]);
    expect(enc.legend).toEqual([]);
  });

  it('encodes the first key as color', () => {
    const enc = resolveHueEncoding(ARCS, ['mode'], ['color']);
    expect(enc.colorFor(ARCS[0])).toBe(GLOBE_PALETTE[0]);
    expect(enc.colorFor(ARCS[1])).toBe(GLOBE_PALETTE[1]);
    expect(enc.colorFor(ARCS[2])).toBe(GLOBE_PALETTE[0]);
    expect(enc.dashFor(ARCS[1])).toBeNull();
  });

  it('encodes the second key as the dash style', () => {
    const enc = resolveHueEncoding(ARCS, ['mode', 'kind'], ARC_CHANNELS);
    // 1re modalité rencontrée -> trait plein, 2e -> LINE_STYLES[1] = '6 4'.
    expect(enc.dashFor(ARCS[0])).toBeNull();
    expect(enc.dashFor(ARCS[1])).toBe('6 4');
    expect(parseDash(enc.dashFor(ARCS[1]))).toEqual([6, 4]);
  });

  it('keeps the default look for a row missing the hue key', () => {
    const enc = resolveHueEncoding(ARCS, ['mode', 'kind'], ARC_CHANNELS);
    expect(enc.colorFor(ARCS[3])).toBeNull();
    expect(enc.dashFor(ARCS[3])).toBeNull();
  });

  it('matches values by their string form', () => {
    const enc = resolveHueEncoding([{ k: 1 }, { k: 2 }], ['k'], ['color']);
    expect(enc.colorFor({ k: '2' })).toBe(GLOBE_PALETTE[1]);
  });

  it('builds one legend group per channel, tagged with the layer and titled by the labels', () => {
    const enc = resolveHueEncoding(ARCS, ['mode', 'kind'], ARC_CHANNELS, { layer: 'arcs', labels: { color: 'Transport' } });
    expect(enc.legend.map((g) => [g.channel, g.layer, g.label])).toEqual([
      ['color', 'arcs', 'Transport'],
      ['style', 'arcs', 'kind'],
    ]);
    expect(enc.legend[0].items).toEqual([
      { key: 'rail', color: GLOBE_PALETTE[0] },
      { key: 'air', color: GLOBE_PALETTE[1] },
    ]);
    // La légende garde le dash-array SVG brut et la hachure parallèle ; les glyphes de
    // style prennent la première couleur, comme dans <Chart>.
    expect(enc.legend[1].items).toEqual([
      { key: 'public', color: GLOBE_PALETTE[0], dash: null, hatch: HATCH_TYPES[0] },
      { key: 'private', color: GLOBE_PALETTE[0], dash: '6 4', hatch: HATCH_TYPES[1] },
    ]);
  });

  it('leaves the style glyphs to currentColor when no row carries a color value', () => {
    const enc = resolveHueEncoding(ARCS, ['missing', 'kind'], ARC_CHANNELS);
    expect(enc.legend[0].items).toEqual([]);
    expect(enc.legend[1].items[0].color).toBe('currentColor');
  });

  it('selects the rows of one legend item', () => {
    const enc = resolveHueEncoding(ARCS, ['mode', 'kind'], ARC_CHANNELS);
    expect(ARCS.filter(enc.matcher('color', 'rail'))).toEqual([ARCS[0], ARCS[2]]);
    expect(ARCS.filter(enc.matcher('style', 'private'))).toEqual([ARCS[1], ARCS[2]]);
    // Canal inactif : aucune ligne.
    expect(ARCS.filter(resolveHueEncoding(ARCS, ['mode'], ['color']).matcher('style', 'private'))).toEqual([]);
  });

  it('exposes the tooltip fields with the same titles', () => {
    const enc = resolveHueEncoding(ARCS, ['mode', 'kind'], ARC_CHANNELS, { labels: { style: 'Statut' } });
    expect(enc.fields).toEqual([
      { channel: 'color', key: 'mode', label: 'mode' },
      { channel: 'style', key: 'kind', label: 'Statut' },
    ]);
  });

  it('tolerates null rows and labels', () => {
    const enc = resolveHueEncoding(null, ['mode'], ['color'], { labels: null });
    expect(enc.active).toBe(true);
    expect(enc.legend[0].items).toEqual([]);
  });
});

describe('resolveHueEncoding — points', () => {
  it('encodes color, style (dash and hatch) and marker shape, like the bubbles of <Chart>', () => {
    const enc = resolveHueEncoding(POINTS, ['region', 'level', 'type'], POINT_CHANNELS);
    expect(enc.colorFor(POINTS[1])).toBe(GLOBE_PALETTE[1]);
    expect(enc.hatchFor(POINTS[0])).toBe(HATCH_TYPES[0]);
    expect(enc.hatchFor(POINTS[1])).toBe(HATCH_TYPES[1]);
    expect(enc.dashFor(POINTS[1])).toBe('6 4');
    expect(enc.markerFor(POINTS[0])).toBe(MARKER_TYPES[0]);
    expect(enc.markerFor(POINTS[1])).toBe(MARKER_TYPES[1]);
  });

  it('draws the marker glyphs of the legend in the first color', () => {
    const enc = resolveHueEncoding(POINTS, ['region', 'level', 'type'], POINT_CHANNELS, { layer: 'points' });
    expect(enc.legend.map((g) => g.channel)).toEqual(['color', 'style', 'marker']);
    expect(enc.legend[2].items).toEqual([
      { key: 'bank', color: GLOBE_PALETTE[0], marker: MARKER_TYPES[0] },
      { key: 'office', color: GLOBE_PALETTE[0], marker: MARKER_TYPES[1] },
    ]);
  });

  it('returns no marker without a marker channel', () => {
    const enc = resolveHueEncoding(POINTS, ['region'], ['color']);
    expect(enc.markerFor(POINTS[0])).toBeNull();
    expect(enc.hatchFor(POINTS[0])).toBeNull();
  });
});

describe('resolveHueEncoding — color shared between layers', () => {
  it('continues the palette after the colors another layer took', () => {
    const points = resolveHueEncoding(POINTS, ['region'], ['color']);
    expect(points.colorDomain).toEqual(['eu', 'us']);
    const arcs = resolveHueEncoding(ARCS, ['mode'], ['color'], { colorDomain: points.colorDomain });
    // 'rail' et 'air' prennent les 3e et 4e teintes : aucune collision avec les points.
    expect(arcs.colorFor(ARCS[0])).toBe(GLOBE_PALETTE[2]);
    expect(arcs.colorFor(ARCS[1])).toBe(GLOBE_PALETTE[3]);
    // La légende ne liste que les modalités du calque.
    expect(arcs.legend[0].items.map((it) => it.key)).toEqual(['rail', 'air']);
  });

  it('keeps the color of a value shared by both layers', () => {
    const points = resolveHueEncoding([{ m: 'air' }, { m: 'sea' }], ['m'], ['color']);
    const arcs = resolveHueEncoding(ARCS, ['mode'], ['color'], { colorDomain: points.colorDomain });
    expect(arcs.colorFor(ARCS[1])).toBe(points.colorFor({ m: 'air' }));
    expect(arcs.colorDomain).toEqual(['air', 'sea', 'rail']);
  });

  it('passes the taken domain through a layer without color channel', () => {
    const enc = resolveHueEncoding(ARCS, [], [], { colorDomain: ['x'] });
    expect(enc.colorDomain).toEqual(['x']);
  });
});
