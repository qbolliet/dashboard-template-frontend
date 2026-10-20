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

import Chart from './Chart';

// =================================================================
// TEST — <Chart> : AGRÉGATION PAR DÉFAUT DE LA MESURE ET AGRÉGATS DE L'API
// =================================================================
// Barres empilées : le domaine de l'axe y est le cumul maximal des piles, donc la valeur
// réduite de chaque barre. Les graduations le trahissent : 40 n'existe que si la barre
// « Nord » vaut 10 + 30.

afterEach(cleanup);

const raw = [
  { region: 'Nord', population: 10 },
  { region: 'Nord', population: 30 },
  { region: 'Sud', population: 4 },
];
const field = (defaultAggregation) => [
  { name: 'region', typeFamily: 'TEXT', isCategorical: true },
  { name: 'population', typeFamily: 'INTEGER', isCategorical: false, defaultAggregation },
];

const yTicks = (container) => [...container.querySelectorAll('text')]
  .map((t) => t.textContent)
  .filter((t) => /^\d+$/.test(t))
  .map(Number);

const renderBars = (props) => render(
  <Chart x="region" y="population" stack="all" fill="fill" locale="en" {...props} />,
).container;

describe('<Chart> : réduction des barres', () => {
  it('lignes brutes, mesure SUM : la barre vaut la somme', () => {
    expect(Math.max(...yTicks(renderBars({ data: raw, fields: field('SUM') })))).toBe(40);
  });

  it('lignes brutes, mesure AVG : la barre vaut la moyenne', () => {
    expect(Math.max(...yTicks(renderBars({ data: raw, fields: field('AVG') })))).toBe(20);
  });

  it("agrégats de l'API : la valeur du serveur est rendue telle quelle, sans ré-agrégation", () => {
    // Une ligne par barre, valeur déjà sommée par l'API (40) : la ré-agréger en moyenne
    // (ancien comportement) ou la sommer à nouveau ne changerait rien ici — d'où le
    // second cas, où un doublon accidentel ne doit PAS gonfler la barre.
    const aggregated = [{ region: 'Nord', population_sum: 40 }, { region: 'Sud', population_sum: 4 }];
    const fields = [
      { name: 'region', typeFamily: 'TEXT', isCategorical: true },
      { name: 'population_sum', typeFamily: 'INTEGER', isCategorical: false },
    ];
    const props = { y: 'population_sum', fields, aggregate: { measure: 'population', aggregation: 'SUM' } };

    expect(Math.max(...yTicks(renderBars({ ...props, data: aggregated })))).toBe(40);
    expect(Math.max(...yTicks(renderBars({ ...props, data: [...aggregated, aggregated[0]] })))).toBe(40);
  });
});
