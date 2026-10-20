import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// jsdom ne mesure rien : <ParentSize> resterait à largeur nulle et ne rendrait pas le graphique.
vi.mock('@visx/responsive', async (importOriginal) => ({
  ...(await importOriginal()),
  ParentSize: ({ children }) => children({ width: 800, height: 420 }),
}));

// Pas de canvas 2D sous jsdom : mesure approchée, comme le rendu serveur.
vi.mock('../../utils/measureText', async (importOriginal) => ({
  ...(await importOriginal()),
  measureText: (text, fontSize = 11) => String(text).length * fontSize * 0.6,
}));

import MultiChart from './MultiChart';
import { resolveDatasets } from '../../utils/datasetList';

// =================================================================
// TEST — <MultiChart> : MÊME AGRÉGATION QUE <Chart>, JEU PAR JEU
// =================================================================
// Rendu direct : <Chart> charge <MultiChart> par next/dynamic, donc pas de façon
// synchrone sous jsdom ; il lui transmet `fields` et `aggregate` tels quels. Barres
// empilées : le domaine de l'axe y est le cumul maximal des piles de tous les jeux, donc
// la valeur réduite de chaque barre ; la plus haute graduation la trahit.

afterEach(cleanup);

const raw = [
  { region: 'Nord', population: 10 },
  { region: 'Nord', population: 30 },
  { region: 'Sud', population: 4 },
];
const fields = (defaultAggregation) => [
  { name: 'region', typeFamily: 'TEXT', isCategorical: true },
  { name: 'population', typeFamily: 'INTEGER', isCategorical: false, defaultAggregation },
];

const maxTick = (container) => Math.max(...[...container.querySelectorAll('text')]
  .map((t) => t.textContent)
  .filter((t) => /^\d+$/.test(t))
  .map(Number));

const renderSets = (data, props) => render(
  <MultiChart data={data} x="region" y="population" stack="all" fill="fill" locale="en" {...props} />,
).container;

describe('<MultiChart> : réduction des barres', () => {
  it('lignes brutes, mesure SUM : la barre vaut la somme', () => {
    expect(maxTick(renderSets([{ label: 'A', data: raw }], { fields: fields('SUM') }))).toBe(40);
  });

  it('lignes brutes, mesure AVG : la barre vaut la moyenne', () => {
    expect(maxTick(renderSets([{ label: 'A', data: raw }], { fields: fields('AVG') }))).toBe(20);
  });

  it("agrégats déclarés par la prop aggregate : valeurs rendues telles quelles", () => {
    // Un doublon accidentel ne doit ni s'additionner (80) ni se moyenner avec autre chose.
    const aggregated = [{ region: 'Nord', population: 40 }, { region: 'Nord', population: 40 }, { region: 'Sud', population: 4 }];
    const container = renderSets([{ label: 'A', data: aggregated }], {
      fields: fields('SUM'), aggregate: { measure: 'population', aggregation: 'SUM' },
    });

    expect(maxTick(container)).toBe(40);
  });

  it('mélange un jeu agrégé (aggregate du descripteur) et un jeu brut, chacun selon sa règle', () => {
    // Jeu agrégé : 50 (le doublon à 10 n'est pas moyenné → pas 30).
    // Jeu brut, mesure AVG : (10 + 30) / 2 = 20.
    const aggregated = [{ region: 'Nord', population: 50 }, { region: 'Nord', population: 10 }];
    const container = renderSets([
      { label: 'Agrégé', data: aggregated, aggregate: { measure: 'population', aggregation: 'SUM' } },
      { label: 'Brut', data: raw },
    ], { fields: fields('AVG') });

    expect(maxTick(container)).toBe(50);
  });
});

describe('resolveDatasets', () => {
  it("l'aggregate du descripteur prime, celui de <Chart> sert de défaut", () => {
    const declared = { measure: 'population', aggregation: 'SUM' };
    const own = { measure: 'population', aggregation: 'AVG' };
    const [a, b] = resolveDatasets([{ data: [] }, { data: [], aggregate: own }], 'line', 'none', null, declared);

    expect(a.aggregate).toBe(declared);
    expect(b.aggregate).toBe(own);
    expect(resolveDatasets([{ data: [] }], 'line', 'none', null)[0].aggregate).toBeNull();
  });
});
