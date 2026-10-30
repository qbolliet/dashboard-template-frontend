import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

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

// =================================================================
// TEST — <MultiChart defaultZoom> : zoom initial de l'axe x partagé
// =================================================================
// Rendu direct (cf. MultiChart.aggregate.test.jsx : <Chart> charge <MultiChart> par
// next/dynamic). Deux jeux en nuage (`fill="none"`), mêmes abscisses : un marqueur par
// ligne visible et par jeu dans le groupe clippé du tracé principal (le premier ; la
// mini-vue vient après).

afterEach(cleanup);

const monthly = (n, start = 0, offset = 0) => Array.from({ length: n }, (_, i) => ({
  date: new Date(Date.UTC(2024, start + i, 1)).toISOString().slice(0, 10),
  v: offset + 10 + ((i * 7) % 5),
}));
const sets = (n, start) => [
  { label: 'A', data: monthly(n, start) },
  { label: 'B', data: monthly(n, start, 20) },
];

// Marqueurs du tracé principal, divisés par le nombre de jeux = abscisses tracées.
const plotted = (container) => container.querySelector('g[clip-path]').querySelectorAll('.visx-glyph').length / 2;

const renderMulti = (props) => {
  const utils = render(<MultiChart x="date" y="v" fill="none" locale="en" {...props} />);
  return { ...utils, rerenderMulti: (next) => utils.rerender(
    <MultiChart x="date" y="v" fill="none" locale="en" {...props} {...next} />,
  ) };
};

// getBoundingClientRect est nul sous jsdom : le handler de molette en déduit la
// position du curseur dans le tracé.
beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, right: 800, bottom: 420, width: 800, height: 420, x: 0, y: 0,
  });
});
afterEach(() => vi.restoreAllMocks());

const wheelIn = (container, steps = 3) => {
  const svg = container.querySelector('svg.chart-svg');
  for (let i = 0; i < steps; i++) fireEvent.wheel(svg, { deltaY: -100, clientX: 500, clientY: 150 });
};

describe('<MultiChart defaultZoom>', () => {
  it('{ x: { last: 5 } } : seules les 5 dernières abscisses sont tracées', () => {
    expect(plotted(renderMulti({ data: sets(12), defaultZoom: { x: { last: 5 } } }).container)).toBe(5);
    cleanup();
    expect(plotted(renderMulti({ data: sets(12) }).container)).toBe(12);
  });

  it('jeux vides puis chargés : le zoom initial s’applique à l’arrivée', () => {
    const empty = [{ label: 'A', data: [] }, { label: 'B', data: [] }];
    const { container, rerenderMulti } = renderMulti({ data: empty, defaultZoom: { x: { last: 5 } } });
    rerenderMulti({ data: sets(12) });
    expect(plotted(container)).toBe(5);
  });

  it('nouvelle identité de data, même domaine : la sélection de l’utilisateur est gardée', () => {
    const data = sets(12);
    const { container, rerenderMulti } = renderMulti({ data, defaultZoom: { x: { last: 5 } } });
    wheelIn(container);
    const zoomed = plotted(container);
    expect(zoomed).toBeLessThan(5);
    rerenderMulti({ data: data.map((ds) => ({ ...ds, data: ds.data.map((r) => ({ ...r })) })) });
    expect(plotted(container)).toBe(zoomed);
  });

  it('domaine changé : le zoom initial est réappliqué', () => {
    const { container, rerenderMulti } = renderMulti({ data: sets(12), defaultZoom: { x: { last: 5 } } });
    wheelIn(container);
    expect(plotted(container)).toBeLessThan(5);
    rerenderMulti({ data: sets(24) });
    expect(plotted(container)).toBe(5);
  });

  it('domaine changé sans defaultZoom : retour à la vue complète', () => {
    const { container, rerenderMulti } = renderMulti({ data: sets(12) });
    wheelIn(container);
    expect(plotted(container)).toBeLessThan(12);
    rerenderMulti({ data: sets(6, 36) });
    expect(plotted(container)).toBe(6);
  });

  it('resetZoom revient à la vue COMPLÈTE', () => {
    const { container, getByRole } = renderMulti({ data: sets(12), defaultZoom: { x: { last: 5 } } });
    fireEvent.click(getByRole('button', { name: 'Réinitialiser le zoom' }));
    expect(plotted(container)).toBe(12);
  });

  it('spec y ignorée, avec un avertissement en dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = renderMulti({ data: sets(12), defaultZoom: { y: [10, 12] } });
    expect(plotted(container)).toBe(12);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('spec y ignorée'));
  });
});
