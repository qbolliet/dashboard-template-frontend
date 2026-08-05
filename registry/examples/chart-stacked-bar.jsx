'use client';

/**
 * Barres empilées
 *
 * Une abscisse catégorielle produit des barres. `fill="fill"` les remplit et
 * `stack="color"` empile les séries du canal couleur au lieu de les juxtaposer.
 *
 * @item chart
 */

// Importation des modules
import { Chart } from '@/features/chart';
import { makeBarData } from '@/features/chart/sources/demoData';

// Le jeu de démonstration croise quatre dimensions ; on n'en garde qu'une coupe
// pour que l'empilement se lise (une barre par secteur, une part par année).
const rows = makeBarData().filter((row) => row.Scénario === 'Central' && row.Méthode === 'INSEE');

const ChartStackedBar = () => (
  <Chart
    data={rows}
    x="Secteur"
    y="ValeurAjoutée"
    hue="Année"
    fill="fill"
    stack="color"
    format={{ y: '.3~s' }}
    maxLabelLength={{ x: 14 }}
    labels={{ x: 'Secteur (NAF A06)', y: 'Valeur ajoutée (Md€)', color: 'Année' }}
    title="Valeur ajoutée brute par secteur"
    height={440}
  />
);

export default ChartStackedBar;
