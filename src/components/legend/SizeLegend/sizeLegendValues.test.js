import { describe, it, expect } from 'vitest';
import { sizeLegendValues } from './sizeLegendValues';

describe('sizeLegendValues', () => {
  it('trois valeurs arrondies, décroissantes, ≤ max', () => {
    expect(sizeLegendValues(830)).toEqual([800, 200, 50]);
    expect(sizeLegendValues(4.9)).toEqual([4, 1, 0.3]);
    expect(sizeLegendValues(1)).toEqual([1, 0.2, 0.06]);
  });

  it('aucune valeur sans maximum positif', () => {
    expect(sizeLegendValues(0)).toEqual([]);
  });
});
