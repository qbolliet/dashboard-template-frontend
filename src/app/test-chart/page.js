'use client';

// Page de fumée TEMPORAIRE : affiche les 6 types de graphiques rendus par le
// composant pivot <Chart>, désormais AVEC la barre d'outils configurable
// (intervalles de confiance, projection avant/après, normalisation, zoom,
// mini-vues), à partir des générateurs synthétiques (identiques au prototype
// design-system/project/scripts/charts/data.jsx). Sera remplacée par une page
// playground complète (TweaksPanel).

import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import Chart from '@/features/chart/components/Chart/Chart';
import { ChartsFeatures as F } from '@/features/chart/toolbar-features';
import {
  makeLineByHue, makeLineCI, makeLineForecast,
  makeBarData, makeBarCI, makeBarHData, makeBarHCI,
  makeHeatmapData, makeDensityData, makeViolinData,
  makeComboMonthly, makeComboQuarterly, makeAreaSeries,
} from '@/features/chart/sources/demoData';
import './page.scss';

// Jeux de démonstration construits une fois (générateurs à graine fixe).
const lineData = makeLineByHue()[2]; // Pays × Entraînement → couleur + style
const lineCI = makeLineCI(lineData);
const lineForecast = makeLineForecast(lineData);
const lineForecastCI = makeLineCI(lineForecast);
const barData = makeBarData();
const barHData = makeBarHData();
const heatmapData = makeHeatmapData();
const densityData = makeDensityData();
const violinData = makeViolinData();

// Jeux multi-graph (liste de jeux → <MultiChart>) : combo-bar (ligne mensuelle +
// barres trimestrielles categorical-x) et combo-area (même jeu en aire puis ligne).
const comboMonthly = makeComboMonthly();
const comboQuarterly = makeComboQuarterly(comboMonthly);
const areaSeries = makeAreaSeries();

// ── Barres d'outils par type (portées de charts.html) ───────────────────────
// Reconstruites au niveau module (références stables) : <Chart> gère son état
// interne (options actives, position des barres) ; seules celles compatibles
// avec le type détecté apparaissent.
const CI_BOUNDS = { below: ['lo1', 'lo2'], above: ['hi1', 'hi2'] };

const lineToolbar = [
  F.confidenceInterval({ data: lineCI, ...CI_BOUNDS, fill: 'fill', labels: { legend: 'Intervalle', bands: ['68 %', '95 %'] } }),
  F.beforeAfter({
    data: lineForecast, value: new Date(2023, 4, 1), side: 'after', draggable: true,
    label: 'Prévision', labels: { legend: 'Prévision' },
    ci: { data: lineForecastCI, ...CI_BOUNDS },
  }),
  F.normalize({ value: new Date(2020, 0, 1), draggable: true }),
  F.zoom(), F.minimaps(),
];
const barToolbar = [
  F.confidenceInterval({ data: makeBarCI(), ...CI_BOUNDS, fill: 'fill', labels: { legend: 'Intervalle', bands: ['±1', '±2'] } }),
  F.normalize({ value: 'Industrie', draggable: true }),
  F.zoom(), F.minimaps(),
];
const barHToolbar = [
  F.confidenceInterval({ data: makeBarHCI(), ...CI_BOUNDS, fill: 'fill', labels: { legend: 'Intervalle', bands: ['±1', '±2'] } }),
  F.normalize({ value: 'Île-de-France', draggable: true }),
  F.zoom(), F.minimaps(),
];
// Charts x,y,z : la normalisation devient un RÉTICULE déplaçable sur un point.
const heatmapToolbar = [F.normalize({ value: { x: 'Juin', y: 'France' }, draggable: true }), F.zoom(), F.minimaps()];
const densityToolbar = [F.normalize({ value: { x: 55, y: 50 }, draggable: true }), F.zoom(), F.minimaps()];
const universalToolbar = [F.zoom(), F.minimaps()];

const TestChartPage = () => (
  <ThemeProvider>
    <main className="test-chart-page">
      <h1 className="test-chart-title">Chart — page de fumée (6 types + barre d&apos;outils)</h1>

      <section className="test-chart-grid">
        <Chart
          title="Linechart — PIB par pays"
          data={lineData}
          x="Date" y="PIB" hue={['Country', 'CrossVal']}
          labels={{ x: 'Date', y: 'PIB (base 100)', color: 'Pays', style: 'Entraînement' }}
          toolbar={lineToolbar}
          defaults={{ confidence: true }}
        />
        <Chart
          title="Barchart — valeur ajoutée par secteur"
          data={barData}
          x="Secteur" y="ValeurAjoutée" hue="Année"
          labels={{ x: 'Secteur', y: 'Valeur ajoutée', color: 'Année' }}
          toolbar={barToolbar}
        />
        <Chart
          title="Barchart horizontal — adoption par région"
          data={barHData}
          x="Adoption" y="Région" hue="Année"
          labels={{ x: 'Adoption', y: 'Région', color: 'Année' }}
          toolbar={barHToolbar}
        />
        <Chart
          title="Heatmap — inflation par pays × mois"
          data={heatmapData}
          x="Mois" y="Pays" z="Inflation" fill="fill"
          labels={{ x: 'Mois', y: 'Pays', z: 'Inflation (%)' }}
          toolbar={heatmapToolbar}
        />
        <Chart
          title="Violin — distribution RMSE par modèle"
          data={violinData}
          x="Modèle" y="RMSE" z="Échantillon" hue={['Jeu', 'Optimiseur']}
          labels={{ x: 'Modèle', y: 'RMSE', color: 'Jeu', style: 'Optimiseur' }}
          toolbar={universalToolbar}
        />
        <Chart
          title="Density — chômage × emploi"
          data={densityData}
          x="ChômageTaux" y="EmploiTaux" z="Densité" hue="Type"
          labels={{ x: 'Taux de chômage', y: "Taux d'emploi", color: 'Type' }}
          toolbar={densityToolbar}
        />

        {/* Multi-jeux — linechart (mensuel) + barchart categorical-x (trimestriel). */}
        <Chart
          title="Croissance — mensuelle (ligne) + trimestrielle (barres)"
          data={[
            { label: 'Mensuelle', data: comboMonthly, fill: 'line', hue: 'Pays' },
            { label: 'Trimestrielle', data: comboQuarterly, fill: 'fill', hue: 'Pays', 'categorical-x': true },
          ]}
          x="Date" y="Croissance"
          format={{ x: '%Y-%m', y: '.1f' }}
          labels={{ x: 'Date', y: 'Croissance (%)' }}
        />

        {/* Multi-jeux — même jeu rendu en ligne puis en aire (couleurs coordonnées). */}
        <Chart
          title="Production — aire + ligne (même jeu)"
          data={[
            { label: 'Ligne', data: areaSeries, fill: 'line', hue: 'Pays' },
            { label: 'Aire', data: areaSeries, fill: 'fill', hue: 'Pays' },
          ]}
          x="Date" y="Production"
          format={{ x: '%Y-%m', y: '.0f' }}
          labels={{ x: 'Date', y: 'Production (indice)' }}
        />
      </section>
    </main>
  </ThemeProvider>
);

export default TestChartPage;
