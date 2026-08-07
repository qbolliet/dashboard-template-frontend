'use client';

/**
 * Barres horizontales — axes inversés, trois canaux hue
 *
 * `x` porte la mesure numérique et `y` la catégorie : les barres se couchent.
 * Mêmes trois canaux hue que la variante verticale (Année → couleur,
 * Scénario → hachures, Méthode → marqueur), avec un intervalle de confiance et
 * une normalisation rebasée sur la région « Île-de-France ».
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';
import { makeBarHData, makeBarHCI } from '@/features/chart/sources/demoData';

const rows = makeBarHData();
// Bornes d'IC alignées sur (Région, Année) — indépendantes de Scénario/Méthode.
const ci = makeBarHCI();

// Référence de module figée pour la même raison que dans chart-bar-full.jsx.
const toolbar = [
  F.confidenceInterval({
    data: ci, below: ['lo1', 'lo2'], above: ['hi1', 'hi2'], fill: 'line',
    labels: { legend: 'Intervalle', bands: ['±1', '±2'] },
  }),
  F.normalize({ value: 'Île-de-France', draggable: true, color: '#7C4DBE', dash: '5 4', label: '100' }),
  F.zoom(),
  F.minimaps(),
];

const ChartBarHorizontal = () => (
  <Chart
    data={rows}
    x="Adoption"
    y="Région"
    hue={['Année', 'Scénario', 'Méthode']}
    format={{ x: '.0f' }}
    maxLabelLength={{ y: 22 }}
    labels={{ x: "Taux d'adoption (%)", y: 'Région', color: 'Année', style: 'Scénario', marker: 'Méthode' }}
    title="Taux d'adoption par région (axes inversés)"
    toolbar={toolbar}
    height={460}
  />
);

export default ChartBarHorizontal;
