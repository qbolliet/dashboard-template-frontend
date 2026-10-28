import { describe, it, expect } from 'vitest';
import {
  ARC_SAMPLES,
  ARC_TILES,
  arcHeight,
  arcTileVertexCount,
  buildArcBuffers,
  cumulativeLengths,
  pointAtDistance,
  wrapPi,
  writeArcDistances,
} from './arcGeometry';

const PARIS = { lon: 2.35, lat: 48.85 };
const BERLIN = { lon: 13.40, lat: 52.52 };
const TOKYO = { lon: 139.69, lat: 35.68 };
const SAN_FRANCISCO = { lon: -122.42, lat: 37.77 };

const S = ARC_SAMPLES;
const V = arcTileVertexCount(S);
const vec3 = (arr, v) => Array.from(arr.subarray(v * 3, v * 3 + 3));

describe('buildArcBuffers — topology', () => {
  const buf = buildArcBuffers(PARIS, BERLIN, 0.5);

  it('allocates two vertices per sample plus three head vertices, per tile', () => {
    expect(V).toBe(2 * S + 3);
    expect(buf.position).toHaveLength(V * ARC_TILES.length * 3);
    expect(buf.side).toHaveLength(V * ARC_TILES.length);
    expect(buf.index).toHaveLength((6 * (S - 1) + 3) * ARC_TILES.length);
    // Index 16 bits : tous les sommets doivent y tenir.
    expect(Math.max(...buf.index)).toBeLessThan(V * ARC_TILES.length);
  });

  it('never builds a triangle spanning two tiles', () => {
    for (let k = 0; k < buf.index.length; k += 3) {
      const tiles = [buf.index[k], buf.index[k + 1], buf.index[k + 2]].map((i) => Math.floor(i / V));
      expect(new Set(tiles).size).toBe(1);
    }
  });

  it('pairs ribbon vertices on opposite sides of each sample', () => {
    for (let i = 0; i < S; i++) {
      expect([buf.side[2 * i], buf.side[2 * i + 1]]).toEqual([-1, 1]);
      expect(buf.kind[2 * i]).toBe(0);
      expect(vec3(buf.position, 2 * i)).toEqual(vec3(buf.position, 2 * i + 1));
    }
  });

  it('clamps the tangent neighbours at both ends of the ribbon', () => {
    // Origine : prev = l'échantillon lui-même ; destination : next = lui-même.
    expect(vec3(buf.prev, 0)).toEqual(vec3(buf.position, 0));
    expect(vec3(buf.next, 0)).toEqual(vec3(buf.position, 2));
    const last = 2 * (S - 1);
    expect(vec3(buf.next, last)).toEqual(vec3(buf.position, last));
    expect(vec3(buf.prev, last)).toEqual(vec3(buf.position, last - 2));
  });

  it('places the three head vertices on the destination, flagged tip / left / right', () => {
    const dest = vec3(buf.samples, S - 1);
    for (let k = 0; k < 3; k++) {
      expect(vec3(buf.position, 2 * S + k)).toEqual(dest);
      expect(buf.kind[2 * S + k]).toBe(1);
    }
    expect([buf.side[2 * S], buf.side[2 * S + 1], buf.side[2 * S + 2]]).toEqual([0, -1, 1]);
    // La destination est bien le point b, au sol (élévation nulle).
    expect(dest[0] / (Math.PI / 180)).toBeCloseTo(BERLIN.lon, 3);
    expect(dest[1] / (Math.PI / 180)).toBeCloseTo(BERLIN.lat, 3);
    expect(dest[2]).toBeCloseTo(0, 6);
  });

  it('copies the same template into each tile with its own 2π shift', () => {
    ARC_TILES.forEach((kc, ci) => {
      expect(buf.shift[ci * V]).toBeCloseTo(kc * 2 * Math.PI, 5);
      expect(buf.shift[ci * V + V - 1]).toBeCloseTo(kc * 2 * Math.PI, 5);
      expect(vec3(buf.position, ci * V + 5)).toEqual(vec3(buf.position, 5));
    });
  });

  it('raises the arc above the ground between its endpoints', () => {
    expect(buf.samples[2]).toBeCloseTo(0, 6);
    expect(buf.samples[(S >> 1) * 3 + 2]).toBeGreaterThan(0);
    expect(buf.samples[(S - 1) * 3 + 2]).toBeCloseTo(0, 6);
  });

  it('keeps the hover samples, destination included', () => {
    const lastPt = buf.pts[buf.pts.length - 1];
    expect(lastPt.lon).toBeCloseTo(buf.samples[(S - 1) * 3], 6);
    expect(Math.hypot(lastPt.u.x, lastPt.u.y, lastPt.u.z)).toBeCloseTo(1, 6);
  });
});

