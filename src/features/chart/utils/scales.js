// =================================================================
// SCALES — construction des échelles de position (x / y)
// =================================================================
// Importation des modules
import { scaleTime, scaleLinear, scaleBand } from '@visx/scale';
import { extent } from 'd3-array';

/**
 * Padding applied to a categorical (band) axis, per chart kind — reproduit à
 * l'identique la matrice du prototype : barres serrées, violons espacés, reste
 * quasi jointif.
 *
 * @param {string} chartKind - Detected chart kind.
 * @returns {number} scaleBand padding in [0, 1).
 */
export function bandPadding(chartKind) {
  if (chartKind === 'bar' || chartKind === 'bar-h') return 0.18;
  if (chartKind === 'violin-v' || chartKind === 'violin-h') return 0.25;
  return 0.04;
}

/**
 * Builds a position scale for one axis from a column's detected type.
 *
 * Date → scaleTime (nice), number → scaleLinear (nice, value axis anchored to 0
 * for bar/bar-h), categorical → scaleBand with the per-kind padding. The pixel
 * range is oriented like the prototype: x grows left→right, continuous y grows
 * bottom→top (inverted), categorical y grows top→bottom.
 *
 * @param {'date'|'number'|'categorical'} type - Column type.
 * @param {Array<object>} data - Data rows.
 * @param {string} col - Column name.
 * @param {number} length - Axis pixel extent (innerWidth for x, innerHeight for y).
 * @param {'x'|'y'} axis - Which axis is being built.
 * @param {string} chartKind - Detected chart kind (drives band padding + value anchoring).
 * @returns {object} A visx/d3 scale.
 */
export function makeScale(type, data, col, length, axis, chartKind) {
  if (type === 'date') {
    const ext = extent(data, (d) => d[col]);
    return scaleTime({
      domain: ext,
      range: axis === 'x' ? [0, length] : [length, 0],
      nice: true,
    });
  }
  if (type === 'number') {
    const vals = data.map((d) => d[col]).filter((v) => v != null && !isNaN(v));
    let ext = extent(vals);
    // Ancrage de l'axe VALEUR à 0 pour les barres (y vertical, x horizontal).
    if (axis === 'y' && chartKind === 'bar' && ext[0] > 0) ext = [0, ext[1]];
    if (axis === 'x' && chartKind === 'bar-h' && ext[0] > 0) ext = [0, ext[1]];
    return scaleLinear({
      domain: ext,
      range: axis === 'x' ? [0, length] : [length, 0],
      nice: true,
    });
  }
  // Catégoriel
  const domain = [...new Set(data.map((d) => d[col]).filter((v) => v != null))];
  return scaleBand({
    domain,
    range: [0, length],
    padding: bandPadding(chartKind),
  });
}
