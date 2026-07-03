'use client';

// Page de fumée TEMPORAIRE : affiche les 6 types de graphiques rendus par le
// composant pivot <Chart> à partir des générateurs synthétiques (identiques au
// prototype design-system/project/scripts/charts/data.jsx) pour comparaison
// visuelle. Sera remplacée par une page playground complète (TweaksPanel).

import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import Chart from '@/features/chart/components/Chart/Chart';
import {
  makeLineByHue, makeBarData, makeBarHData,
  makeHeatmapData, makeDensityData, makeViolinData,
} from '@/features/chart/sources/demoData';
import './page.scss';

// Jeux de démonstration construits une fois (générateurs à graine fixe).
const lineData = makeLineByHue()[2];   // Pays × Entraînement → couleur + style
const barData = makeBarData();
const barHData = makeBarHData();
const heatmapData = makeHeatmapData();
const densityData = makeDensityData();
const violinData = makeViolinData();

const TestChartPage = () => (
  <ThemeProvider>
    <main className="test-chart-page">
      <h1 className="test-chart-title">Chart — page de fumée (6 types)</h1>

      <section className="test-chart-grid">
        <Chart
          title="Linechart — PIB par pays"
          data={lineData}
          x="Date" y="PIB" hue={['Country', 'CrossVal']}
          labels={{ x: 'Date', y: 'PIB (base 100)', color: 'Pays', style: 'Entraînement' }}
        />
        <Chart
          title="Barchart — valeur ajoutée par secteur"
          data={barData}
          x="Secteur" y="ValeurAjoutée" hue="Année"
          labels={{ x: 'Secteur', y: 'Valeur ajoutée', color: 'Année' }}
        />
        <Chart
          title="Barchart horizontal — adoption par région"
          data={barHData}
          x="Adoption" y="Région" hue="Année"
          labels={{ x: 'Adoption', y: 'Région', color: 'Année' }}
        />
        <Chart
          title="Heatmap — inflation par pays × mois"
          data={heatmapData}
          x="Mois" y="Pays" z="Inflation" fill="fill"
          labels={{ x: 'Mois', y: 'Pays', z: 'Inflation (%)' }}
        />
        <Chart
          title="Violin — distribution RMSE par modèle"
          data={violinData}
          x="Modèle" y="RMSE" z="Échantillon" hue={['Jeu', 'Optimiseur']}
          labels={{ x: 'Modèle', y: 'RMSE', color: 'Jeu', style: 'Optimiseur' }}
        />
        <Chart
          title="Density — chômage × emploi"
          data={densityData}
          x="ChômageTaux" y="EmploiTaux" z="Densité" hue="Type"
          labels={{ x: 'Taux de chômage', y: "Taux d'emploi", color: 'Type' }}
        />
      </section>
    </main>
  </ThemeProvider>
);

export default TestChartPage;
