// =================================================================
// STACKING — empilement de séries (bar/line/violin) par canal
// =================================================================
// Importation des modules
import { mean, sum } from 'd3-array';
import { seriesKey, xKeyOf } from './encoding';

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
 * @param {'sum'|'mean'} [params.aggregate] - Aggregation used for duplicate (series, x) values.
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

  // Regroupe les lignes par (clé de groupe, clé d'abscisse) ; agrège les
  // doublons série/x si nécessaire (aggregate: 'sum' | 'mean').
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
      const v = aggregate === 'mean' ? mean(it.vals) : sum(it.vals);
      const y0 = acc;
      const y1 = acc + v;
      acc = y1;
      offsets.set(it.sk + '|' + it.xk, { y0, y1 });
    }
    if (acc > max) max = acc;
  }
  return { offsets, max };
}
