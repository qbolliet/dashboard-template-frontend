// Importation des modules
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { scaleBand, scaleLinear } from '@visx/scale';
import BarMarks from './BarMarks';

// =================================================================
// TEST — RÉDUCTION D'UNE BARRE : AGRÉGATION DÉCLARÉE, MOYENNE HISTORIQUE, AGRÉGATS
// =================================================================

afterEach(cleanup);

// Deux lignes dans la même barre : 10 et 30. Échelle 1 unité = 1 px.
const rows = [{ region: 'Nord', population: 10 }, { region: 'Nord', population: 30 }];
const xScale = scaleBand({ domain: ['Nord'], range: [0, 100] });
const yScale = scaleLinear({ domain: [0, 100], range: [100, 0] });
const channels = { color: null, style: null, marker: null };

const barHeight = (aggregate) => {
  const { container } = render(
    <svg>
      <BarMarks
        data={rows} x="region" y="population" channels={channels}
        xScale={xScale} yScale={yScale} colorScale={() => '#000'}
        fill="fill" aggregate={aggregate} />
    </svg>,
  );
  return Number(container.querySelector('.chart-marks-bar rect').getAttribute('height'));
};

describe('<BarMarks aggregate>', () => {
  it('SUM : la barre vaut la somme des lignes', () => {
    expect(barHeight('SUM')).toBeCloseTo(40);
  });

  it('sans précision : la moyenne historique', () => {
    expect(barHeight(undefined)).toBeCloseTo(20);
  });

  it("'none' : une valeur par barre, jamais combinée", () => {
    expect(barHeight('none')).toBeCloseTo(10);
  });
});
