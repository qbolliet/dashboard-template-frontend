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
// TEST — <Chart> : axe des valeurs (zeroBaseline) et recadrage au zoom (fitOnZoom)
// =================================================================

afterEach(cleanup);

// Barres principales (hors mini-vue) et hauteur du tracé (rectangle du clip).
const mainBars = (container) => [...container.querySelectorAll('rect.chart-marks-bar-rect')]
  .filter((r) => !r.classList.contains('chart-marks-bar-rect--mini'));
const plotHeight = (container) => +container.querySelector('clipPath rect').getAttribute('height');

const billions = [
  { pays: 'A', pib: 4.2e9 },
  { pays: 'B', pib: 4.5e9 },
  { pays: 'C', pib: 4.8e9 },
];

describe('<Chart> : zeroBaseline', () => {
  const renderBars = (props) => render(
    <Chart data={billions} x="pays" y="pib" fill="fill" locale="en" {...props} />,
  ).container;

  it('à false, des barres en milliards restent dans le tracé et ne sont plus écrasées', () => {
    const container = renderBars({ zeroBaseline: false });
    const h = plotHeight(container);
    const bars = mainBars(container);
    expect(bars).toHaveLength(3);
    for (const b of bars) {
      const y = +b.getAttribute('y');
      const height = +b.getAttribute('height');
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + height).toBeLessThanOrEqual(h + 1e-6);
    }
    const heights = bars.map((b) => +b.getAttribute('height'));
    expect(Math.min(...heights) / Math.max(...heights)).toBeLessThan(0.5);
  });

  it("en 'auto' (défaut), les barres partent de 0 : hauteurs proportionnelles aux valeurs", () => {
    const heights = mainBars(renderBars()).map((b) => +b.getAttribute('height'));
    expect(Math.min(...heights) / Math.max(...heights)).toBeCloseTo(4.2 / 4.8, 2);
  });
});

describe('<Chart> : fitOnZoom', () => {
  // Rampe croissante : zoomer sur le début de l'axe x ne montre que de petites valeurs.
  const ramp = Array.from({ length: 100 }, (_, i) => ({ t: i, v: i * 10 }));
  const toolbar = [zoom()];

  // getBoundingClientRect est nul sous jsdom : le handler de molette en déduit la
  // position du curseur dans le tracé.
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 800, bottom: 420, width: 800, height: 420, x: 0, y: 0,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  // Graduations de l'axe des ordonnées (libellés ancrés à droite de l'axe gauche).
  const yTicks = (container) => [...container.querySelectorAll('text.chart-axis-tick-label[text-anchor="end"]')]
    .map((t) => Number(t.textContent));

  const zoomNearStart = (container) => {
    const svg = container.querySelector('svg.chart-svg');
    for (let i = 0; i < 6; i++) fireEvent.wheel(svg, { deltaY: -100, clientX: 200, clientY: 150 });
  };

  const renderLine = (props) => render(
    <Chart
      data={ramp} x="t" y="v" locale="en" toolbar={toolbar} defaults={{ zoom: true }}
      format={{ y: (d) => String(d) }} {...props}
    />,
  ).container;

  it("par défaut, une sélection x restreinte recadre les graduations y sur la fenêtre visible", () => {
    const container = renderLine();
    const before = yTicks(container);
    expect(Math.max(...before)).toBeGreaterThanOrEqual(990);
    zoomNearStart(container);
    const after = yTicks(container);
    expect(after.length).toBeGreaterThan(1);
    expect(Math.max(...after)).toBeLessThan(Math.max(...before) * 0.7);
  });

  it('fitOnZoom={false} garde les graduations y de toute la série', () => {
    const container = renderLine({ fitOnZoom: false });
    const before = yTicks(container);
    zoomNearStart(container);
    expect(yTicks(container)).toEqual(before);
  });
});
