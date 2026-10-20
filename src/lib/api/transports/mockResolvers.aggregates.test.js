// Importation des modules
import { describe, expect, it } from 'vitest';
import factTable from '../fixtures/factTable.json';
import { CHART_FACT_TABLE } from '../fixtures/chartFactTable';
import { MACRO_CATALOG_SCHEMA } from '../fixtures/catalogSchema';
import { CATALOGUE_FIELD_STATS, MACRO_FIELD_STATS } from '../fixtures/fieldStats';
import { MOCK_OPTIONS_BY_FIELD, MOCK_OPTIONS_TREES } from '../fixtures/selectOptions';
import { createMockResolvers } from './mockResolvers';

// =================================================================
// TEST — getAggregates DU MOCK (contrat de l'API)
// =================================================================
// Le catalogue documentaire tient le rôle du schéma de test `geography` de l'API :
// `montant` est déclaré SUM, `observations` AVG. Les attendus sont recalculés à partir
// des lignes de la fixture, jamais recopiés.

const resolvers = createMockResolvers({
  catalogueId: 'catalogue',
  factTable,
  CHART_FACT_TABLE,
  MACRO_CATALOG_SCHEMA,
  CATALOGUE_FIELD_STATS,
  MACRO_FIELD_STATS,
  MOCK_OPTIONS_BY_FIELD,
  MOCK_OPTIONS_TREES,
});

const aggregates = (args) => resolvers.getAggregates({ catalog: 'catalogue', ...args });

// Somme / moyenne d'une colonne par secteur, sur toutes les lignes de la fixture.
const bySector = (column, reduce) => {
  const groups = new Map();
  for (const row of factTable.data) {
    if (!groups.has(row.sector)) groups.set(row.sector, []);
    groups.get(row.sector).push(row[column]);
  }
  return Object.fromEntries([...groups].map(([sector, values]) => [sector, reduce(values)]));
};
const sum = (vs) => vs.reduce((a, b) => a + b, 0);
const avg = (vs) => sum(vs) / vs.length;
const asMap = (data, alias) => Object.fromEntries(data.map((row) => [row.sector, row[alias]]));

