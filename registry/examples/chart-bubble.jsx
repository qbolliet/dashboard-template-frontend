'use client';

/**
 * Bulles — la 3e dimension en taille plutôt qu'en densité
 *
 * `zMark="bubble"` remplace heatmap, violon et densité par un marqueur par
 * observation, centré en (x, y), dont l'AIRE est proportionnelle à `z` (z ≤ 0
 * n'est pas dessiné). Les trois cas : deux catégories (une bulle par cellule),
 * une catégorie et un nombre (séries décalées dans la bande par le canal
 * couleur), deux nombres (nuage, survol au plus proche). Une légende de taille
 * rejoint celle des canaux ; zoomer déplace les bulles sans les redimensionner.
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';
import {
  makeHeatmapData, makeViolinData, makeDensityData,
} from '@/features/chart/sources/demoData';

// Jeux réduits à quelques dizaines d'observations : au-delà, des bulles se masquent
// (c'est alors le rôle de zMark="density").
const grid = makeHeatmapData().filter((r) => ['Jan', 'Avr', 'Juil', 'Oct'].includes(r.Mois));
const models = makeViolinData()
  .filter((r) => r.Optimiseur === 'Adam' && r.Init === 'Xavier')
  .filter((_, i) => i % 8 === 0);
const cloud = makeDensityData().slice(0, 120);

// Référence de module figée : cf. chart-bar-full.jsx pour la raison.
const toolbar = [F.zoom(), F.minimaps()];

const ChartBubble = () => (
  <>
    <Chart
      data={grid}
      x="Mois"
      y="Pays"
      z="Inflation"
      zMark="bubble"
      fill="fill"
      format={{ z: '.1f' }}
      labels={{ x: 'Mois', y: 'Pays', z: 'Inflation (%)' }}
      title="Catégorie × catégorie : une bulle par cellule"
      toolbar={toolbar}
      height={420}
    />
    <Chart
      data={models}
      x="Modèle"
      y="RMSE"
      z="Échantillon"
      zMark="bubble"
      hue="Jeu"
      fill="fill"
      format={{ y: '.2f', z: ',.0f' }}
      labels={{ x: 'Modèle', y: 'RMSE', z: 'Taille d’échantillon', color: 'Jeu' }}
      title="Catégorie × nombre : séries décalées dans la bande"
      toolbar={toolbar}
      height={420}
    />
    <Chart
      data={cloud}
      x="ChômageTaux"
      y="EmploiTaux"
      z="Densité"
      zMark="bubble"
      hue={['Type', 'Source']}
      fill="line"
      format={{ x: '.0f', y: '.0f', z: '.0f' }}
      labels={{
        x: 'Taux de chômage (%)', y: "Taux d'emploi (%)", z: 'Densité', color: 'Type', style: 'Source',
      }}
      title="Nombre × nombre : contours pointillés par source"
      toolbar={toolbar}
      height={460}
    />
  </>
);

export default ChartBubble;
