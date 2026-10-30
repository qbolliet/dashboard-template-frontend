import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scaleBand, scaleLinear, scaleTime } from '@visx/scale';
import { extent } from 'd3-array';

import { resolveZoomSpec, zoomSeedSignature } from './zoomSpec';

// =================================================================
// TEST — resolveZoomSpec / zoomSeedSignature : spec de zoom initial → sélection
// =================================================================

// Échelles de base construites comme makeScale : continu « nicé », bande sur le domaine.
const timeCtx = (dates) => {
  const data = dates.map((d) => ({ t: new Date(d) }));
  return {
    type: 'date', col: 't', data,
    baseScale: scaleTime({ domain: extent(data, (r) => r.t), range: [0, 100], nice: true }),
  };
};
const numCtx = (vals) => {
  const data = vals.map((v) => ({ n: v }));
  return {
    type: 'number', col: 'n', data,
    baseScale: scaleLinear({ domain: extent(vals), range: [0, 100], nice: true }),
  };
};
const catCtx = (cats) => ({
  type: 'categorical', col: 'c', data: cats.map((c) => ({ c })),
  baseScale: scaleBand({ domain: cats, range: [0, 100] }),
});

const months = ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01', '2024-07-01'];
const ms = (sel) => sel.map((d) => d.getTime());

let warn;
beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe('resolveZoomSpec : axe date', () => {
  it('[Date, Date] → sélection de Dates, ordre normalisé', () => {
    const sel = resolveZoomSpec([new Date('2024-05-01'), new Date('2024-02-01')], timeCtx(months));
    expect(sel[0]).toBeInstanceOf(Date);
    expect(ms(sel)).toEqual([Date.parse('2024-02-01'), Date.parse('2024-05-01')]);
  });

  it('chaînes ISO → converties comme les lignes (coerce)', () => {
    const sel = resolveZoomSpec(['2024-02-01', '2024-05-01'], timeCtx(months));
    expect(ms(sel)).toEqual([Date.parse('2024-02-01'), Date.parse('2024-05-01')]);
  });

  it('{ last: 3 } → les 3 dernières dates distinctes', () => {
    const ctx = timeCtx([...months, '2024-07-01']); // doublon : compté une fois
    expect(ms(resolveZoomSpec({ last: 3 }, ctx))).toEqual([Date.parse('2024-05-01'), Date.parse('2024-07-01')]);
  });

  it('{ first: 2 } → les 2 premières dates', () => {
    expect(ms(resolveZoomSpec({ first: 2 }, timeCtx(months)))).toEqual([Date.parse('2024-01-01'), Date.parse('2024-02-01')]);
  });

  it('borne hors domaine → ramenée dans le domaine de base', () => {
    const ctx = timeCtx(months);
    const [, hi] = ctx.baseScale.domain();
    const sel = resolveZoomSpec(['2024-04-01', '2030-01-01'], ctx);
    expect(ms(sel)).toEqual([Date.parse('2024-04-01'), hi.getTime()]);
  });
});

