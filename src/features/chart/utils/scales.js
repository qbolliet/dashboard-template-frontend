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

// Kinds dont l'axe des valeurs inclut 0 en mode 'auto' : une barre (ou une aire,
// côté <MultiChart>) se lit par sa LONGUEUR depuis 0 ; une courbe, par sa forme.
const ZERO_ANCHORED_KINDS = new Set(['bar', 'bar-h', 'area']);

/**
 * Domain of a value axis (line / area / bar / bar-h), BEFORE `.nice()` — the single
 * source of truth shared by <Chart> (base and zoom-fitted scales), `makeScale` and
 * <MultiChart>.
 *
 * Zero rule, per `zeroBaseline`:
 *   - `'auto'` (default): bars and areas include 0, curves span their data;
 *   - `true`: 0 is always included, curves too;
 *   - `false`: the data extent, even for non-stacked bars.
 * Stacks ALWAYS include 0, whatever `zeroBaseline`: a stack that does not start at 0
 * misrepresents the shares it is made of.
 *
 * `extra` (confidence bounds, projections) is always included. An empty or
 * zero-width domain is widened so the scale stays invertible.
 *
 * @param {object} params
 * @param {Iterable<number>} params.values - Plotted values (non-finite ones are ignored).
 *   For a stack, the cumulated tops (e.g. `[stack.max]`).
 * @param {'line'|'area'|'bar'|'bar-h'} params.kind - Mark kind on this axis.
 * @param {boolean} [params.stacked=false] - Whether the values are stacked.
 * @param {'auto'|boolean} [params.zeroBaseline='auto'] - Zero inclusion rule.
 * @param {?Array<number>} [params.extra=null] - Extra `[lo, hi]` extent to include.
 * @returns {Array<number>} `[lo, hi]`, with `lo < hi`.
 */
export function valueDomain({ values, kind, stacked = false, zeroBaseline = 'auto', extra = null }) {
  let lo = Infinity, hi = -Infinity;
  for (const raw of values) {
    const v = +raw;
    if (raw == null || !Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  // Aucune valeur exploitable : domaine unitaire arbitraire (axe lisible, échelle inversible)
  if (lo > hi) { lo = 0; hi = 1; }
  // Inclusion de 0 : piles TOUJOURS (lecture des parts), sinon selon la règle demandée.
  const withZero = stacked || zeroBaseline === true
    || (zeroBaseline === 'auto' && ZERO_ANCHORED_KINDS.has(kind));
  if (withZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  // Bornes des features (IC, projections) : toujours englobées
  if (extra) { lo = Math.min(lo, extra[0]); hi = Math.max(hi, extra[1]); }
  // Valeurs toutes égales : domaine élargi, sinon l'échelle serait dégénérée
  if (lo === hi) hi = lo + 1;
  return [lo, hi];
}

/**
 * Value bars (and zero-baseline areas) start from: 0 when it lies in the domain,
 * otherwise the domain bound closest to 0 — so a bar never starts outside the plot
 * when the axis is not anchored to 0 (`zeroBaseline={false}`, zoom fit).
 *
 * @param {Array<number>} domain - Value-axis domain `[a, b]` (any order).
 * @returns {number} The baseline value.
 */
export function baselineValue([a, b]) {
  const lo = Math.min(+a, +b), hi = Math.max(+a, +b);
  if (lo <= 0 && hi >= 0) return 0;
  return lo > 0 ? lo : hi;
}

/**
 * Builds a position scale for one axis from a column's detected type.
 *
 * Date → scaleTime (nice), number → scaleLinear (nice; the value axis of bar/bar-h
 * follows {@link valueDomain}), categorical → scaleBand with the per-kind padding.
 * The pixel range is oriented like the prototype: x grows left→right, continuous y
 * grows bottom→top (inverted), categorical y grows top→bottom.
 *
 * @param {'date'|'number'|'categorical'} type - Column type.
 * @param {Array<object>} data - Data rows.
 * @param {string} col - Column name.
 * @param {number} length - Axis pixel extent (innerWidth for x, innerHeight for y).
 * @param {'x'|'y'} axis - Which axis is being built.
 * @param {string} chartKind - Detected chart kind (drives band padding + value anchoring).
 * @param {object} [options]
 * @param {'auto'|boolean} [options.zeroBaseline='auto'] - Zero rule of the value axis
 *   (see {@link valueDomain}).
 * @returns {object} A visx/d3 scale.
 */
export function makeScale(type, data, col, length, axis, chartKind, { zeroBaseline = 'auto' } = {}) {
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
    // Axe VALEUR des barres (y vertical, x horizontal) : règle du zéro de valueDomain.
    // Les autres axes numériques gardent l'étendue brute des données.
    const isValueAxis = (axis === 'y' && chartKind === 'bar') || (axis === 'x' && chartKind === 'bar-h');
    const domain = isValueAxis ? valueDomain({ values: vals, kind: chartKind, zeroBaseline }) : extent(vals);
    return scaleLinear({
      domain,
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
