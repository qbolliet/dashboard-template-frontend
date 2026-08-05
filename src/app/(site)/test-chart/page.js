// =================================================================
// PAGE /test-chart — page d'exemples du composant <Chart>
// =================================================================
// Composant SERVEUR : entête statique (titre, sous-titre) et tableau d'API des
// props. Seul le playground interactif (panneau de contrôles + 10 blocs de
// démonstration) est 'use client' — il vit dans ChartsPlayground.jsx. Calqué sur
// le prototype design-system/project/ds/charts.html et sur le style de page de
// test-multi-criterion-menu.

// Importation des modules
import ChartsPlayground from './ChartsPlayground';
import './page.scss';

// Tableau d'API des props de <Chart> — repris À L'IDENTIQUE du prototype
// (charts.html, api-table). Statique : rendu côté serveur.
const CHART_PROPS = [
  ['data', 'Array<Row> | Array<Dataset>', 'Format long, OU une liste de jeux { label, data, hue, fill, stack, categorical-x, categorical-y }. En mode liste, hue/fill/stack du Chart servent de défaut. Jeux superposés sur des axes communs ; le 1er jeu est devant.'],
  ['x', 'string', 'Nom de colonne en abscisse.'],
  ['y', 'string (requis)', 'Nom de colonne en ordonnée — un seul x sans y → erreur explicite.'],
  ['z', 'string?', 'Troisième dimension. Active heatmap (si x ou y catégoriel) ou density (sinon).'],
  ['hue', 'string | string[]?', "Colonnes d'encodage. Le nombre de canaux actifs est INFÉRÉ de la longueur : [0]→couleur, [1]→style, [2]→marqueur. 0 colonne = une seule série."],
  ['fill', "'none' | 'line' | 'fill'", "X-Y : nuage / ligne / aire. Heatmap, violon, density : 'line' (contours) ou 'fill' (plein) — 'none' ⇒ 'fill'."],
  ['stack', "'none' | 'color' | 'style' | 'marker' | 'all'", 'Bar/line : empile les séries. Violon : empile les densités côte à côte (hue binaire ⇒ split gauche/droite, autres hues empilées dans chaque moitié). Sans effet sur la heatmap et la density.'],
  ['format', '{ x?, y?, z? }', 'Spec d3 (".2~s", "%Y-%m") ou fonction par axe.'],
  ['maxLabelLength', '{ x?, y? }', 'Catégoriel — chars max avant ellipsis.'],
  ['maxLines', '{ x?, y? }', 'Catégoriel — lignes max si wrap (multiline).'],
  ['overlap', "'auto' | 'rotate' | 'multiline' | 'skip'", 'Stratégie anti-collision des ticks. Auto = rotate, sinon multiline en repli.'],
  ['tickDensity', "'sparse' | 'normal' | 'dense'", 'Cible la densité de ticks ; nombre ajusté à la largeur.'],
  ['labels', '{ x?, y?, z?, color?, style?, marker? }', 'Libellés d\'axes et de légende.'],
  ['title', 'string?', 'Titre affiché dans l\'entête du chart.'],
  ['toolbar', 'Feature[]', 'Options de la barre d\'outils (au survol, haut-droit), depuis ChartsFeatures : confidenceInterval, beforeAfter, normalize, zoom, minimaps. Seules celles compatibles avec le type détecté apparaissent. Voronoï, tooltip, réinit. zoom, export SVG/PNG et agrandissement sont intégrés.'],
  ['defaults', '{ [tool]: boolean }', "Options actives par DÉFAUT (clé = id de feature : zoom, minimaps, confidence, beforeAfter, normalize — ou intégrée : 'voronoi', 'tooltips', 'minimaps', 'expanded'). Prioritaire sur le defaultOn de chaque feature."],
];

const TestChartPage = () => (
  <main className="test-chart-page">
    <header className="test-chart-header">
      <h1 className="test-chart-title">Graphique adaptatif</h1>
      <p className="test-chart-sub">
        Un seul composant — <code>&lt;Chart&gt;</code> — qui détecte le type de chacune
        des colonnes <code>x / y / z / hue</code> et choisit le rendu adapté : line, bar,
        heatmap, violin ou density. Survolez un graphique pour faire apparaître la barre
        d&apos;outils (haut-droit), brushez les mini-vues pour zoomer, et utilisez Voronoï
        pour faire ressortir la série la plus proche.
      </p>
    </header>

    {/* ── Tableau d'API des props (statique, rendu serveur) ── */}
    <section className="test-chart-api">
      <h2 className="charts-section-label">API — Chart props</h2>
      <div className="api-card-scroll">
        <table className="api-table">
          <thead>
            <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
          </thead>
          <tbody>
            {CHART_PROPS.map(([prop, type, desc]) => (
              <tr key={prop}>
                <td><code>{prop}</code></td>
                <td className="api-typ">{type}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {/* ── Playground interactif (client) ── */}
    <ChartsPlayground />
  </main>
);

export default TestChartPage;
