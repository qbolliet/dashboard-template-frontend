// =================================================================
// BUBBLE — géométrie des bulles (3e dimension en taille)
// =================================================================
// Une bulle est un marqueur centré en (x, y) dont l'aire est proportionnelle à z. Ce
// module est pur (ni React, ni DOM) : il calcule l'échelle d'aire, le rayon maximal et la
// position de chaque bulle. <BubbleMarks> dessine la liste produite et <Chart> en tire
// ses cibles de survol — une seule géométrie, donc le survol tombe sur la bulle tracée.
//
// Convention d'aire : celle de d3-shape (`markerPath(type, size)`, size = aire en px²).
// L'aire étant linéaire en z, le marqueur du canal hue[2] change la FORME à aire égale ;
// le disque n'est que le marqueur 'circle'.
//
// z ≤ 0, null ou non numérique : la bulle n'est pas dessinée (une aire négative ou nulle
// n'a pas de sens), sans avertissement.

// Importation des modules
import { reduceValues } from './aggregate';
import { dodgeScale, dodgeSlot } from './dodge';
import { channelVal, seriesKey } from './encoding';

/**
 * Builds the z → area scale of the bubbles: the area grows linearly with z, so that the
 * largest value fills a disc of radius `rMax`.
 *
 * @param {Object} params
 * @param {number} params.zMax - Largest positive z of the full data (domain [0, zMax]).
 * @param {number} params.rMax - Radius (px) of the disc whose area `zMax` maps to.
 * @returns {(z: *) => ?number} Area in px², or `null` when the bubble must not be drawn
 *   (z ≤ 0, null, not a number, or an empty domain / null radius).
 */
export const bubbleArea = ({ zMax, rMax }) => (z) => {
  if (z == null || z === '') return null;
  const v = +z;
  if (!(v > 0) || !(zMax > 0) || !(rMax > 0)) return null;
  return (Math.PI * rMax * rMax * v) / zMax;
};

/**
 * Axis along which the series of a bubble chart are dodged: the first band axis (x
 * before y), none on two continuous axes.
 *
 * @param {object} xScale - x position scale.
 * @param {object} yScale - y position scale.
 * @returns {?('x'|'y')} The dodge axis.
 */
export const dodgeAxisOf = (xScale, yScale) => {
  if (xScale.bandwidth) return 'x';
  if (yScale.bandwidth) return 'y';
  return null;
};

/**
 * Largest bubble radius: the CSS token, capped on each band axis by half the band (half
 * the dodge slot along the dodge axis). Computed on the BASE scales, so that bubble sizes
 * never change with the zoom.
 *
 * @param {Object} params
 * @param {object} params.xScale - Base x scale.
 * @param {object} params.yScale - Base y scale.
 * @param {?Array<string>} [params.dodgeKeys=null] - Series dodged along the dodge axis,
 *   or null when the color channel is inactive.
 * @param {?number} params.tokenPx - `--chart-bubble-max-radius` in px (null if unknown).
 * @returns {number} Largest radius in px (0 when nothing bounds it).
 */
export const bubbleMaxRadius = ({ xScale, yScale, dodgeKeys = null, tokenPx }) => {
  const limits = [];
  if (tokenPx > 0) limits.push(tokenPx);
  const dodgeAxis = dodgeKeys && dodgeKeys.length ? dodgeAxisOf(xScale, yScale) : null;
  for (const [axis, scale] of [['x', xScale], ['y', yScale]]) {
    if (!scale.bandwidth) continue;
    const bw = scale.bandwidth();
    // Le long de l'axe de dodge, la bulle tient dans le slot de sa série
    const extent = axis === dodgeAxis ? dodgeScale(dodgeKeys, bw).bandwidth() : bw;
    limits.push(extent / 2);
  }
  return limits.length ? Math.max(0, Math.min(...limits)) : 0;
};

/**
 * Lists the bubbles' values, before any positioning: one per row, or — on two categorical
 * axes (`cells`) — one per cell × series, its z reduced like a heatmap cell.
 *
 * @param {Object} params
 * @param {Array<Object>} params.data - Rows.
 * @param {string} params.x - x column.
 * @param {string} params.y - y column.
 * @param {string} params.z - Size column.
 * @param {{color: ?string, style: ?string, marker: ?string}} params.channels - Hue channels.
 * @param {boolean} [params.cells=false] - Reduce the rows per (x, y, series).
 * @param {string} [params.reduce='AVG'] - Reduction of a cell (`'none'`: already
 *   aggregated, z read as is).
 * @returns {Array<{row: Object, z: number, key: string}>} Values (z may be ≤ 0).
 */
