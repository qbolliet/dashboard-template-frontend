// Importation des modules
import { describe, expect, it } from 'vitest';
import { detectChart, layoutKindOf } from './typeDetection';

// =================================================================
// TEST — CHOIX DU KIND DE GRAPHIQUE ET KIND DE MISE EN PAGE
// =================================================================

const Z = { zType: 'number', hasZ: true };

describe('detectChart', () => {
  it.each([
    ['categorical', 'categorical', 'heatmap'],
    ['categorical', 'number', 'violin-v'],
    ['categorical', 'date', 'violin-v'],
    ['number', 'categorical', 'violin-h'],
    ['date', 'categorical', 'violin-h'],
    ['number', 'number', 'density'],
    ['date', 'number', 'density'],
  ])("z sans zMark : %s × %s → %s (comportement historique)", (xType, yType, expected) => {
    expect(detectChart({ xType, yType, ...Z })).toBe(expected);
    expect(detectChart({ xType, yType, ...Z, zMark: 'density' })).toBe(expected);
  });

  it.each([
    ['categorical', 'categorical'],
    ['categorical', 'number'],
    ['number', 'categorical'],
    ['number', 'number'],
    ['date', 'number'],
  ])("zMark 'bubble' : %s × %s → un seul kind 'bubble'", (xType, yType) => {
    expect(detectChart({ xType, yType, ...Z, zMark: 'bubble' })).toBe('bubble');
  });

  it('sans z, zMark est sans effet', () => {
    expect(detectChart({ xType: 'categorical', yType: 'number', hasZ: false, zMark: 'bubble' })).toBe('bar');
    expect(detectChart({ xType: 'number', yType: 'number', hasZ: false, zMark: 'bubble' })).toBe('line');
  });

  it('lève une erreur sur un z non numérique ou un zMark inconnu', () => {
    expect(() => detectChart({ xType: 'number', yType: 'number', zType: 'categorical', hasZ: true })).toThrow(/z/);
    expect(() => detectChart({ xType: 'number', yType: 'number', ...Z, zMark: 'scatter' })).toThrow(/zMark/);
  });
});

describe('layoutKindOf', () => {
  it.each([
    ['categorical', 'categorical', 'heatmap'],
    ['categorical', 'number', 'violin-v'],
    ['number', 'categorical', 'violin-h'],
    ['date', 'number', 'density'],
  ])("'bubble' sur %s × %s se met en page comme '%s'", (xType, yType, expected) => {
    expect(layoutKindOf('bubble', xType, yType)).toBe(expected);
  });

  it('tout autre kind se met en page comme lui-même', () => {
    expect(layoutKindOf('bar', 'categorical', 'number')).toBe('bar');
    expect(layoutKindOf('heatmap', 'categorical', 'categorical')).toBe('heatmap');
    expect(layoutKindOf(null, 'number', 'number')).toBeNull();
  });
});