describe('resolveZoomSpec : axe numérique', () => {
  const vals = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  it('[to, from] → [n0, n1] croissant', () => {
    expect(resolveZoomSpec([70, 20], numCtx(vals))).toEqual([20, 70]);
  });

  it('{ last: 4 } / { first: 4 }', () => {
    expect(resolveZoomSpec({ last: 4 }, numCtx(vals))).toEqual([70, 100]);
    expect(resolveZoomSpec({ first: 4 }, numCtx(vals))).toEqual([0, 30]);
  });

  it('n = 1 en continu est traité comme 2', () => {
    expect(resolveZoomSpec({ last: 1 }, numCtx(vals))).toEqual([90, 100]);
  });

  it('bornes hors domaine : ramenées, ou null si la fenêtre manque le domaine', () => {
    expect(resolveZoomSpec([-50, 30], numCtx(vals))).toEqual([0, 30]);
    expect(resolveZoomSpec([200, 300], numCtx(vals))).toBeNull();
    expect(resolveZoomSpec([-10, 500], numCtx(vals))).toBeNull(); // couvre tout le domaine
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('resolveZoomSpec : axe catégoriel', () => {
  const cats = ['A', 'B', 'C', 'D', 'E'];

  it('[cat, cat] → ordre de bande', () => {
    expect(resolveZoomSpec(['D', 'B'], catCtx(cats))).toEqual(['B', 'D']);
  });

  it('{ last: 2 } / { first: 1 } dans l’ordre de bande', () => {
    expect(resolveZoomSpec({ last: 2 }, catCtx(cats))).toEqual(['D', 'E']);
    expect(resolveZoomSpec({ first: 1 }, catCtx(cats))).toEqual(['A', 'A']);
  });

  it('catégorie absente du domaine → null', () => {
    expect(resolveZoomSpec(['B', 'Z'], catCtx(cats))).toBeNull();
  });
});

describe('resolveZoomSpec : vue complète et formes invalides', () => {
  it('n ≥ nombre de valeurs → null', () => {
    expect(resolveZoomSpec({ last: 7 }, timeCtx(months))).toBeNull();
    expect(resolveZoomSpec({ first: 9 }, numCtx([1, 2, 3]))).toBeNull();
    expect(resolveZoomSpec({ last: 5 }, catCtx(['A', 'B', 'C', 'D', 'E']))).toBeNull();
    // continu, n = 1 → 2 = nombre de valeurs
    expect(resolveZoomSpec({ last: 1 }, numCtx([1, 2]))).toBeNull();
  });

  it('spec absente → null, sans avertissement', () => {
    expect(resolveZoomSpec(undefined, numCtx([1, 2, 3]))).toBeNull();
    expect(resolveZoomSpec(null, numCtx([1, 2, 3]))).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('données vides → null, sans erreur ni avertissement', () => {
    expect(resolveZoomSpec({ last: 5 }, timeCtx([]))).toBeNull();
    expect(resolveZoomSpec(['2024-01-01', '2024-03-01'], timeCtx([]))).toBeNull();
    expect(resolveZoomSpec({ last: 2 }, catCtx([]))).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ['un nombre seul', 5],
    ['un tableau à une borne', [3]],
    ['un tableau à trois bornes', [1, 2, 3]],
    ['une borne nulle', [null, 3]],
    ['n nul', { last: 0 }],
    ['n non entier', { first: 2.5 }],
    ['n en chaîne', { last: '5' }],
    ['deux clés', { last: 2, first: 2 }],
    ['une clé inconnue', { lats: 2 }],
    ['des bornes égales', [30, 30]],
    ['une borne illisible', ['abc', 40]],
  ])('%s → null + avertissement en dev', (_, spec) => {
    expect(resolveZoomSpec(spec, numCtx([0, 10, 20, 30, 40, 50]))).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('date illisible → null + avertissement', () => {
    expect(resolveZoomSpec(['pas une date', '2024-03-01'], timeCtx(months))).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('zoomSeedSignature', () => {
  it('stable à données égales (nouvelle identité), change avec le domaine ou la spec', () => {
    const a = numCtx([3, 47]);
    const b = numCtx([3, 47]);
    const c = numCtx([3, 147]);
    expect(zoomSeedSignature({ last: 5 }, a.baseScale, 'number'))
      .toBe(zoomSeedSignature({ last: 5 }, b.baseScale, 'number'));
    expect(zoomSeedSignature({ last: 5 }, a.baseScale, 'number'))
      .not.toBe(zoomSeedSignature({ last: 5 }, c.baseScale, 'number'));
    expect(zoomSeedSignature({ last: 5 }, a.baseScale, 'number'))
      .not.toBe(zoomSeedSignature({ last: 4 }, a.baseScale, 'number'));
  });

  it('catégoriel : domaine joint, ordre compris', () => {
    const s1 = zoomSeedSignature(undefined, catCtx(['A', 'B']).baseScale, 'categorical');
    const s2 = zoomSeedSignature(undefined, catCtx(['B', 'A']).baseScale, 'categorical');
    expect(s1).not.toBe(s2);
  });
});
