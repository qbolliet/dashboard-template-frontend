// =================================================================
// ENCODING — rampe séquentielle et helpers de série multi-canaux
// =================================================================

// @visx/scale n'expose pas `scaleSequential` (contrairement à d3-scale) : la
// rampe séquentielle est donc réimplémentée localement à l'identique du
// comportement de `d3.scaleSequential().interpolator(...)` (interpolation
// non bornée, sans clamp — cf. sequentialScale ci-dessous), en s'appuyant
// uniquement sur `interpolateRgbBasis` de d3-interpolate.
//
// PALETTE, SEQUENTIAL, LINE_STYLES, HATCH_TYPES, MARKER_TYPES, colorScale, styleScale,
// hatchScale, markerScale et distinctVals ont été promus dans src/utils/encoding/scales.js (second consommateur : les flux et
// les bulles du globe), D3_SYMBOL et markerPath dans src/utils/encoding/markers.js (avec la
// légende par canaux, partagée elle aussi avec le globe). Ce fichier ne garde que les helpers propres au chart ; l'API publique
// de la feature les réexporte toujours (cf. src/features/chart/index.js).

// Importation des modules
import { interpolateRgbBasis } from 'd3-interpolate';
import { SEQUENTIAL } from '@/utils/encoding/scales';

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
  const scale = (value) => {
    const t = d1 === d0 ? 0 : (value - d0) / (d1 - d0);
    return interpolator(t);
  };
  // Expose `.domain()` comme d3.scaleSequential : les consommateurs de chrome
  // (SequentialLegend) lisent les bornes sans les re-passer séparément.
  scale.domain = () => [d0, d1];
  return scale;
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
