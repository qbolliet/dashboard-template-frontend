'use client';

/**
 * Barres verticales — trois canaux hue + intervalles + normalisation
 *
 * `hue` prend ses trois colonnes : Année → couleur, Scénario → hachures,
 * Méthode → marqueur. La barre d'outils ajoute un intervalle de confiance
 * (bandes ±1/±2 issues d'un jeu séparé aligné sur Secteur × Année) et une
 * normalisation qui rebase toutes les barres sur le secteur « Industrie ».
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';
import { makeBarData, makeBarCI } from '@/features/chart/sources/demoData';

// Jeu complet (non filtré) : les trois hues n'ont de sens que si les quatre
// dimensions (Secteur, Année, Scénario, Méthode) sont toutes représentées.
const rows = makeBarData();
// Bornes d'IC alignées sur (Secteur, Année) — indépendantes de Scénario/Méthode.
const ci = makeBarCI();

// Référence de module figée : une nouvelle identité de tableau à chaque rendu
// empêcherait le React Compiler d'éviter le re-rendu du <Chart>.
const toolbar = [
  F.confidenceInterval({
    data: ci, below: ['lo1', 'lo2'], above: ['hi1', 'hi2'], fill: 'line',
    labels: { legend: 'Intervalle', bands: ['±1', '±2'] },
  }),
  F.normalize({ value: 'Industrie', draggable: true, color: '#7C4DBE', dash: '5 4', label: '100' }),
  F.zoom(),
  F.minimaps(),
];

const ChartBarFull = () => (
  <Chart
    data={rows}
    x="Secteur"
    y="ValeurAjoutée"
    hue={['Année', 'Scénario', 'Méthode']}
    format={{ y: '.3~s' }}
    maxLabelLength={{ x: 14 }}
    labels={{ x: 'Secteur (NAF A06)', y: 'Valeur ajoutée (Md€)', color: 'Année', style: 'Scénario', marker: 'Méthode' }}
    title="Valeur ajoutée brute par secteur"
    toolbar={toolbar}
    height={440}
  />
);

export default ChartBarFull;