describe('arcHeight', () => {
  it('keeps the peak between 20 % and 30 % of the chord, depending on value', () => {
    const ang = 1.2, chord = 2 * Math.sin(ang / 2);
    expect(arcHeight(ang, 0)).toBeCloseTo(0.2 * chord, 9);
    expect(arcHeight(ang, 1)).toBeCloseTo(0.3 * chord, 9);
    expect(arcHeight(ang)).toBeCloseTo(0.25 * chord, 9);
    expect(arcHeight(ang, 7)).toBeCloseTo(arcHeight(ang, 1), 9);
  });

  it('flattens short flows instead of looping them', () => {
    // Paris -> Berlin : ~0,14 rad. L'ancienne formule imposait 0,14 rayon au moins.
    const buf = buildArcBuffers(PARIS, BERLIN, 0.5);
    const peak = buf.samples[(S >> 1) * 3 + 2];
    expect(peak).toBeLessThan(0.05);
    expect(buildArcBuffers(PARIS, TOKYO, 0.5).samples[(S >> 1) * 3 + 2]).toBeGreaterThan(5 * peak);
  });

  it('matches the former height on an antipodal arc', () => {
    expect(arcHeight(Math.PI, 0.5)).toBeCloseTo(0.5, 9);
  });
});

describe('buildArcBuffers — antimeridian', () => {
  const buf = buildArcBuffers(TOKYO, SAN_FRANCISCO, 0.5);
  const lons = Array.from({ length: S }, (_, i) => buf.samples[i * 3]);

  it('unwraps the longitude: no jump of more than π between neighbours', () => {
    for (let i = 1; i < S; i++) expect(Math.abs(lons[i] - lons[i - 1])).toBeLessThan(Math.PI);
  });

  it('crosses the antimeridian eastwards, beyond π, and lands on the destination', () => {
    expect(lons[S - 1]).toBeGreaterThan(Math.PI);
    expect(wrapPi(lons[S - 1]) / (Math.PI / 180)).toBeCloseTo(SAN_FRANCISCO.lon, 3);
  });

  it('takes midLon from the unwrapped geometry, in the Pacific', () => {
    // La moyenne naïve des longitudes brutes tomberait en Europe (~8.6°).
    const mid = wrapPi(buf.midLon) / (Math.PI / 180);
    expect(Math.abs(mid)).toBeGreaterThan(160);
    expect(buf.midLon).toBeCloseTo(lons[S >> 1], 6);
  });
});

describe('buildArcBuffers — degenerate arc', () => {
  it('stays finite when origin and destination coincide', () => {
    const buf = buildArcBuffers(PARIS, PARIS);
    expect(Array.from(buf.position).every(Number.isFinite)).toBe(true);
  });
});

describe('cumulativeLengths', () => {
  it('sums the on-screen segment lengths', () => {
    const out = new Float32Array(3);
    const total = cumulativeLengths([0, 0, 3, 4, 3, 10], 3, out);
    expect(Array.from(out)).toEqual([0, 5, 11]);
    expect(total).toBe(11);
  });
});

describe('pointAtDistance', () => {
  const samples = new Float32Array([0, 0, 0, 1, 0, 0, 1, 2, 0]);
  const dists = [0, 10, 30];

  it('interpolates between the two samples framing the distance', () => {
    expect(pointAtDistance(samples, dists, 3, 20, [0, 0, 0])).toEqual([1, 1, 0]);
    expect(pointAtDistance(samples, dists, 3, 5, [0, 0, 0])).toEqual([0.5, 0, 0]);
  });

  it('clamps outside [0, total]', () => {
    expect(pointAtDistance(samples, dists, 3, -4, [9, 9, 9])).toEqual([0, 0, 0]);
    expect(pointAtDistance(samples, dists, 3, 99, [9, 9, 9])).toEqual([1, 2, 0]);
  });
});

describe('writeArcDistances', () => {
  it('writes both edges of every sample in every tile, and the total on the head', () => {
    const n = 3, v = arcTileVertexCount(n);
    const attr = new Float32Array(v * ARC_TILES.length);
    writeArcDistances(attr, [0, 5, 11], 11, n);
    for (let ci = 0; ci < ARC_TILES.length; ci++) {
      expect(Array.from(attr.subarray(ci * v, (ci + 1) * v))).toEqual([0, 0, 5, 5, 11, 11, 11, 11, 11]);
    }
  });
});
