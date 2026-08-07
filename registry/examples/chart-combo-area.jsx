'use client';

/**
 * Multi-jeux — même série en aire et en ligne
 *
 * `data` reçoit deux fois le MÊME jeu de lignes, une fois avec `fill: 'line'`
 * et une fois avec `fill: 'fill'`, pour superposer une courbe à son aire.
 * L'ordre dans la liste fixe l'ordre de dessin : le 1er jeu de la liste est
 * DEVANT le 2e — donc ici la ligne (déclarée en premier) se dessine
 * au-dessus de l'aire (déclarée en second), et non l'inverse comme on
 * pourrait le supposer naïvement. `Pays`, commun aux deux jeux, coordonne la
 * couleur entre l'aire et la ligne.
 *
 * @item chart
 */

// Importation des modules
import { Chart } from '@/features/chart';
import { makeAreaSeries } from '@/features/chart/sources/demoData';

const rows = makeAreaSeries();

const ChartComboArea = () => (
  <Chart
    x="Date"
    y="Production"
    data={[
      { label: 'Ligne', data: rows, fill: 'line', hue: 'Pays' },
      { label: 'Aire', data: rows, fill: 'fill', hue: 'Pays' },
    ]}
    format={{ x: '%Y-%m', y: '.0f' }}
    labels={{ x: 'Date', y: 'Production (indice)' }}
    title="Production — aire + ligne (même jeu)"
    height={460}
  />
);

export default ChartComboArea;
