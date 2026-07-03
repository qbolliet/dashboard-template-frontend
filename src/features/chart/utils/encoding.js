// =================================================================
// ENCODING — palette, échelles de canaux (couleur/style/marqueur) et
// helpers de série multi-canaux
// =================================================================

// @visx/scale n'expose pas `scaleSequential` (contrairement à d3-scale) : la
// rampe séquentielle est donc réimplémentée localement à l'identique du
// comportement de `d3.scaleSequential().interpolator(...)` (interpolation
// non bornée, sans clamp — cf. sequentialScale ci-dessous), en s'appuyant
// uniquement sur `interpolateRgbBasis` de d3-interpolate.
//
// Exception documentée aux deux conventions couleur du repo (HSL + déclaration
// dans styles/globals/colors.scss) : PALETTE/SEQUENTIAL restent des CONSTANTES
// JS littérales (pas des `var(--…)`), car les échelles d3/visx doivent produire
// une couleur concrète, calculable sans accès au DOM ni à la cascade CSS — en
// particulier lors de l'export (rastérisation canvas, cf. exportImage.js) où
// une valeur `var()` non résolue casserait le rendu. Elles restent toutefois
// exprimées en HSL (et non en hex) pour respecter la convention de couleur du
// repo, et sont numériquement identiques aux tokens CSS homonymes déclarés une
// fois dans src/styles/globals/colors.scss (--color-navy, --color-brick, …),
// eux-mêmes repris par features/chart/_colors.scss (--chart-cat-*/--chart-seq-*)
// pour les éléments de chrome. Toute modification d'une teinte doit donc être
// répercutée aux DEUX endroits (le nom du token CSS correspondant est rappelé
// en commentaire ci-dessous).

// Importation des modules
import { scaleOrdinal } from '@visx/scale';
import { symbol, symbolCircle, symbolSquare, symbolTriangle, symbolDiamond, symbolCross, symbolStar, symbolWye } from 'd3-shape';
import { interpolateRgbBasis } from 'd3-interpolate';

/* ───────────────────────────── Palette ────────────────────────────────── */

// Palette catégorielle à 12 teintes. ≥10 teintes distinctes pour encoder une
// variable à nombreuses modalités (exigence : au moins 10 couleurs). Au-delà,
// scaleOrdinal recycle le range. Chaque teinte correspond à un token nommé de
// styles/globals/colors.scss.
// Syntaxe `hsl(h, s%, l%)` à VIRGULES (legacy) et non `hsl(h s% l%)` (CSS Color
// 4, espaces) : d3-color — utilisé par interpolateRgbBasis dans sequentialScale
// ci-dessous — ne sait parser que la syntaxe legacy ; la syntaxe moderne y est
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
// remarque de syntaxe (virgules) que PALETTE ci-dessus.
export const SEQUENTIAL = [
  'hsl(210, 55.6%, 96.5%)', // --color-frost
  'hsl(212, 52.8%, 85.9%)', // --color-powder-blue
  'hsl(210, 43%, 64.9%)',   // --color-sky
  'hsl(210, 45.7%, 43.3%)', // --color-azure
  'hsl(207, 74.4%, 22.9%)', // --color-navy (foncé — même teinte que PALETTE[0])
];

/**
 * Builds a categorical color scale over the given domain.
 *
 * @param {Array<*>} domain - Distinct series/hue values.
 * @returns {(value: *) => string} Ordinal color scale.
 */
export function colorScale(domain) {
  return scaleOrdinal().domain(domain).range(PALETTE);
}

/**
 * Builds a sequential (continuous) color scale over a numeric [min, max] domain.
 * Equivalent to `d3.scaleSequential().domain(domain).interpolator(...)`, non-clamped.
 *
 * @param {[number, number]} domain - Numeric extent [min, max].
 * @returns {(value: number) => string} Sequential color scale.
 */
export function sequentialScale(domain) {
  const interpolator = interpolateRgbBasis(SEQUENTIAL);
  const [d0, d1] = domain;
  return (value) => {
    const t = d1 === d0 ? 0 : (value - d0) / (d1 - d0);
    return interpolator(t);
  };
}

/* ─────────────────────── Style (line) + Marker channels ──────────────────
   Encodage à 3 canaux, calqué sur l'implémentation de référence :
     • couleur   → série principale (toujours)
     • style     → 1er hue secondaire (trait plein, pointillé, …)
     • marqueur  → 2e hue secondaire (point, triangle, carré, …)
   ───────────────────────────────────────────────────────────────────────── */

// Dash-arrays (null = trait plein). 7 styles
export const LINE_STYLES = [null, '6 4', '1 4', '8 4 1 4', '4 3', '10 4 2 4', '2 2 6 2'];

// Motifs de hachures — équivalent « barres » des pointillés du linechart.
export const HATCH_TYPES = [null, 'diag', 'diag-rev', 'cross', 'horizontal', 'vertical', 'grid'];

// Types de marqueurs d3-symbol — l'exigence décroît encore : 5 formes
// nettement distinctes (la confusion visuelle apparaît plus vite sur les
// symboles que sur les couleurs/hachures).
export const MARKER_TYPES = ['circle', 'square', 'triangle', 'diamond', 'star'];

