// Importation des modules
import { describe, expect, it } from 'vitest';
import { scaleBand, scaleLinear } from '@visx/scale';
import {
  bubbleArea, bubbleMaxRadius, bubbleValues, bubbleZMax, layoutBubbles,
} from './bubble';
import { dodgeScale, dodgeSlot } from './dodge';

// =================================================================
// TEST — GÉOMÉTRIE DES BULLES : AIRE ∝ z, RAYON MAXIMAL, POSITION, DODGE
// =================================================================

const NO_HUE = { color: null, style: null, marker: null };
const band = (domain, length = 400) => scaleBand({ domain, range: [0, length], padding: 0 });
const linear = (domain, range = [0, 400]) => scaleLinear({ domain, range });

describe('bubbleArea', () => {
  const areaOf = bubbleArea({ zMax: 100, rMax: 20 });

  it("l'aire est linéaire en z : doubler z double l'aire (et non le rayon)", () => {
    expect(areaOf(50)).toBeCloseTo(2 * areaOf(25));
    expect(areaOf(100)).toBeCloseTo(4 * areaOf(25));
  });

  it('zMax remplit le disque de rayon rMax', () => {
    expect(areaOf(100)).toBeCloseTo(Math.PI * 20 * 20);
  });

  it('z ≤ 0, null, vide ou non numérique : rien à dessiner', () => {
    for (const z of [0, -3, null, undefined, '', 'abc', NaN]) expect(areaOf(z)).toBeNull();
  });

  it('domaine vide ou rayon nul : rien à dessiner', () => {
    expect(bubbleArea({ zMax: 0, rMax: 20 })(5)).toBeNull();
    expect(bubbleArea({ zMax: 10, rMax: 0 })(5)).toBeNull();
  });
});

describe('bubbleMaxRadius', () => {
  it('deux axes continus : le token seul', () => {
    expect(bubbleMaxRadius({ xScale: linear([0, 1]), yScale: linear([0, 1]), tokenPx: 24 })).toBe(24);
  });

  it('axe en bande : plafonné à la demi-bande', () => {
    // 4 bandes de 40 px → 20 px au plus
    const xScale = band(['a', 'b', 'c', 'd'], 160);
    expect(bubbleMaxRadius({ xScale, yScale: linear([0, 1]), tokenPx: 24 })).toBe(20);
    expect(bubbleMaxRadius({ xScale, yScale: linear([0, 1]), tokenPx: 12 })).toBe(12);
  });

  it('dodge : plafonné au demi-slot de la série le long de l\'axe de dodge', () => {
    const xScale = band(['a', 'b'], 400);
    const keys = ['s1', 's2', 's3'];
    const slot = dodgeScale(keys, 200).bandwidth();
    expect(bubbleMaxRadius({ xScale, yScale: linear([0, 1]), dodgeKeys: keys, tokenPx: 100 })).toBeCloseTo(slot / 2);
  });

  it('deux axes en bande : la plus petite demi-bande', () => {
    const r = bubbleMaxRadius({ xScale: band(['a', 'b'], 400), yScale: band(['u', 'v', 'w', 'x'], 80), tokenPx: 100 });
    expect(r).toBe(10);
  });

  it('token inconnu sur deux axes continus : rayon nul (rien à dessiner)', () => {
    expect(bubbleMaxRadius({ xScale: linear([0, 1]), yScale: linear([0, 1]), tokenPx: null })).toBe(0);
  });
});

describe('bubbleValues / bubbleZMax', () => {
  const rows = [
    { x: 'a', y: 'u', z: 10 },
    { x: 'a', y: 'u', z: 30 },
    { x: 'b', y: 'u', z: -5 },
    { x: 'b', y: 'v', z: null },
  ];

  it('une valeur par ligne hors cellules (z null écarté)', () => {
    expect(bubbleValues({ data: rows, x: 'x', y: 'y', z: 'z', channels: NO_HUE }).map((b) => b.z)).toEqual([10, 30, -5]);
  });

  it('cellules : réduction par (x, y, série), comme une case de heatmap', () => {
    const sum = bubbleValues({ data: rows, x: 'x', y: 'y', z: 'z', channels: NO_HUE, cells: true, reduce: 'SUM' });
    expect(sum.map((b) => b.z)).toEqual([40, -5]);
    // Agrégats de l'API : la valeur est lue telle quelle
    const asIs = bubbleValues({ data: rows, x: 'x', y: 'y', z: 'z', channels: NO_HUE, cells: true, reduce: 'none' });
    expect(asIs[0].z).toBe(10);
  });

  it('zMax = plus grand z positif, 0 sans valeur positive', () => {
    expect(bubbleZMax({ data: rows, x: 'x', y: 'y', z: 'z', channels: NO_HUE })).toBe(30);
    expect(bubbleZMax({ data: [{ x: 1, y: 1, z: -1 }], x: 'x', y: 'y', z: 'z', channels: NO_HUE })).toBe(0);
  });
});

describe('layoutBubbles', () => {
  const params = (data, extra = {}) => ({
    data, x: 'x', y: 'y', z: 'z', channels: NO_HUE,
    areaOf: bubbleArea({ zMax: 100, rMax: 10 }), ...extra,
  });

  it('axe continu : valeur exacte ; axe en bande : centre de bande', () => {
    const xScale = band(['a', 'b'], 200);
    const yScale = linear([0, 10], [100, 0]);
    const [b] = layoutBubbles({ ...params([{ x: 'b', y: 5, z: 50 }]), xScale, yScale });
    expect(b.px).toBe(150);
    expect(b.py).toBe(50);
  });

  it('plus grandes d\'abord, z ≤ 0 et hors domaine écartés', () => {
    const xScale = band(['a'], 100);
    const yScale = linear([0, 10]);
    const out = layoutBubbles({
      ...params([
        { x: 'a', y: 1, z: 5 }, { x: 'a', y: 2, z: 80 }, { x: 'a', y: 3, z: 0 },
        { x: 'zz', y: 4, z: 90 }, { x: 'a', y: 5, z: 20 },
      ]),
      xScale, yScale,
    });
    expect(out.map((b) => b.z)).toEqual([80, 20, 5]);
  });

  it('dodge : chaque série au centre de son slot, mêmes positions que dodgeSlot', () => {
    const xScale = band(['a'], 300);
    const yScale = linear([0, 10]);
    const channels = { color: 'g', style: null, marker: null };
    const keys = ['g1', 'g2'];
    const out = layoutBubbles({
      ...params([{ x: 'a', y: 1, z: 10, g: 'g1' }, { x: 'a', y: 1, z: 10, g: 'g2' }], { channels }),
      xScale, yScale, dodgeKeys: keys,
    });
    const sub = dodgeScale(keys, 300);
    const expected = keys.map((key) => dodgeSlot({ bandStart: 0, bandwidth: 300, subScale: sub, key }).center);
    expect(out.map((b) => b.px).sort((a, b) => a - b)).toEqual(expected);
    expect(expected[0]).not.toBe(expected[1]);
  });
});

describe('dodgeSlot', () => {
  it('sans sous-échelle : la bande entière', () => {
    expect(dodgeSlot({ bandStart: 10, bandwidth: 40, subScale: null, key: 'x' })).toEqual({ center: 30, slotStart: 10, slotW: 40 });
  });
});
