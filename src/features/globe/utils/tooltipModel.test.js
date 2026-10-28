import { describe, it, expect } from 'vitest';
import { arcTooltipModel, pointTooltipModel } from './tooltipModel';
import { GLOBE_PALETTE, resolveHueEncoding } from './hueEncoding';
import { MARKER_TYPES } from '@/utils/encoding/scales';

const POINTS = [
  { id: 'par', label: 'Paris', sub: 'INSEE', region: 'eu', type: 'office', activity: 92 },
  { id: 'nyc', label: 'New York', region: 'us', type: 'bank', activity: 88 },
];
const ARCS = [{ from: 'par', to: 'nyc', mode: 'air', kind: 'regular', volume: 1200 }];

const format = (v) => `${v} u`;
const noZ = { key: null, label: null, format };

describe('pointTooltipModel', () => {
  it('titles the bubble with the point label and its subtitle', () => {
    const encoding = resolveHueEncoding(POINTS, [], []);
    const model = pointTooltipModel(POINTS[0], { encoding, mark: 'badge', z: noZ });
    expect(model.title).toBe('Paris');
    expect(model.subtitle).toBe('INSEE');
    expect(model.hueRows).toEqual([]);
    expect(model.valueRows).toEqual([]);
    // Sans canal couleur, le glyphe suit le token du calque, via currentColor.
    expect(model.glyphSpec).toEqual({ kind: 'bubble', color: 'currentColor', marker: 'circle' });
  });

  it('lists the hue values and the formatted z value', () => {
    const encoding = resolveHueEncoding(POINTS, ['region', 'type'], ['color', 'style'], { labels: { color: 'Région' } });
    const z = { key: 'activity', label: 'Activité', format };
    const model = pointTooltipModel(POINTS[0], { encoding, mark: 'bubble', z });
    expect(model.hueRows).toEqual([{ label: 'Région', value: 'eu' }, { label: 'type', value: 'office' }]);
    expect(model.valueRows).toEqual([{ label: 'Activité', value: '92 u' }]);
    expect(model.glyphSpec.color).toBe(GLOBE_PALETTE[0]);
  });

  it('draws the marker shape of a bubble, but always a disc for a badge', () => {
    const encoding = resolveHueEncoding(POINTS, ['region', 'type', 'type'], ['color', 'style', 'marker']);
    expect(pointTooltipModel(POINTS[1], { encoding, mark: 'bubble', z: noZ }).glyphSpec.marker).toBe(MARKER_TYPES[1]);
    expect(pointTooltipModel(POINTS[1], { encoding, mark: 'badge', z: noZ }).glyphSpec.marker).toBe('circle');
  });

  it('falls back to the key as z title and to the id as title', () => {
    const encoding = resolveHueEncoding([], [], []);
    const model = pointTooltipModel({ id: 'x', activity: 3 }, { encoding, mark: 'bubble', z: { key: 'activity', label: null, format } });
    expect(model.title).toBe('x');
    expect(model.subtitle).toBeNull();
    expect(model.valueRows).toEqual([{ label: 'activity', value: '3 u' }]);
  });
});

describe('arcTooltipModel', () => {
  it('joins the endpoints with an arrow, or a dash for undirected flows', () => {
    const encoding = resolveHueEncoding(ARCS, [], []);
    expect(arcTooltipModel(ARCS[0], POINTS[0], POINTS[1], { encoding, mark: 'arrow', z: noZ }).title).toBe('Paris → New York');
    expect(arcTooltipModel(ARCS[0], POINTS[0], POINTS[1], { encoding, mark: 'line', z: noZ }).title).toBe('Paris — New York');
  });

  it('draws a line glyph with the flow color and dash, and lists hue and z', () => {
    const encoding = resolveHueEncoding(ARCS, ['mode', 'kind'], ['color', 'style'], { labels: { color: 'Mode' } });
    const model = arcTooltipModel(ARCS[0], POINTS[0], POINTS[1], {
      encoding, mark: 'arrow', z: { key: 'volume', label: 'Volume', format },
    });
    expect(model.glyphSpec).toEqual({ kind: 'line', color: GLOBE_PALETTE[0], dash: null });
    expect(model.hueRows).toEqual([{ label: 'Mode', value: 'air' }, { label: 'kind', value: 'regular' }]);
    expect(model.valueRows).toEqual([{ label: 'Volume', value: '1200 u' }]);
  });
});
