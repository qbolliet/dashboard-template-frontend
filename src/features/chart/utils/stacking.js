// =================================================================
// STACKING — empilement de séries (bar/line/violin) par canal
// =================================================================
// Importation des modules
import { seriesKey, xKeyOf } from './encoding';
import { reduceValues } from './aggregate';

/**
 * Builds the stacked offsets of series grouped by x, for one of the three
 * channels (color/style/marker) or across all series at once.
 *
 * `stackBy`:
 *   - 'all'    → every series stacks together at each x.
 *   - 'color'  → stacks across color values (same style + marker).
 *   - 'style'  → stacks across style values (same color + marker).
 *   - 'marker' → stacks across marker values (same color + style).
 *
 * @param {object} params - Stacking input.
 * @param {Array<object>} params.data - Data rows.
 * @param {string} params.posKey - Grouping abscissa column (x for vertical, y for horizontal).
 * @param {string} params.valKey - Value column being stacked (y for vertical, x for horizontal).
 * @param {{color: ?string, style: ?string, marker: ?string}} params.channels - Active channel columns.
 * @param {'none'|'all'|'color'|'style'|'marker'} params.stackBy - Stacking mode.
 * @param {Array<string>} [params.seriesOrder] - Series keys in the desired stacking order.
 * @param {string} [params.aggregate='SUM'] - Reduction of duplicate (series, x) values, as
 *   accepted by `reduceValues`: `'none'` for rows already aggregated by the API (one row
 *   per segment, value kept as is), an `Aggregation` value (`SUM`, `AVG`…).
 * @returns {?{offsets: Map<string, {y0: number, y1: number}>, max: number}} Offsets keyed by
 *   "serieKey|xKey", and the max cumulated value across all x buckets; null if stackBy is 'none'.
 */
export function buildStacks({ data, posKey, valKey, channels, stackBy, seriesOrder, aggregate }) {
  if (!stackBy || stackBy === 'none') return null;

  const channelCols = ['color', 'style', 'marker'].map((c) => channels[c]).filter(Boolean);
  let stackCol = null;
  let groupCols = channelCols;
  if (stackBy !== 'all') {
    stackCol = channels[stackBy] || null;
    groupCols = channelCols.filter((c) => c !== stackCol);
  } else {
    groupCols = [];
  }

  const orderIndex = new Map((seriesOrder || []).map((k, i) => [k, i]));

  // Regroupe les lignes par (clé de groupe, clé d'abscisse) ; réduit les doublons
  // série/x selon `aggregate` (cf. reduceValues ; 'none' : déjà agrégé par l'API).
  const buckets = new Map();
  for (const row of data) {
    const sk = seriesKey(row, channels);
    const gk = groupCols.map((c) => row[c]).join('·') || '__all__';
    const xk = xKeyOf(row[posKey]);
    const bk = gk + '||' + xk;
    if (!buckets.has(bk)) buckets.set(bk, new Map());
    const bucket = buckets.get(bk);
    const v = +row[valKey];
    if (isNaN(v)) continue;
    if (!bucket.has(sk)) bucket.set(sk, { sk, xk, vals: [] });
    bucket.get(sk).vals.push(v);
  }

  const offsets = new Map();
  let max = 0;
  for (const [, bucket] of buckets) {
    // Ordre d'empilement : celui fourni par seriesOrder, sinon ordre de rencontre
    const items = [...bucket.values()].sort(
      (a, b) => (orderIndex.get(a.sk) ?? 0) - (orderIndex.get(b.sk) ?? 0)
    );
    let acc = 0;
    for (const it of items) {
      const v = reduceValues(it.vals, aggregate ?? 'SUM');
      const y0 = acc;
      const y1 = acc + v;
      acc = y1;
      offsets.set(it.sk + '|' + it.xk, { y0, y1 });
    }
    if (acc > max) max = acc;
  }
  return { offsets, max };
}