export const D3_SYMBOL = {
  circle: symbolCircle,
  square: symbolSquare,
  triangle: symbolTriangle,
  diamond: symbolDiamond,
  cross: symbolCross,
  star: symbolStar,
  wye: symbolWye,
};

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
 * Builds the hatch-pattern ordinal scale, parallel to styleScale (same domain
 * → same index, so a series' dash-style and hatch always pair up).
 *
 * @param {Array<*>} domain - Distinct secondary hue values.
 * @returns {(value: *) => (string|null)} Ordinal hatch-type scale.
 */
export function hatchScale(domain) {
  return scaleOrdinal().domain(domain).range(HATCH_TYPES);
}

/**
 * Builds the marker-shape ordinal scale over the given domain.
 *
 * @param {Array<*>} domain - Distinct tertiary hue values.
 * @returns {(value: *) => string} Ordinal marker-type scale.
 */
export function markerScale(domain) {
  return scaleOrdinal().domain(domain).range(MARKER_TYPES);
}

/**
 * Builds the SVG path of a marker centered on (0, 0).
 *
 * @param {string} type - Marker type (key of D3_SYMBOL).
 * @param {number} [size=64] - Marker area in px².
 * @returns {string} SVG path `d` attribute.
 */
export function markerPath(type, size = 64) {
  const sym = D3_SYMBOL[type] || symbolCircle;
  return symbol().type(sym).size(size)();
}

/* ─────────────────────── Multi-channel series helpers ────────────────────
   `channels` = { color, style, marker } — chaque entrée est un nom de colonne
   ou null si le canal est inactif. La clé de série combine les canaux actifs.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Reads a channel's raw value on a row, or the shared placeholder when the
 * channel is inactive (column name is null).
 *
 * @param {object} row - Data row.
 * @param {?string} col - Channel's column name, or null.
 * @returns {*} Channel value.
 */
export function channelVal(row, col) {
  return col == null ? '__all__' : row[col];
}

/**
 * Builds the combined series key of a row from its active channels.
 *
 * @param {object} row - Data row.
 * @param {{color: ?string, style: ?string, marker: ?string}} channels - Active channel columns.
 * @returns {string} Combined series key (channels joined by " · "), or "__all__" if none active.
 */
export function seriesKey(row, channels) {
  const parts = [];
  if (channels.color) parts.push(String(channelVal(row, channels.color)));
  if (channels.style) parts.push(String(channelVal(row, channels.style)));
  if (channels.marker) parts.push(String(channelVal(row, channels.marker)));
  return parts.length ? parts.join(' · ') : '__all__';
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

/**
 * Groups rows by their full series key, keeping each channel's raw value
 * alongside the grouped rows for rendering (color/style/marker).
 *
 * @param {Array<object>} data - Data rows.
 * @param {{color: ?string, style: ?string, marker: ?string}} channels - Active channel columns.
 * @returns {Array<{key: string, colorVal: *, styleVal: *, markerVal: *, rows: Array<object>}>} Series groups.
 */
export function groupSeries(data, channels) {
  const map = new Map();
  for (const row of data) {
    const k = seriesKey(row, channels);
    if (!map.has(k)) {
      map.set(k, {
        key: k,
        colorVal: channelVal(row, channels.color),
        styleVal: channelVal(row, channels.style),
        markerVal: channelVal(row, channels.marker),
        rows: [],
      });
    }
    map.get(k).rows.push(row);
  }
  return [...map.values()];
}

/**
 * Subsamples an array down to ~targetN elements, always keeping both bounds.
 *
 * @param {Array<*>} arr - Source array.
 * @param {number} targetN - Target element count.
 * @returns {Array<*>} Subsampled array (unchanged if already short enough).
 */
export function subsample(arr, targetN) {
  if (arr.length <= targetN) return arr;
  const step = (arr.length - 1) / (targetN - 1);
  const out = [];
  for (let i = 0; i < targetN; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

/**
 * Builds a stable key for an x-axis value (timestamp for dates, string otherwise).
 *
 * @param {*} v - Raw x value.
 * @returns {string} Stable key.
 */
export function xKeyOf(v) {
  return v instanceof Date ? 'd' + +v : String(v);
}

/* ───────────────────────────── Hue helpers ────────────────────────────── */

/**
 * Builds a stable key combining one or several hue columns.
 *
 * @param {object} row - Data row.
 * @param {?Array<string>} hueCols - Hue column names (in canal order).
 * @returns {string} Combined hue key.
 */
export function hueKey(row, hueCols) {
  if (!hueCols || hueCols.length === 0) return '__all__';
  return hueCols.map((c) => row[c]).join(' · ');
}

/**
 * Lists the distinct hue keys in encounter order.
 *
 * @param {Array<object>} data - Data rows.
 * @param {?Array<string>} hueCols - Hue column names.
 * @returns {Array<string>} Distinct hue keys.
 */
export function hueDomain(data, hueCols) {
  if (!hueCols || hueCols.length === 0) return ['__all__'];
  const seen = new Set();
  const out = [];
  for (const row of data) {
    const k = hueKey(row, hueCols);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}
