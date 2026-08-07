'use client';

/**
 * Density plot — nuage 2D résumé par une KDE
 *
 * `x` et `y` numériques avec `z` agrégé (densité) déclenchent une estimation
 * de densité par noyau à deux dimensions (`d3.contourDensity`) plutôt qu'un
 * nuage de points brut — utile dès que le nombre de lignes rend un scatter
 * illisible (ici 1200 observations). Comme pour la heatmap, x et y sont deux
 * axes indépendants : la normalisation prend donc un réticule `{ x, y }`
 * plutôt qu'une valeur scalaire.
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';
import { makeDensityData } from '@/features/chart/sources/demoData';

const rows = makeDensityData();

// Référence de module figée : cf. chart-bar-full.jsx pour la raison.
const toolbar = [
  F.normalize({ value: { x: 55, y: 50 }, draggable: true, color: '#7C4DBE', dash: '5 4', label: '100' }),
  F.zoom(),
  F.minimaps(),
];

const ChartDensity = () => (
  <Chart
    data={rows}
    x="ChômageTaux"
    y="EmploiTaux"
    z="Densité"
    hue={['Type', 'Source']}
    format={{ x: '.0f', y: '.0f', z: '.0f' }}
    labels={{
      x: 'Taux de chômage (%)',
      y: "Taux d'emploi (%)",
      z: 'Densité moyenne',
      color: 'Type',
      style: 'Source',
    }}
    title="Densité chômage × emploi (KDE 2D)"
    toolbar={toolbar}
    height={500}
  />
);

export default ChartDensity;
