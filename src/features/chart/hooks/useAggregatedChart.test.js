// Importation des modules
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import factTable from '@/lib/api/fixtures/factTable.json';
import { useAggregatedChart } from './useAggregatedChart';

// =================================================================
// TEST — useAggregatedChart CONTRE LE TRANSPORT MOCK
// =================================================================
// Équivalent mock du critère d'acceptation sur le schéma `geography` : des barres de
// montant (SUM) par secteur valent la somme sur TOUT le jeu (20 lignes, pas une page de
// 5) ; basculer la mesure sur observations (AVG) change l'agrégation sans autre code.

// Cache SWR isolé par test : sans lui, les réponses d'un test fuiraient dans le suivant.
const wrapper = ({ children }) => createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const CATALOGUE = factTable.columnsMetadata;
const sumBy = (column, reduce) => {
  const groups = new Map();
  for (const row of factTable.data) {
    if (!groups.has(row.sector)) groups.set(row.sector, []);
    groups.get(row.sector).push(row[column]);
  }
  return Object.fromEntries([...groups].map(([k, vs]) => [k, reduce(vs)]));
};
const total = (vs) => vs.reduce((a, b) => a + b, 0);

describe('useAggregatedChart', () => {
  it('barres : valeurs de getAggregates sur tout le jeu, agrégation par défaut de la mesure', async () => {
    // Seule une page de 5 lignes est « chargée » : le graphique ne doit pas s'en servir.
    const page = factTable.data.slice(0, 5);
    const { result } = renderHook(() => useAggregatedChart({
      x: 'sector', measures: ['montant'], fields: CATALOGUE, rows: page, catalog: 'catalogue',
    }), { wrapper });

    expect(result.current.mode).toBe('server');
    await waitFor(() => expect(result.current.chartProps.data.length).toBeGreaterThan(0));

    const { data, y, aggregate } = result.current.chartProps;
    expect(aggregate).toEqual({ measure: 'montant', aggregation: 'SUM' });
    expect(Object.fromEntries(data.map((r) => [r.sector, r[y]]))).toEqual(sumBy('montant', total));
    expect(result.current.truncated).toBe(false);
  });

  it('basculer la mesure sur une mesure AVG change l\'agrégation, sans code propre', async () => {
    const { result, rerender } = renderHook(({ measure }) => useAggregatedChart({
      x: 'sector', measures: [measure], fields: CATALOGUE, catalog: 'catalogue',
    }), { wrapper, initialProps: { measure: 'montant' } });

    await waitFor(() => expect(result.current.chartProps.aggregate?.aggregation).toBe('SUM'));
    rerender({ measure: 'observations' });
    await waitFor(() => expect(result.current.chartProps.aggregate?.aggregation).toBe('AVG'));

    const { data, y } = result.current.chartProps;
    expect(y).toBe('observations_avg');
    expect(Object.fromEntries(data.map((r) => [r.sector, r[y]])))
      .toEqual(sumBy('observations', (vs) => total(vs) / vs.length));
  });

  it('nuage de points : lignes brutes, aucune requête d\'agrégats', () => {
    const rows = factTable.data.slice(0, 3);
    const { result } = renderHook(() => useAggregatedChart({
      x: 'observations', measures: ['montant'], fields: CATALOGUE, fill: 'none', rows, catalog: 'catalogue',
    }), { wrapper });

    expect(result.current).toMatchObject({ mode: 'client', loading: false, error: null });
    expect(result.current.chartProps).toMatchObject({ data: rows, x: 'observations', y: 'montant' });
  });

  it("propage l'erreur de l'API sans données de repli", async () => {
    const { result } = renderHook(() => useAggregatedChart({
      x: 'sector', measures: [{ measure: 'montant', aggregation: 'MODE' }, { measure: 'sector' }],
      fields: CATALOGUE, catalog: 'catalogue',
    }), { wrapper });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.chartProps.data).toEqual([]);
  });
});