export const bubbleValues = ({ data, x, y, z, channels, cells = false, reduce = 'AVG' }) => {
  if (!cells) {
    return data
      .filter((r) => r[z] != null && r[z] !== '' && !isNaN(+r[z]))
      .map((r) => ({ row: r, z: +r[z], key: seriesKey(r, channels) }));
  }
  // Une bulle par (cellule × série), comme une case de heatmap par série
  const map = new Map();
  for (const r of data) {
    const zv = r[z];
    if (r[x] == null || r[y] == null || zv == null || zv === '' || isNaN(+zv)) continue;
    const key = seriesKey(r, channels);
    const k = `${String(r[x])}\u0000${String(r[y])}\u0000${key}`;
    if (!map.has(k)) map.set(k, { first: r, key, vals: [] });
    map.get(k).vals.push(+zv);
  }
  return [...map.values()].map(({ first, key, vals }) => {
    const v = reduceValues(vals, reduce);
    return { row: { ...first, [z]: v }, z: v, key };
  });
};

/**
 * Largest positive z of the bubbles (after the same reduction as `bubbleValues`).
 *
 * @param {Object} params - Same as `bubbleValues`.
 * @returns {number} Largest positive z, or 0 when no value is positive.
 */
export const bubbleZMax = (params) => bubbleValues(params)
  .reduce((m, b) => (b.z > m ? b.z : m), 0);

/**
 * Positions the bubbles: center of the band (of the series' dodge slot when `dodgeKeys`
 * is given) on a band axis, exact value on a continuous one. Bubbles out of the zoomed
 * domain or without a drawable area are dropped.
 *
 * @param {Object} params - `bubbleValues` params, plus:
 * @param {object} params.xScale - x position scale (zoomed).
 * @param {object} params.yScale - y position scale (zoomed).
 * @param {(z: number) => ?number} params.areaOf - Output of `bubbleArea`.
 * @param {?Array<string>} [params.dodgeKeys=null] - Series keys of the FULL data, dodged
 *   along the first band axis (null: no dodge).
 * @returns {Array<{px: number, py: number, z: number, area: number, row: Object,
 *   key: string, colorVal: *, styleVal: *, markerVal: *}>} Bubbles, largest first (drawn
 *   first, so that small ones stay visible on top).
 */
export const layoutBubbles = ({ xScale, yScale, areaOf, dodgeKeys = null, ...params }) => {
  const { x, y, channels } = params;
  const dodgeAxis = dodgeKeys && dodgeKeys.length ? dodgeAxisOf(xScale, yScale) : null;
  // Position sur un axe : centre de bande (ou du slot de la série), sinon valeur exacte
  const posOn = (axis, scale, value, key) => {
    if (!scale.bandwidth) return scale(value);
    const bandStart = scale(value);
    if (bandStart == null || isNaN(bandStart)) return NaN;
    const bandwidth = scale.bandwidth();
    const subScale = axis === dodgeAxis ? dodgeScale(dodgeKeys, bandwidth) : null;
    return dodgeSlot({ bandStart, bandwidth, subScale, key }).center;
  };

  const out = [];
  for (const b of bubbleValues(params)) {
    const area = areaOf(b.z);
    if (area == null) continue;
    const px = posOn('x', xScale, b.row[x], b.key);
    const py = posOn('y', yScale, b.row[y], b.key);
    if (px == null || py == null || isNaN(px) || isNaN(py)) continue;
    out.push({
      px, py, z: b.z, area, row: b.row, key: b.key,
      colorVal: channelVal(b.row, channels.color),
      styleVal: channelVal(b.row, channels.style),
      markerVal: channelVal(b.row, channels.marker),
    });
  }
  return out.sort((a, b) => b.area - a.area);
};

// Arrondi « vers le bas » à un chiffre significatif : la valeur de référence reste ≤ z
// et proche de lui (4,9 → 4 ; 830 → 800).
const niceDown = (v) => {
  const p = 10 ** Math.floor(Math.log10(v));
  return Number((Math.floor(v / p) * p).toPrecision(12));
};

/**
 * Three rounded reference values for the size legend: about zMax, zMax / 4 and
 * zMax / 16 (each circle twice the radius of the next one).
 *
 * @param {number} zMax - Largest positive z.
 * @returns {Array<number>} Distinct positive values, largest first (empty if zMax ≤ 0).
 */
export const bubbleLegendValues = (zMax) => {
  if (!(zMax > 0)) return [];
  return [...new Set([zMax, zMax / 4, zMax / 16].map(niceDown))].filter((v) => v > 0);
};
