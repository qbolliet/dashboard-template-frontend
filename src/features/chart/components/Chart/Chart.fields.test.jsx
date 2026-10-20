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

// Espion sur l'échantillonnage : avec `fields`, il ne doit jamais s'exécuter.
vi.mock('../../utils/typeDetection', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, detectType: vi.fn(actual.detectType) };
});

import { detectType } from '../../utils/typeDetection';
import Chart from './Chart';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const rows = [
  { nc8: '01012100', share: 0.25 },
  { nc8: '02011000', share: 0.5 },
  { nc8: '03021100', share: 0.75 },
];

const fields = [
  { name: 'nc8', typeFamily: 'TEXT', isCategorical: true },
  { name: 'share', typeFamily: 'NUMBER', isCategorical: false, displayFormat: '.0%' },
];

const texts = (container) => [...container.querySelectorAll('text')].map((t) => t.textContent);

describe('<Chart fields>', () => {
  it('keeps a leading-zero code as a category, without sampling the values', () => {
    const { container } = render(<Chart data={rows} x="nc8" y="share" fields={fields} locale="fr" />);

    expect(detectType).not.toHaveBeenCalled();
    expect(texts(container)).toContain('01012100');
    expect(texts(container)).not.toContain('1012100');
  });

  it('turns the code into a number without fields (current behavior)', () => {
    const { container } = render(<Chart data={rows} x="nc8" y="share" locale="fr" />);

    expect(detectType).toHaveBeenCalled();
    expect(texts(container)).not.toContain('01012100');
  });

  it('writes the y axis with the displayFormat of the measure', () => {
    const { container } = render(<Chart data={rows} x="nc8" y="share" fields={fields} locale="en" />);

    const ticks = texts(container).filter((t) => t.endsWith('%'));
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks).toContain('40%');
  });

  it('lets an explicit format win over the metadata', () => {
    const { container } = render(
      <Chart data={rows} x="nc8" y="share" fields={fields} format={{ y: (v) => `v${v}` }} locale="en" />,
    );

    expect(texts(container).some((t) => t.startsWith('v'))).toBe(true);
    expect(texts(container).some((t) => t.endsWith('%'))).toBe(false);
  });
});
