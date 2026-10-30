'use client';

/**
 * Axe des valeurs non ancré à zéro
 *
 * Des barres en milliards qui varient peu sont écrasées en haut du tracé quand l'axe part
 * de 0 (réglage par défaut, à gauche). `zeroBaseline={false}` cale l'axe sur l'étendue des
 * données (à droite) : les écarts se lisent, et les graduations signalent que l'axe ne part
 * plus de 0.
 *
 * @item chart
 */

// Importation des modules
import { Chart } from '@/features/chart';

// Jeu fictif : produit annuel d'une région, en euros (ordre de grandeur : 4 à 5 Md€).
const rows = [
  { année: '2019', produit: 4.21e9 },
  { année: '2020', produit: 4.05e9 },
  { année: '2021', produit: 4.38e9 },
  { année: '2022', produit: 4.56e9 },
  { année: '2023', produit: 4.62e9 },
  { année: '2024', produit: 4.71e9 },
];

const shared = {
  data: rows,
  x: 'année',
  y: 'produit',
  fill: 'fill',
  format: { y: '.3~s' },
  labels: { x: 'Année', y: 'Produit (€)' },
  height: 360,
};

const ChartValueAxis = () => (
  <section className="grid gap-6 md:grid-cols-2">
    <Chart {...shared} title="Axe ancré à 0 (défaut)" />
    <Chart {...shared} zeroBaseline={false} title="zeroBaseline={false}" />
  </section>
);

export default ChartValueAxis;
