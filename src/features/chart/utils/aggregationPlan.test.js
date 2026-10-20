// Importation des modules
import { describe, expect, it } from 'vitest';
import factTable from '@/lib/api/fixtures/factTable.json';
import { CHART_FACT_TABLE } from '@/lib/api/fixtures/chartFactTable';
import { MACRO_CATALOG_SCHEMA } from '@/lib/api/fixtures/catalogSchema';
import { CATALOGUE_FIELD_STATS, MACRO_FIELD_STATS } from '@/lib/api/fixtures/fieldStats';
import { MOCK_OPTIONS_BY_FIELD, MOCK_OPTIONS_TREES } from '@/lib/api/fixtures/selectOptions';
import { createMockResolvers } from '@/lib/api/transports/mockResolvers';
import { aggregationMode, chartKindOf, planAggregation, toChartProps } from './aggregationPlan';
import { seriesKey } from './encoding';

// =================================================================
// TEST — QUI AGRÈGE, COMMENT, ET LE RÉSULTAT REMIS À LA FORME DE <Chart>
// =================================================================
// Le schéma reprend celui du jeu de test `geography` de l'API : population en SUM,
// densité en AVG.

const GEOGRAPHY = [
  { name: 'region', label: 'Région', typeFamily: 'TEXT', isCategorical: true },
  { name: 'departement', label: 'Département', typeFamily: 'TEXT', isCategorical: true },
  { name: 'date', label: 'Date', typeFamily: 'DATE', isCategorical: false },
  { name: 'year', label: 'Année', typeFamily: 'INTEGER', isCategorical: false },
  { name: 'population', label: 'Population', typeFamily: 'INTEGER', isCategorical: false, defaultAggregation: 'SUM' },
  { name: 'density', label: 'Densité', typeFamily: 'NUMBER', isCategorical: false, defaultAggregation: 'AVG' },
];

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

// Exécute un plan contre le mock, comme le ferait useAggregates (variables jointes).
const run = (plan, catalog = 'catalogue') => {
  const request = { groupBy: plan.groupBy, aggregates: plan.aggregates, format: plan.format, includeRowCount: false };
  return { ...resolvers.getAggregates({ catalog, ...request }), request };
};

describe('aggregationMode / chartKindOf', () => {
  it.each([
    ['bar', 'line', 'server'],
    ['bar-h', 'fill', 'server'],
    ['heatmap', 'fill', 'server'],
    ['line', 'line', 'server'],
    ['line', 'none', 'client'], // nuage de points : les observations elles-mêmes
    ['violin-v', 'fill', 'client'],
    ['violin-h', 'fill', 'client'],
    ['density', 'fill', 'client'],
    [null, 'line', 'client'],
  ])('%s (fill %s) → %s', (chartKind, fill, expected) => {
    expect(aggregationMode({ chartKind, fill })).toBe(expected);
  });

  it('détecte le type de graphique sur les seules métadonnées', () => {
    expect(chartKindOf({ x: 'region', y: 'population', fields: GEOGRAPHY })).toBe('bar');
    expect(chartKindOf({ x: 'population', y: 'region', fields: GEOGRAPHY })).toBe('bar-h');
    expect(chartKindOf({ x: 'date', y: 'population', fields: GEOGRAPHY })).toBe('line');
    expect(chartKindOf({ x: 'region', y: 'departement', z: 'population', fields: GEOGRAPHY })).toBe('heatmap');
    expect(chartKindOf({ x: 'region', y: 'population', z: 'density', fields: GEOGRAPHY })).toBe('violin-v');
    expect(chartKindOf({ x: 'date', y: 'population', categoricalX: true, fields: GEOGRAPHY })).toBe('bar');
  });

  it("renonce (null) quand une colonne tracée n'est pas décrite", () => {
    expect(chartKindOf({ x: 'region', y: 'nope', fields: GEOGRAPHY })).toBeNull();
    expect(chartKindOf({ x: 'region', y: 'population' })).toBeNull();
  });
});

