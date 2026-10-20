// Importation des modules
import { describe, expect, it } from 'vitest';
import { reduceValues, clientAggregation, isAdditive } from './aggregate';
import { buildStacks } from './stacking';

// =================================================================
// TEST — RÉDUCTION DES GROUPES (client) ET RENDU DES AGRÉGATS (serveur)
// =================================================================

describe('reduceValues', () => {
  it("'none' rend la valeur telle quelle et ne combine jamais", () => {
    expect(reduceValues([42], 'none')).toBe(42);
    // Deux valeurs dans un groupe « déjà agrégé » : aucune moyenne ni somme silencieuse.
    expect(reduceValues([10, 30], 'none')).toBe(10);
  });

  it("applique chaque valeur de l'enum Aggregation", () => {
    const vals = [1, 2, 2, 7];
    expect(reduceValues(vals, 'SUM')).toBe(12);
    expect(reduceValues(vals, 'AVG')).toBe(3);
    expect(reduceValues(vals, 'MEDIAN')).toBe(2);
    expect(reduceValues(vals, 'MIN')).toBe(1);
    expect(reduceValues(vals, 'MAX')).toBe(7);
    expect(reduceValues(vals, 'COUNT')).toBe(4);
    expect(reduceValues(vals, 'MODE')).toBe(2);
  });

  it("retombe sur la moyenne par défaut et pour un nom inconnu (dont les anciens 'sum' / 'mean')", () => {
    expect(reduceValues([1, 3])).toBe(2);
    expect(reduceValues([1, 3], 'sum')).toBe(2);
    expect(reduceValues([1, 3], 'mean')).toBe(2);
  });
});

describe('clientAggregation', () => {
  const fields = [
    { name: 'population', typeFamily: 'INTEGER', defaultAggregation: 'SUM' },
    { name: 'density', typeFamily: 'NUMBER', defaultAggregation: 'AVG' },
    { name: 'score', typeFamily: 'NUMBER', defaultAggregation: null },
  ];

  it("suit l'agrégation par défaut de la colonne de valeur", () => {
    expect(clientAggregation(fields, 'population')).toBe('SUM');
    expect(clientAggregation(fields, 'density')).toBe('AVG');
  });

  it('retombe sur la moyenne historique sans métadonnée', () => {
    expect(clientAggregation(fields, 'score')).toBe('AVG');
    expect(clientAggregation(fields, 'nope')).toBe('AVG');
    expect(clientAggregation(undefined, 'population')).toBe('AVG');
  });

  it('isAdditive : seuls SUM et COUNT s\'additionnent', () => {
    expect(isAdditive('SUM')).toBe(true);
    expect(isAdditive('COUNT')).toBe(true);
    expect(isAdditive('AVG')).toBe(false);
  });
});

describe('buildStacks', () => {
  const channels = { color: 'region', style: null, marker: null };

  it("sur des agrégats ('none'), empile les valeurs du serveur sans les toucher", () => {
    const data = [
      { year: '2023', region: 'Nord', population_sum: 120 },
      { year: '2023', region: 'Sud', population_sum: 80 },
    ];
    const stacks = buildStacks({ data, posKey: 'year', valKey: 'population_sum', channels, stackBy: 'all', aggregate: 'none' });

    expect(stacks.offsets.get('Nord|2023')).toEqual({ y0: 0, y1: 120 });
    expect(stacks.offsets.get('Sud|2023')).toEqual({ y0: 120, y1: 200 });
    expect(stacks.max).toBe(200);
  });

  it('sur des lignes brutes, réduit les doublons selon l\'agrégation de la mesure', () => {
    const data = [
      { year: '2023', region: 'Nord', population: 100 },
      { year: '2023', region: 'Nord', population: 20 },
    ];
    const params = { data, posKey: 'year', valKey: 'population', channels, stackBy: 'all' };

    expect(buildStacks({ ...params, aggregate: 'SUM' }).max).toBe(120);
    expect(buildStacks({ ...params, aggregate: 'AVG' }).max).toBe(60);
  });
});
