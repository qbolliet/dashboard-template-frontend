import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

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

// Pas de cascade CSS sous jsdom (feuilles non chargées, propriétés personnalisées non
// héritées) : le token `--chart-bubble-max-radius` (1.5rem) est fourni en px.
vi.mock('@/hooks/cssLength/useCssLength', () => ({
  useCssLength: (ref, name, enabled = true) => (enabled ? 24 : null),
}));

import Chart from './Chart';

// =================================================================
// TEST — <Chart zMark="bubble"> : UNE BULLE PAR OBSERVATION, AIRE ∝ z
// =================================================================

afterEach(cleanup);

// La marque est chargée à la demande (next/dynamic) : on attend son premier rendu.
const bubblesOf = async (container, expected) => {
  await waitFor(() => expect(container.querySelectorAll('.chart-marks-bubble-body')).toHaveLength(expected));
  return [...container.querySelectorAll('.chart-marks-bubble-body')];
};

const renderChart = (props) => render(<Chart locale="fr" zMark="bubble" {...props} />).container;

describe('<Chart zMark="bubble">', () => {
  it('continu × continu : une bulle par ligne de z positif, les plus grandes d\'abord', async () => {
    const data = [
      { x: 1, y: 2, z: 10 },
      { x: 2, y: 4, z: 40 },
      { x: 3, y: 1, z: 0 }, // z nul : pas de bulle
      { x: 4, y: 3, z: -2 }, // z négatif : pas de bulle
      { x: 5, y: 5, z: null },
    ];
    const container = renderChart({ data, x: 'x', y: 'y', z: 'z' });
    const bubbles = await bubblesOf(container, 2);
    // La plus grande (z = 40) est tracée en premier : son chemin est le plus long
    const size = (el) => el.getAttribute('d').length;
    expect(size(bubbles[0])).toBeGreaterThanOrEqual(size(bubbles[1]));
    expect(container.querySelector('.legend-size')).not.toBeNull();
  });

  it('catégoriel × continu : bulles décalées par série (canal couleur)', async () => {
    const data = [
      { region: 'Nord', taux: 3, pop: 10, sexe: 'F' },
      { region: 'Nord', taux: 3, pop: 20, sexe: 'H' },
      { region: 'Sud', taux: 5, pop: 30, sexe: 'F' },
    ];
    const container = renderChart({ data, x: 'region', y: 'taux', z: 'pop', hue: 'sexe' });
    await bubblesOf(container, 3);
    // Même bande, même valeur : seules les séries les séparent
    const nord = [...container.querySelectorAll('.chart-marks-bubble .chart-marks-series')]
      .map((g) => g.getAttribute('transform'))
      .filter((t, i, all) => all.indexOf(t) === i);
    expect(nord).toHaveLength(3);
  });

  it('catégoriel × catégoriel : une bulle par cellule sur lignes brutes, valeurs telles quelles avec `aggregate`', async () => {
    const raw = [
      { region: 'Nord', secteur: 'A', pop: 10 },
      { region: 'Nord', secteur: 'A', pop: 30 },
      { region: 'Sud', secteur: 'B', pop: 5 },
    ];
    const rawContainer = renderChart({ data: raw, x: 'region', y: 'secteur', z: 'pop' });
    await bubblesOf(rawContainer, 2);
    cleanup();

    const aggregated = [
      { region: 'Nord', secteur: 'A', pop_sum: 40 },
      { region: 'Sud', secteur: 'B', pop_sum: 5 },
      { region: 'Sud', secteur: 'A', pop_sum: 12 },
    ];
    const container = renderChart({
      data: aggregated, x: 'region', y: 'secteur', z: 'pop_sum', aggregate: { measure: 'pop', aggregation: 'SUM' },
    });
    await bubblesOf(container, 3);
  });

  it('aucun z positif : message dans le tracé, ni bulle ni légende de taille', async () => {
    const data = [{ x: 1, y: 1, z: 0 }, { x: 2, y: 2, z: -4 }];
    const container = renderChart({ data, x: 'x', y: 'y', z: 'z' });
    await waitFor(() => expect(container.querySelector('.chart-empty-message')).not.toBeNull());
    expect(container.querySelector('.chart-empty-message').textContent).toMatch(/z/);
    expect(container.querySelectorAll('.chart-marks-bubble-body')).toHaveLength(0);
    expect(container.querySelector('.legend-size')).toBeNull();
  });

  it('sans zMark : le rendu historique (densité), aucune bulle', () => {
    const data = [{ x: 1, y: 2, z: 10 }, { x: 2, y: 4, z: 40 }];
    const { container } = render(<Chart locale="fr" data={data} x="x" y="y" z="z" />);
    expect(container.querySelector('.chart-marks-bubble')).toBeNull();
    expect(container.querySelector('.legend-size')).toBeNull();
  });
});