describe('planAggregation', () => {
  it('barres : groupe par x puis hue, mesure en y, agrégation laissée à la métadonnée', () => {
    const plan = planAggregation({ x: 'region', y: 'population', hue: 'departement', fields: GEOGRAPHY });

    expect(plan).toMatchObject({
      chartKind: 'bar',
      valueAxis: 'y',
      groupBy: [{ field: 'region' }, { field: 'departement' }],
      aggregates: [{ measure: 'population' }],
      format: 'OBJECTS',
      hue: ['departement'],
    });
    // Aucune agrégation imposée : l'API applique la defaultAggregation (SUM ici, AVG
    // pour la densité) — basculer la mesure ne demande aucun code.
    expect(plan.aggregates[0]).not.toHaveProperty('aggregation');
  });

  it("ligne : la date prend le grain, une autre colonne n'en prend jamais", () => {
    const plan = planAggregation({ x: 'date', y: 'population', hue: 'region', fields: GEOGRAPHY, grain: 'MONTH' });
    expect(plan.groupBy).toEqual([{ field: 'date', grain: 'MONTH' }, { field: 'region' }]);

    const numericX = planAggregation({ x: 'year', y: 'population', fields: GEOGRAPHY, grain: 'MONTH' });
    expect(numericX.groupBy).toEqual([{ field: 'year' }]);
  });

  it('barres horizontales : la position est y, la mesure x', () => {
    const plan = planAggregation({ x: 'population', y: 'region', fields: GEOGRAPHY, fill: 'fill' });
    expect(plan).toMatchObject({ chartKind: 'bar-h', valueAxis: 'x', posCol: 'region', groupBy: [{ field: 'region' }] });
  });

  it('heatmap : une cellule par (x, y), mesure z, pas de série', () => {
    const plan = planAggregation({ x: 'region', y: 'departement', z: 'population', fields: GEOGRAPHY });
    expect(plan).toMatchObject({
      chartKind: 'heatmap', valueAxis: 'z',
      groupBy: [{ field: 'region' }, { field: 'departement' }],
      aggregates: [{ measure: 'population' }],
    });
  });

  it('plusieurs mesures : format LONG, hue = measure puis les séries', () => {
    const plan = planAggregation({ x: 'date', measures: ['population', 'density'], hue: 'region', fields: GEOGRAPHY });

    expect(plan.format).toBe('LONG');
    expect(plan.hue).toEqual(['measure', 'region']);
    expect(plan.aggregates).toEqual([{ measure: 'population' }, { measure: 'density' }]);
  });

  it("plusieurs mesures et trois hue : la colonne en trop n'est pas regroupée", () => {
    const fields = [...GEOGRAPHY, { name: 'a', typeFamily: 'TEXT', isCategorical: true }];
    const plan = planAggregation({
      x: 'date', measures: ['population', 'density'], hue: ['region', 'departement', 'a'], fields,
    });

    expect(plan.hue).toEqual(['measure', 'region', 'departement']);
    expect(plan.groupBy.map((g) => g.field)).toEqual(['date', 'region', 'departement']);
  });

  it.each([
    ['nuage', { x: 'date', y: 'population', fill: 'none' }],
    ['violon', { x: 'region', y: 'population', z: 'density' }],
    ['densité', { x: 'date', y: 'population', z: 'density' }],
  ])('%s : lignes brutes (null)', (_, params) => {
    expect(planAggregation({ ...params, fields: GEOGRAPHY })).toBeNull();
  });
});