describe('getAggregates (mock)', () => {
  it("applique l'agrégation par défaut de la mesure : SUM pour montant, sur tout le jeu", () => {
    const result = aggregates({ groupBy: [{ field: 'sector' }], aggregates: [{ measure: 'montant' }] });

    expect(result.aggregates[0]).toMatchObject({
      alias: 'montant_sum', measure: 'montant', aggregation: 'SUM', unit: '€', displayFormat: ',.0f',
    });
    expect(asMap(result.data, 'montant_sum')).toEqual(bySector('montant', sum));
    // Les 20 lignes comptent, pas une page de faits.
    expect(result.data.reduce((acc, row) => acc + row.row_count, 0)).toBe(factTable.data.length);
  });

  it('applique AVG pour observations, et un argument explicite prime sur le défaut', () => {
    const avgResult = aggregates({ groupBy: [{ field: 'sector' }], aggregates: [{ measure: 'observations' }] });
    expect(avgResult.aggregates[0]).toMatchObject({ alias: 'observations_avg', aggregation: 'AVG', sqlType: 'DOUBLE' });
    expect(asMap(avgResult.data, 'observations_avg')).toEqual(bySector('observations', avg));

    const explicit = aggregates({
      groupBy: [{ field: 'sector' }], aggregates: [{ measure: 'observations', aggregation: 'SUM', alias: 'obs' }],
    });
    expect(explicit.aggregates[0]).toMatchObject({ alias: 'obs', aggregation: 'SUM', sqlType: 'HUGEINT' });
    expect(asMap(explicit.data, 'obs')).toEqual(bySector('observations', sum));
  });

  it('agrège le jeu filtré, pas la page', () => {
    const result = aggregates({
      groupBy: [{ field: 'sector' }],
      aggregates: [{ measure: 'montant' }],
      structuredFilters: { children: [{ criterion: { variable: 'source', operation: 'EQ', value: 'INSEE' } }] },
    });
    const insee = factTable.data.filter((row) => row.source === 'INSEE');

    expect(result.data.reduce((acc, row) => acc + row.montant_sum, 0)).toBe(sum(insee.map((r) => r.montant)));
  });

  it('COUNT : format `,d`, sans unité, une seule ligne sans groupBy', () => {
    const result = aggregates({ aggregates: [{ measure: 'montant', aggregation: 'COUNT' }] });

    expect(result.aggregates[0]).toMatchObject({ unit: null, displayFormat: ',d', sqlType: 'BIGINT' });
    expect(result.data).toEqual([{ montant_count: 20, row_count: 20 }]);
    expect(result.total).toBe(1);
  });

  it('tronque une date au grain demandé', () => {
    const result = resolvers.getAggregates({
      groupBy: [{ field: 'date_obs', grain: 'YEAR' }, { field: 'country' }],
      aggregates: [{ measure: 'gdp' }],
      includeRowCount: false,
    });

    expect(result.groupBy[0]).toMatchObject({ name: 'date_obs', grain: 'YEAR', labelColumn: null });
    expect(result.columns).toEqual(['date_obs', 'country', 'gdp_avg']);
    // Trois pays × deux années ; 2024 ne porte que deux trimestres.
    expect(result.data).toHaveLength(6);
    const france2024 = CHART_FACT_TABLE.data
      .filter((r) => r.country === 'France' && r.date_obs.startsWith('2024')).map((r) => r.gdp);
    expect(result.data.find((r) => r.date_obs === '2024-01-01' && r.country === 'France').gdp_avg)
      .toBeCloseTo(avg(france2024));
  });

  it('MONTH sur une date déjà mensuelle laisse une valeur par groupe', () => {
    const result = resolvers.getAggregates({
      groupBy: [{ field: 'date_obs', grain: 'MONTH' }, { field: 'country' }],
      aggregates: [{ measure: 'gdp' }],
    });

    expect(result.data).toHaveLength(CHART_FACT_TABLE.data.length);
    expect(result.data.every((r) => r.row_count === 1)).toBe(true);
  });

  it('format LONG : une ligne par (groupe, agrégat), dans l\'ordre des agrégats', () => {
    const result = aggregates({
      groupBy: [{ field: 'sector' }],
      aggregates: [{ measure: 'montant' }, { measure: 'observations' }],
      format: 'LONG',
      includeRowCount: false,
    });
    const sectors = new Set(factTable.data.map((r) => r.sector));

    expect(result.columns).toEqual(['sector', 'measure', 'value']);
    expect(result.data).toHaveLength(sectors.size * 2);
    expect(result.data.slice(0, 2).map((r) => r.measure)).toEqual(['montant_sum', 'observations_avg']);
    expect(result.total).toBe(sectors.size);
  });

  it('trie, puis départage sur les colonnes de groupe, et pagine les groupes', () => {
    const result = aggregates({
      groupBy: [{ field: 'sector' }],
      aggregates: [{ measure: 'montant' }],
      sort: [{ by: 'montant_sum', order: 'DESC' }],
      limit: 2,
    });
    const expected = Object.entries(bySector('montant', sum)).sort((a, b) => b[1] - a[1]).slice(0, 2);

    expect(result.data.map((r) => r.sector)).toEqual(expected.map(([sector]) => sector));
    expect(result.hasNextPage).toBe(true);
  });

  it('pose une colonne de libellés sur un code qui en a, jamais avec un grain', () => {
    const result = resolvers.getAggregates({ groupBy: [{ field: 'region' }], aggregates: [{ measure: 'gdp' }] });

    expect(result.groupBy[0].labelColumn).toBe('region__label');
    expect(result.columns).toContain('region__label');
  });

  it('refuse les arguments invalides avec BAD_USER_INPUT', () => {
    const expectBadInput = (args) => {
      expect(() => aggregates(args)).toThrow();
      try { aggregates(args); } catch (err) { expect(err.code).toBe('BAD_USER_INPUT'); }
    };

    expectBadInput({ aggregates: [{ measure: 'nope' }] });
    expectBadInput({ groupBy: [{ field: 'sector', grain: 'MONTH' }], aggregates: [{ measure: 'montant' }] });
    expectBadInput({ groupBy: [{ field: 'lastUpdate', grain: 'HOUR' }], aggregates: [{ measure: 'montant' }] });
    expectBadInput({ aggregates: [{ measure: 'sector' }] });
    expectBadInput({ aggregates: [{ measure: 'sector', aggregation: 'SUM' }] });
    expectBadInput({ aggregates: [] });
    expectBadInput({ groupBy: [{ field: 'sector' }, { field: 'sector' }], aggregates: [{ measure: 'montant' }] });
    expectBadInput({ aggregates: [{ measure: 'montant' }], sort: [{ by: 'nope' }] });
  });
});
