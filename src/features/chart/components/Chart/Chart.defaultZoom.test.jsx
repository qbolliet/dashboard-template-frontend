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

import Chart from './Chart';
import { zoom } from '../../toolbar-features/zoom';

// =================================================================
// TEST — <Chart defaultZoom> : zoom initial, amorçage asynchrone, réamorçage
// =================================================================
// Nuage (`fill="none"`) : un marqueur par ligne VISIBLE dans le tracé principal (le
// premier groupe .chart-marks-line ; le second est la mini-vue). Compter les marqueurs
// revient donc à compter les abscisses tracées.

afterEach(cleanup);

// Une observation par mois, abscisses en chaînes ISO (converties par le graphique).
const monthly = (n, start = 0) => Array.from({ length: n }, (_, i) => ({
  date: new Date(Date.UTC(2024, start + i, 1)).toISOString().slice(0, 10),
  v: 10 + ((i * 7) % 5),
}));

const plotted = (container) => [...container.querySelector('g.chart-marks-line').querySelectorAll('.visx-glyph')];
// Abscisses pixel des marqueurs, par ordre croissant.
const plottedXs = (container) => plotted(container)
  .map((g) => +/translate\(([-\d.]+)/.exec(g.getAttribute('transform'))[1])
  .sort((a, b) => a - b);

const toolbar = [zoom()];
const renderChart = (props) => {
  const utils = render(
    <Chart x="date" y="v" fill="none" locale="en" toolbar={toolbar} defaults={{ zoom: true }} {...props} />,
  );
  return { ...utils, rerenderChart: (next) => utils.rerender(
    <Chart x="date" y="v" fill="none" locale="en" toolbar={toolbar} defaults={{ zoom: true }} {...props} {...next} />,
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

describe('<Chart defaultZoom>', () => {
  it('{ x: { last: 5 } } : seules les 5 dernières abscisses sont tracées', () => {
    const { container } = renderChart({ data: monthly(12), defaultZoom: { x: { last: 5 } } });
    expect(plotted(container)).toHaveLength(5);
    // Les 5 points occupent la fenêtre, du bord gauche au bord droit du tracé
    const sorted = plottedXs(container);
    const width = +container.querySelector('clipPath rect').getAttribute('width');
    expect(sorted[0]).toBeCloseTo(0, 3);
    expect(sorted[4]).toBeCloseTo(width, 3);
  });

  it('sans defaultZoom : vue complète', () => {
    const { container } = renderChart({ data: monthly(12) });
    expect(plotted(container)).toHaveLength(12);
  });

  it('data=[] puis données complètes : le zoom initial s’applique à l’arrivée', () => {
    const { container, rerenderChart } = renderChart({ data: [], defaultZoom: { x: { last: 5 } } });
    expect(container.querySelectorAll('g.chart-marks-line .visx-glyph')).toHaveLength(0);
    rerenderChart({ data: monthly(12) });
    expect(plotted(container)).toHaveLength(5);
  });

  it('nouvelle identité de data, même domaine : la sélection de l’utilisateur est gardée', () => {
    const data = monthly(12);
    const { container, rerenderChart } = renderChart({ data, defaultZoom: { x: { last: 5 } } });
    wheelIn(container);
    const zoomed = plotted(container).length;
    expect(zoomed).toBeLessThan(5);
    rerenderChart({ data: data.map((r) => ({ ...r })) });
    expect(plotted(container)).toHaveLength(zoomed);
  });

  it('domaine changé : le zoom initial est réappliqué', () => {
    const { container, rerenderChart } = renderChart({ data: monthly(12), defaultZoom: { x: { last: 5 } } });
    wheelIn(container);
    expect(plotted(container).length).toBeLessThan(5);
    rerenderChart({ data: monthly(24) });
    expect(plotted(container)).toHaveLength(5);
  });

  it('domaine changé sans defaultZoom : retour à la vue complète (pas de sélection périmée)', () => {
    const { container, rerenderChart } = renderChart({ data: monthly(12) });
    wheelIn(container);
    expect(plotted(container).length).toBeLessThan(12);
    // Filtre : la nouvelle série est entièrement HORS de l'ancienne fenêtre
    rerenderChart({ data: monthly(6, 36) });
    expect(plotted(container)).toHaveLength(6);
  });

  it('resetZoom revient à la vue COMPLÈTE, pas au zoom initial', () => {
    const { container, getByRole } = renderChart({ data: monthly(12), defaultZoom: { x: { last: 5 } } });
    expect(plotted(container)).toHaveLength(5);
    fireEvent.click(getByRole('button', { name: 'Réinitialiser le zoom' }));
    expect(plotted(container)).toHaveLength(12);
  });

  it('le premier affichage zoomé recadre l’axe des valeurs (fitOnZoom)', () => {
    // Rampe croissante : les 10 premières abscisses n'ont que de petites valeurs.
    const ramp = Array.from({ length: 100 }, (_, i) => ({ t: i, v: i * 10 }));
    const yTicks = (c) => [...c.querySelectorAll('text.chart-axis-tick-label[text-anchor="end"]')]
      .map((t) => Number(t.textContent));
    const props = { data: ramp, x: 't', y: 'v', fill: 'line', format: { y: (d) => String(d) } };
    const full = yTicks(renderChart(props).container);
    cleanup();
    const zoomed = yTicks(renderChart({ ...props, defaultZoom: { x: { first: 10 } } }).container);
    expect(Math.max(...full)).toBeGreaterThanOrEqual(990);
    expect(Math.max(...zoomed)).toBeLessThanOrEqual(100);
  });

  it('spec sur un axe non zoomable : ignorée, avertissement en dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = renderChart({ data: monthly(12), defaultZoom: { y: [10, 12] } });
    expect(plotted(container)).toHaveLength(12);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("l'axe y n'est pas zoomable"));
  });

  it('barres horizontales : la spec porte sur y (axe principal)', () => {
    const rows = ['A', 'B', 'C', 'D', 'E'].map((c, i) => ({ c, v: i + 1 }));
    const { container } = render(
      <Chart data={rows} x="v" y="c" fill="fill" locale="en" defaultZoom={{ y: { last: 2 } }} />,
    );
    const bars = [...container.querySelectorAll('rect.chart-marks-bar-rect')]
      .filter((r) => !r.classList.contains('chart-marks-bar-rect--mini'));
    expect(bars).toHaveLength(2);
  });
});