describe('toChartProps', () => {
  // Le catalogue documentaire : montant (SUM) et observations (AVG) par secteur / statut.
  const CATALOGUE = factTable.columnsMetadata;

  it('OBJECTS : y = alias, champ synthétique typé et formaté par l\'AggregateColumn', () => {
    const plan = planAggregation({ x: 'sector', y: 'montant', fields: CATALOGUE });
    const props = toChartProps(run(plan), plan);

    expect(props.y).toBe('montant_sum');
    expect(props.aggregate).toEqual({ measure: 'montant', aggregation: 'SUM' });
    expect(props.fields.find((f) => f.name === 'montant_sum')).toMatchObject({
      typeFamily: 'NUMBER', isCategorical: false, unit: '€', displayFormat: ',.0f',
    });
    expect(props.labels).toMatchObject({ x: 'Secteur', y: 'Montant (somme)' });
  });

  it("COUNT : champ entier au format `,d`, sans unité", () => {
    const plan = planAggregation({
      x: 'sector', measures: [{ measure: 'montant', aggregation: 'COUNT' }], fields: CATALOGUE,
    });
    const props = toChartProps(run(plan), plan);

    expect(props.fields.find((f) => f.name === props.y)).toMatchObject({ typeFamily: 'INTEGER', unit: null, displayFormat: ',d' });
  });

  it('LONG : y = value, séries nommées par le libellé de chaque mesure', () => {
    const plan = planAggregation({ x: 'sector', measures: ['montant', 'observations'], fields: CATALOGUE });
    const props = toChartProps(run(plan), plan, {
      aggregateAxis: '{label} ({aggregation})',
      measureSeries: 'Mesure',
      aggregations: { SUM: 'somme', AVG: 'moyenne' },
    });

    expect(props.y).toBe('value');
    expect(props.hue).toEqual(['measure']);
    expect(new Set(props.data.map((r) => r.measure))).toEqual(new Set(['Montant', 'Observations']));
    expect(props.aggregate).toEqual([
      { measure: 'montant', aggregation: 'SUM' },
      { measure: 'observations', aggregation: 'AVG' },
    ]);
    expect(props.labels).toMatchObject({ color: 'Mesure', y: 'Montant (somme), Observations (moyenne)' });
    // Unités différentes (€ / aucune) : pas d'unité commune sur l'axe.
    expect(props.fields.find((f) => f.name === 'value')).toMatchObject({ unit: null, displayFormat: null });
  });

  it('lit un résultat gardé à l\'écran avec SON format, pas celui du plan en cours', () => {
    const objectsPlan = planAggregation({ x: 'sector', y: 'montant', fields: CATALOGUE });
    const longPlan = planAggregation({ x: 'sector', measures: ['montant', 'observations'], fields: CATALOGUE });
    const props = toChartProps(run(objectsPlan), longPlan);

    expect(props.y).toBe('montant_sum');
    expect(props.hue).toBeUndefined();
  });

  it('écarte un résultat périmé dont la position a changé', () => {
    const plan = planAggregation({ x: 'sector', y: 'montant', fields: CATALOGUE });
    const other = planAggregation({ x: 'status', y: 'montant', fields: CATALOGUE });

    expect(toChartProps(run(plan), other)).toBeNull();
  });

  // Garantie d'absence de double agrégation : chaque ligne rendue est seule dans son
  // groupe (position × séries hue), donc la réduction 'none' de <Chart> la lit telle quelle.
  it.each([
    ['barres', { x: 'sector', y: 'montant' }],
    ['barres + hue', { x: 'sector', y: 'montant', hue: 'status' }],
    ['plusieurs mesures + hue', { x: 'sector', measures: ['montant', 'observations'], hue: 'status' }],
    ['barres horizontales', { x: 'montant', y: 'sector', fill: 'fill' }],
    ['heatmap', { x: 'sector', y: 'status', z: 'montant' }],
  ])('%s : une seule ligne par groupe', (_, params) => {
    const plan = planAggregation({ ...params, fields: CATALOGUE });
    const props = toChartProps(run(plan), plan);
    const hue = props.hue ?? [];
    const channels = { color: hue[0] ?? null, style: hue[1] ?? null, marker: hue[2] ?? null };
    const keys = props.data.map((row) => (plan.chartKind === 'heatmap'
      ? `${row[props.x]}|${row[props.y]}`
      : `${row[plan.posCol]}|${seriesKey(row, channels)}`));

    expect(new Set(keys).size).toBe(props.data.length);
  });

  it("ligne datée du panel macro : grain MONTH, valeurs égales aux lignes (AVG d'une ligne)", () => {
    const plan = planAggregation({
      x: 'date_obs', y: 'gdp', hue: 'country', fields: MACRO_CATALOG_SCHEMA, grain: 'MONTH',
    });
    const props = toChartProps(run(plan, 'macro'), plan);

    expect(props.aggregate).toEqual({ measure: 'gdp', aggregation: 'AVG' });
    expect(props.data).toHaveLength(CHART_FACT_TABLE.data.length);
    const france = props.data.find((r) => r.country === 'France' && r.date_obs === '2023-04-01');
    expect(france.gdp_avg).toBe(100.8);
  });
});
