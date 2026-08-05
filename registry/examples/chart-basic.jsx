'use client';

/**
 * Série temporelle simple
 *
 * La forme minimale de `<Chart>` : des lignes, une colonne d'abscisse, une
 * colonne d'ordonnée. Le type de graphique est déduit du type des colonnes —
 * ici une date et un nombre, donc une courbe.
 *
 * @item chart
 */

// Importation des modules
import { Chart } from '@/features/chart';
import { makeLineByHue } from '@/features/chart/sources/demoData';

// Jeu de démonstration à graine fixe, construit une seule fois au niveau module :
// les données ne dépendent d'aucun état, leur identité doit rester stable.
const rows = makeLineByHue()[0];

const ChartBasic = () => (
  <Chart
    data={rows}
    x="Date"
    y="PIB"
    format={{ x: '%Y-%m', y: '.3~f' }}
    labels={{ x: 'Date', y: 'PIB (indice 2020 = 100)' }}
    title="PIB mensuel"
    height={420}
  />
);

export default ChartBasic;
