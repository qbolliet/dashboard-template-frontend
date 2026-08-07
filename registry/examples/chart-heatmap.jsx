'use client';

/**
 * Heatmap — deux catégories croisées, une mesure en couleur
 *
 * `x` et `y` sont tous deux catégoriels (mois, pays) ; `z` colore chaque
 * case. `fill="fill"` peint des cases pleines (l'alternative `"line"` ne
 * trace que leurs contours). Sur un croisement x/y, la normalisation ne peut
 * pas ancrer un seul point de l'axe : elle prend un réticule `{ x, y }`
 * déplaçable sur la grille plutôt qu'une valeur scalaire.
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';
import { makeHeatmapData } from '@/features/chart/sources/demoData';

const rows = makeHeatmapData();

// Référence de module figée : cf. chart-bar-full.jsx pour la raison (stabilité
// d'identité requise par le React Compiler).
const toolbar = [
  F.normalize({ value: { x: 'Juin', y: 'France' }, draggable: true, color: '#7C4DBE', dash: '5 4', label: '100' }),
  F.zoom(),
  F.minimaps(),
];

const ChartHeatmap = () => (
  <Chart
    data={rows}
    x="Mois"
    y="Pays"
    z="Inflation"
    fill="fill"
    format={{ z: '.2f' }}
    labels={{ x: 'Mois', y: 'Pays', z: 'Inflation (%)' }}
    title="Inflation mensuelle par pays"
    toolbar={toolbar}
    height={460}
  />
);

export default ChartHeatmap;
