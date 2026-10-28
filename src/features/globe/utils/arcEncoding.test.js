import { describe, it, expect } from 'vitest';
import { ARC_PALETTE, MAX_DASH_PARTS, normalizeArcHue, parseDash, resolveArcEncoding } from './arcEncoding';
import { PALETTE } from '@/utils/encoding/scales';

const ARCS = [
  { from: 'a', to: 'b', mode: 'rail', kind: 'public' },
  { from: 'b', to: 'c', mode: 'air', kind: 'private' },
  { from: 'c', to: 'a', mode: 'rail', kind: 'private' },
  { from: 'a', to: 'c' },
];

describe('normalizeArcHue', () => {
  it('turns a single key into a one-channel list', () => {
    expect(normalizeArcHue('mode')).toEqual(['mode']);
  });

  it('keeps at most two non-empty keys', () => {
    expect(normalizeArcHue(['mode', 'kind', 'extra'])).toEqual(['mode', 'kind']);
    expect(normalizeArcHue(['', null, 'kind'])).toEqual(['kind']);
  });

  it('returns an empty list without hue', () => {
    expect(normalizeArcHue(null)).toEqual([]);
    expect(normalizeArcHue(undefined)).toEqual([]);
  });
});

describe('ARC_PALETTE', () => {
  it('drops the blue hues of PALETTE (navy, steel-blue, slate), in order otherwise', () => {
    // Indices 0, 6 et 11 de PALETTE : --color-navy, --color-steel-blue, --color-slate.
    expect(ARC_PALETTE).toEqual(PALETTE.filter((_, i) => ![0, 6, 11].includes(i)));
    expect(ARC_PALETTE).toHaveLength(PALETTE.length - 3);
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

describe('resolveArcEncoding', () => {
  it('is inactive without hue: token color and solid stroke for every arc', () => {
    const enc = resolveArcEncoding(ARCS, null);
    expect(enc.active).toBe(false);
    expect(enc.colorFor(ARCS[0])).toBeNull();
    expect(enc.dashFor(ARCS[0])).toBeNull();
    expect(enc.fields).toEqual([]);
    expect(enc.legend).toEqual([]);
  });

  it('encodes a single key as color only', () => {
    const enc = resolveArcEncoding(ARCS, 'mode');
    expect(enc.colorFor(ARCS[0])).toBe(ARC_PALETTE[0]);
    expect(enc.colorFor(ARCS[1])).toBe(ARC_PALETTE[1]);
    expect(enc.colorFor(ARCS[2])).toBe(ARC_PALETTE[0]);
    expect(enc.dashFor(ARCS[1])).toBeNull();
  });

  it('encodes the second key as the dash style', () => {
    const enc = resolveArcEncoding(ARCS, ['mode', 'kind']);
    // 1re modalité rencontrée -> trait plein, 2e -> LINE_STYLES[1] = '6 4'.
    expect(enc.dashFor(ARCS[0])).toBeNull();
    expect(enc.dashFor(ARCS[1])).toEqual([6, 4]);
  });

  it('keeps the default look for an arc missing the hue key', () => {
    const enc = resolveArcEncoding(ARCS, ['mode', 'kind']);
    expect(enc.colorFor(ARCS[3])).toBeNull();
    expect(enc.dashFor(ARCS[3])).toBeNull();
  });

  it('matches values by their string form', () => {
    const enc = resolveArcEncoding([{ k: 1 }, { k: 2 }], 'k');
    expect(enc.colorFor({ k: '2' })).toBe(ARC_PALETTE[1]);
  });

  it('builds one legend group per channel, titled by the data labels or the key', () => {
    const enc = resolveArcEncoding(ARCS, ['mode', 'kind'], { color: 'Transport' });
    expect(enc.legend.map((g) => [g.channel, g.label])).toEqual([['color', 'Transport'], ['style', 'kind']]);
    expect(enc.legend[0].items).toEqual([
      { key: 'rail', color: ARC_PALETTE[0] },
      { key: 'air', color: ARC_PALETTE[1] },
    ]);
    // La légende garde le dash-array SVG brut, consommé par stroke-dasharray ;
    // les glyphes de style prennent la première couleur, comme dans <Chart>.
    expect(enc.legend[1].items).toEqual([
      { key: 'public', color: ARC_PALETTE[0], dash: null },
      { key: 'private', color: ARC_PALETTE[0], dash: '6 4' },
    ]);
  });

  it('leaves the style glyphs to currentColor when no arc carries a color value', () => {
    // Clé couleur absente des données : les flux gardent le token --globe-arc,
    // que seule la feuille de style de l'hôte connaît.
    const enc = resolveArcEncoding(ARCS, ['missing', 'kind']);
    expect(enc.legend[0].items).toEqual([]);
    expect(enc.legend[1].items[0].color).toBe('currentColor');
  });

  it('selects the arcs of one legend item', () => {
    const enc = resolveArcEncoding(ARCS, ['mode', 'kind']);
    expect(ARCS.filter(enc.matcher('color', 'rail'))).toEqual([ARCS[0], ARCS[2]]);
    expect(ARCS.filter(enc.matcher('style', 'private'))).toEqual([ARCS[1], ARCS[2]]);
    // Canal inactif : aucun arc.
    expect(ARCS.filter(resolveArcEncoding(ARCS, 'mode').matcher('style', 'private'))).toEqual([]);
  });

  it('exposes the tooltip fields with the same titles', () => {
    const enc = resolveArcEncoding(ARCS, ['mode', 'kind'], { style: 'Statut' });
    expect(enc.fields).toEqual([
      { channel: 'color', key: 'mode', label: 'mode' },
      { channel: 'style', key: 'kind', label: 'Statut' },
    ]);
  });

  it('tolerates null arcs and labels', () => {
    const enc = resolveArcEncoding(null, 'mode', null);
    expect(enc.active).toBe(true);
    expect(enc.legend[0].items).toEqual([]);
  });
});
