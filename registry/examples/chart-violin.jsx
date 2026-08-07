'use client';

/**
 * Violin plot — distribution par catégorie, trois canaux hue
 *
 * `x` catégoriel + `y` numérique produisent une densité (KDE epanechnikov)
 * par catégorie, doublée d'une boîte à moustaches ; `z` pondère l'épaisseur
 * par la taille d'échantillon. Les trois canaux hue se répartissent en
 * couleur (Jeu), hachures (Optimiseur) et marqueur à la médiane (Init).
 *
 * Pas d'intervalle de confiance ni de normalisation ici : ces deux fonctions
 * de la barre d'outils ancrent une valeur ponctuelle sur un axe, ce qui n'a
 * pas de sens sur une distribution — seuls zoom et mini-vues restent utiles.
 *
 * La variante horizontale (`y` catégoriel, `x` numérique) n'est qu'une
 * permutation des axes de ce même graphique : elle ne mérite pas un exemple
 * séparé.
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';
import { makeViolinData } from '@/features/chart/sources/demoData';

const rows = makeViolinData();

// Référence de module figée : cf. chart-bar-full.jsx pour la raison.
const toolbar = [F.zoom(), F.minimaps()];

const ChartViolin = () => (
  <Chart
    data={rows}
    x="Modèle"
    y="RMSE"
    z="Échantillon"
    hue={['Jeu', 'Optimiseur', 'Init']}
    format={{ y: '.2f', z: '.0f' }}
    labels={{
      x: 'Modèle',
      y: 'RMSE (validation)',
      z: 'Échantillon moyen',
      color: 'Jeu',
      style: 'Optimiseur',
      marker: 'Initialisation',
    }}
    title="Distribution de RMSE par modèle"
    toolbar={toolbar}
    height={460}
  />
);

export default ChartViolin;
