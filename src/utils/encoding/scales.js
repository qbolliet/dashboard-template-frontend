// =================================================================
// SCALES — palette catégorielle, rampe séquentielle, styles de trait et
// échelles ordinales associées
// =================================================================
// Promu depuis src/features/chart/utils/encoding.js : le globe (flux colorés et
// pointillés par `arcHue`) est le second consommateur, sans lien avec le chart.
// Seules vivent ici les primitives qu'ils partagent ; les helpers propres au
// chart (hachures, marqueurs, séries multi-canaux, rampe séquentielle)
// restent dans la feature.
//
// Exception documentée aux deux conventions couleur du repo (HSL + déclaration
// dans styles/globals/primitives/colors.scss) : PALETTE/SEQUENTIAL restent des CONSTANTES
// JS littérales (pas des `var(--…)`), car les échelles d3/visx doivent produire
// une couleur concrète, calculable sans accès au DOM ni à la cascade CSS — en
// particulier lors de l'export (rastérisation canvas, cf. exportImage.js) où
// une valeur `var()` non résolue casserait le rendu, et dans le moteur WebGL du
// globe, qui convertit chaque teinte une fois en THREE.Color. Elles restent
// toutefois exprimées en HSL (et non en hex) pour respecter la convention de
// couleur du repo, et sont numériquement identiques aux tokens CSS homonymes
// déclarés une fois dans src/styles/globals/primitives/colors.scss (--color-navy,
// --color-brick, …). Toute modification d'une teinte doit donc être répercutée
// aux DEUX endroits (le nom du token CSS correspondant est rappelé en
// commentaire ci-dessous) ; `npm run check:palette` compare les deux fichiers.
//
// Ces tokens sont INVARIANTS selon le thème (bloc de base de colors.scss) : une
// couleur résolue ici n'a jamais à être relue lors d'une bascule clair/sombre.

// Importation des modules
import { scaleOrdinal } from '@visx/scale';

/* ───────────────────────────── Palette ────────────────────────────────── */

// Palette catégorielle à 12 teintes. ≥10 teintes distinctes pour encoder une
// variable à nombreuses modalités (exigence : au moins 10 couleurs). Au-delà,
// scaleOrdinal recycle le range. Chaque teinte correspond à un token nommé de
// styles/globals/primitives/colors.scss.
// Syntaxe `hsl(h, s%, l%)` à VIRGULES (legacy) et non `hsl(h s% l%)` (CSS Color
// 4, espaces) : d3-color — utilisé par interpolateRgbBasis dans sequentialScale
// (chart) — ne sait parser que la syntaxe legacy ; la syntaxe moderne y est
// silencieusement interprétée comme noir (échec de parsing).
export const PALETTE = [
  'hsl(207, 74.4%, 22.9%)', // --color-navy
  'hsl(2, 65.1%, 44.9%)',   // --color-brick
  'hsl(29, 79%, 53.3%)',    // --color-amber
  'hsl(183, 74.1%, 28.8%)', // --color-teal
  'hsl(86, 18.7%, 42.9%)',  // --color-sage
  'hsl(307, 13.6%, 49%)',   // --color-mauve
  'hsl(207, 36.8%, 37.3%)', // --color-steel-blue
  'hsl(251, 100%, 68.6%)',  // --color-indigo
  'hsl(30, 41.9%, 42.5%)',  // --color-umber (brun)
  'hsl(125, 33.9%, 45.1%)', // --color-forest (vert)
  'hsl(327, 50%, 53.7%)',   // --color-magenta
  'hsl(220, 21.2%, 45.3%)', // --color-slate (ardoise)
];

// Rampe séquentielle pour heatmaps/density (clair → foncé, ton primaire).
// Même correspondance : un token nommé par teinte dans colors.scss. Même
// remarque de syntaxe (virgules) que PALETTE ci-dessus. Gardée à côté de
// PALETTE (bien que seul le chart la consomme) pour que check:palette ne lise
// qu'un seul fichier.
export const SEQUENTIAL = [
  'hsl(210, 55.6%, 96.5%)', // --color-frost
  'hsl(212, 52.8%, 85.9%)', // --color-powder-blue
  'hsl(210, 43%, 64.9%)',   // --color-sky
  'hsl(210, 45.7%, 43.3%)', // --color-azure
  'hsl(207, 74.4%, 22.9%)', // --color-navy (foncé — même teinte que PALETTE[0])
];

// Dash-arrays (null = trait plein), en px : '6 4' = 6 px de tiret, 4 px de vide.
// 7 styles.
export const LINE_STYLES = [null, '6 4', '1 4', '8 4 1 4', '4 3', '10 4 2 4', '2 2 6 2'];

/**
 * Builds a categorical color scale over the given domain.
 *
 * @param {Array<*>} domain - Distinct series/hue values.
 * @param {string[]} [range=PALETTE] - Colors to cycle through; a consumer drawing
 *   on a background some hues blend into passes a subset of PALETTE.
 * @returns {(value: *) => string} Ordinal color scale.
 */
export function colorScale(domain, range = PALETTE) {
  return scaleOrdinal().domain(domain).range(range);
}

/**
 * Builds the line-style (dash-array) ordinal scale over the given domain.
 *
 * @param {Array<*>} domain - Distinct secondary hue values.
 * @returns {(value: *) => (string|null)} Ordinal dash-array scale.
 */
export function styleScale(domain) {
  return scaleOrdinal().domain(domain).range(LINE_STYLES);
}

/**
 * Lists a column's distinct values in encounter order.
 *
 * @param {Array<object>} data - Data rows.
 * @param {?string} col - Column name, or null.
 * @returns {Array<*>} Distinct values (or ["__all__"] when col is null).
 */
export function distinctVals(data, col) {
  if (col == null) return ['__all__'];
  // Dédoublonnage sur la forme CHAÎNE : 2 et '2' désignent la même modalité,
  // comme dans seriesKey (chart) qui joint les valeurs en texte.
  const seen = new Set();
  const out = [];
  for (const row of data) {
    const v = row[col];
    if (v == null) continue;
    const s = String(v);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(v);
    }
  }
  return out;
}
