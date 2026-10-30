import { describe, expect, it } from 'vitest';
import { valueDomain, baselineValue } from './scales';

// =================================================================
// TEST — valueDomain / baselineValue : règle du zéro de l'axe des valeurs
// =================================================================

const big = [4.2e9, 4.5e9, 4.8e9];

describe('valueDomain', () => {
  it("barres en 'auto' : ancrées à 0", () => {
    expect(valueDomain({ values: big, kind: 'bar' })).toEqual([0, 4.8e9]);
    expect(valueDomain({ values: big, kind: 'bar-h' })).toEqual([0, 4.8e9]);
  });

  it('barres à false : étendue des données, sans ancrage', () => {
    expect(valueDomain({ values: big, kind: 'bar', zeroBaseline: false })).toEqual([4.2e9, 4.8e9]);
  });

  it('pile : 0 toujours inclus, même à false', () => {
    expect(valueDomain({ values: [12], kind: 'bar', stacked: true, zeroBaseline: false })).toEqual([0, 12]);
    expect(valueDomain({ values: [12], kind: 'line', stacked: true, zeroBaseline: false })).toEqual([0, 12]);
  });

  it("courbe : étendue en 'auto', 0 inclus à true", () => {
    expect(valueDomain({ values: [5, 9], kind: 'line' })).toEqual([5, 9]);
    expect(valueDomain({ values: [5, 9], kind: 'line', zeroBaseline: true })).toEqual([0, 9]);
  });

  it("aire (multi-jeux) : ancrée en 'auto'", () => {
    expect(valueDomain({ values: [5, 9], kind: 'area' })).toEqual([0, 9]);
  });

  it('valeurs toutes négatives : 0 en borne haute pour des barres, étendue à false', () => {
    expect(valueDomain({ values: [-30, -5], kind: 'bar' })).toEqual([-30, 0]);
    expect(valueDomain({ values: [-30, -5], kind: 'bar', zeroBaseline: false })).toEqual([-30, -5]);
    expect(valueDomain({ values: [-30, -5], kind: 'line', zeroBaseline: true })).toEqual([-30, 0]);
  });

  it('extra est toujours inclus', () => {
    expect(valueDomain({ values: [5, 9], kind: 'line', extra: [2, 12] })).toEqual([2, 12]);
    expect(valueDomain({ values: big, kind: 'bar', zeroBaseline: false, extra: [4e9, 5e9] })).toEqual([4e9, 5e9]);
  });

  it('valeurs toutes égales : domaine élargi', () => {
    expect(valueDomain({ values: [7, 7], kind: 'line' })).toEqual([7, 8]);
    expect(valueDomain({ values: [0], kind: 'bar' })).toEqual([0, 1]);
  });

  it('ignore les valeurs absentes ou non numériques ; aucune valeur → [0, 1]', () => {
    expect(valueDomain({ values: [null, NaN, undefined, 3, 6], kind: 'line' })).toEqual([3, 6]);
    expect(valueDomain({ values: [], kind: 'line' })).toEqual([0, 1]);
  });
});

describe('baselineValue', () => {
  it('0 quand il est dans le domaine', () => {
    expect(baselineValue([-5, 10])).toBe(0);
    expect(baselineValue([0, 10])).toBe(0);
  });

  it('borne basse quand le domaine est au-dessus de 0', () => {
    expect(baselineValue([4e9, 5e9])).toBe(4e9);
  });

  it('borne haute quand le domaine est en dessous de 0', () => {
    expect(baselineValue([-30, -5])).toBe(-5);
  });

  it("indépendant de l'ordre des bornes", () => {
    expect(baselineValue([5e9, 4e9])).toBe(4e9);
  });
});
