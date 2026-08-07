'use client';

/**
 * Multi-jeux — courbe mensuelle + barres trimestrielles
 *
 * `data` accepte une liste de jeux au lieu d'un tableau de lignes unique :
 * chaque entrée porte son propre `data`, son `fill` et son `hue`, mais
 * partage l'axe x continu (dates) défini au niveau du `<Chart>`. Le jeu
 * trimestriel force `'categorical-x': true` pour être rendu en barres
 * positionnées à leur date plutôt qu'en points d'une courbe. `Pays` est
 * commun aux deux jeux : la couleur reste cohérente entre la courbe et les
 * barres pour un même pays.
 *
 * @item chart
 */

// Importation des modules
import { Chart } from '@/features/chart';
import { makeComboMonthly, makeComboQuarterly } from '@/features/chart/sources/demoData';

const monthly = makeComboMonthly();
// Moyenne trimestrielle du même jeu, positionnée mi-trimestre.
const quarterly = makeComboQuarterly(monthly);

const ChartComboBar = () => (
  <Chart
    x="Date"
    y="Croissance"
    data={[
      { label: 'Mensuelle', data: monthly, fill: 'line', hue: 'Pays' },
      { label: 'Trimestrielle', data: quarterly, fill: 'fill', hue: 'Pays', 'categorical-x': true },
    ]}
    format={{ x: '%Y-%m', y: '.1f' }}
    labels={{ x: 'Date', y: 'Croissance (%)' }}
    title="Croissance — mensuelle (ligne) + trimestrielle (barres)"
    height={460}
  />
);

export default ChartComboBar;
