'use client';

/**
 * Axe des valeurs : ancré à zéro ou calé sur les données
 *
 * Barres (en haut) : des valeurs en milliards qui varient peu sont écrasées en haut du
 * tracé quand l'axe part de 0 (réglage par défaut, à gauche). `zeroBaseline={false}` cale
 * l'axe sur l'étendue des données (à droite) : les écarts se lisent, et les graduations
 * signalent que l'axe ne part plus de 0.
 *
 * Courbes (en bas) : la règle par défaut est inverse — une courbe se lit par sa forme et
 * suit l'étendue des données (à gauche). `zeroBaseline` (soit `true`) inclut 0 dans l'axe
 * et ferme l'aire sur 0 (à droite) : l'amplitude se lit relativement au total.
 *
 * @item chart
 */

// Importation des modules
import { Chart } from '@/features/chart';

// Jeu fictif : produit annuel d'une région, en euros (ordre de grandeur : 4 à 5 Md€).
const rows = [
  { année: 2019, produit: 4.21e9 },
  { année: 2020, produit: 4.05e9 },
  { année: 2021, produit: 4.38e9 },
  { année: 2022, produit: 4.56e9 },
  { année: 2023, produit: 4.71e9 },
  { année: 2024, produit: 4.62e9 },
];

// Barres : l'année est déclarée CATÉGORIELLE. Sans métadonnée, 2019… sont des nombres et
// le graphique tracerait une courbe (cas des deux graphiques du bas).
const barFields = [{ name: 'année', typeFamily: 'STRING', isCategorical: true }];

const shared = {
  data: rows,
  x: 'année',
  y: 'produit',
  fill: 'fill',
  // `d` : entier sans séparateur de milliers (« 2020 » et non « 2 020 »).
  format: { x: 'd', y: '.3~s' },
  labels: { x: 'Année', y: 'Produit (€)' },
  height: 320,
};

const ChartValueAxis = () => (
  <section className="grid gap-6 md:grid-cols-2">
    <Chart {...shared} fields={barFields} title="Barres : ancrées à 0 (défaut)" />
    <Chart {...shared} fields={barFields} zeroBaseline={false} title="Barres : zeroBaseline={false}" />
    <Chart {...shared} title="Courbe : étendue des données (défaut)" />
    <Chart {...shared} zeroBaseline title="Courbe : zeroBaseline" />
  </section>
);

export default ChartValueAxis;
