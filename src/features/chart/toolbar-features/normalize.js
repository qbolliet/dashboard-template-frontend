// =================================================================
// FEATURE — normalize (barre de normalisation → 100)
// =================================================================
// Descripteur + rôle TRANSFORM. Rescale chaque série pour que sa valeur à `barPos`
// vaille 100 (line/bar/bar-h), ou rebase la valeur z sur celle du point le plus
// proche du réticule (heatmap/density). Porté à l'identique du prototype
// (features.jsx : normalize, normalizeRefs, normalizeTransform,
// normalizeReticleTransform).

// Importation des modules
import { seriesKey } from '../utils/encoding';
import NormalizeOverlay from '../components/overlays/NormalizeOverlay/NormalizeOverlay';

const TWO_D = (k) => k === 'line' || k === 'bar' || k === 'bar-h';

/**
 * Reference value of each series at `barPos` (exact match, else linear
 * interpolation between neighbours). Extracted so the same reference scales both
 * the CI bounds and the projection (which live in separate datasets untouched by
 * the transform).
 *
 * @param {Array<object>} data - Coerced rows.
 * @param {object} params
 * @param {string} params.posKey - Position column.
 * @param {string} params.valKey - Value column.
 * @param {{color: ?string, style: ?string, marker: ?string}} params.channels - Active channels.
 * @param {*} params.barPos - Bar domain position.
 * @returns {Map<string, ?number>} series key → reference value (null when unusable).
 */
export function normalizeRefs(data, { posKey, valKey, channels, barPos }) {
  const refOf = new Map();
  if (barPos == null) return refOf;
  const byKey = new Map();
  for (const r of data) {
    const k = seriesKey(r, channels);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }
  const toNum = (v) => (v instanceof Date ? +v : +v);
  const target = toNum(barPos);
  for (const [k, rows] of byKey) {
    const sorted = [...rows].filter((r) => r[posKey] != null && !isNaN(+r[valKey]))
      .sort((a, b) => toNum(a[posKey]) - toNum(b[posKey]));
    if (!sorted.length) { refOf.set(k, null); continue; }
    // catégoriel : match exact, sinon interpolation linéaire entre voisins.
    let ref = null;
    const exact = sorted.find((r) => String(r[posKey]) === String(barPos));
    if (exact) ref = +exact[valKey];
    else {
      let lo = null, hi = null;
      for (const r of sorted) { const p = toNum(r[posKey]); if (p <= target) lo = r; if (p >= target && hi == null) hi = r; }
      if (lo && hi && lo !== hi) {
        const p0 = toNum(lo[posKey]), p1 = toNum(hi[posKey]);
        const t = (target - p0) / (p1 - p0 || 1);
        ref = +lo[valKey] + t * (+hi[valKey] - +lo[valKey]);
      } else ref = +(lo || hi || sorted[0])[valKey];
    }
    refOf.set(k, ref);
  }
  return refOf;
}

/**
 * Reticle transform (heatmap/density): rebases z on the value of the point
 * nearest the reticle (`barPos = { x, y }`).
 *
 * @param {Array<object>} data - Coerced rows.
 * @param {object} params
 * @param {string} params.x - x column.
 * @param {string} params.y - y column.
 * @param {string} params.z - z column.
 * @param {?{x: *, y: *}} params.barPos - Reticle position.
 * @returns {Array<object>} Rows with rebased z (same reference when inactive).
 */
export function normalizeReticleTransform(data, { x, y, z, barPos }) {
  if (!barPos || !z) return data;
  const tx = barPos.x, ty = barPos.y;
  if (tx == null || ty == null) return data;
  const isNum = (v) => v != null && !(v instanceof Date) && !isNaN(+v);
  const axisDist = (rv, tv) => {
    if (isNum(rv) && isNum(tv)) return Math.abs(+rv - +tv);
    return String(rv) === String(tv) ? 0 : 1e9;
  };
  let best = null, bd = Infinity;
  for (const r of data) {
    if (r[z] == null || isNaN(+r[z])) continue;
    const dx = axisDist(r[x], tx), dy = axisDist(r[y], ty);
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = r; }
  }
  const ref = best ? +best[z] : null;
  if (ref == null || ref === 0) return data;
  return data.map((r) => ((r[z] == null || isNaN(+r[z])) ? r : { ...r, [z]: (+r[z] / ref) * 100 }));
}

/**
 * Transform role: rescales each series so its value at `barPos` = 100 (2-D), or
 * rebases z on the nearest reticle point (heatmap/density).
 *
 * @param {Array<object>} data - Coerced rows.
 * @param {object} params - { posKey, valKey, channels, barPos, chartKind, x, y, z }.
 * @returns {Array<object>} Transformed rows (same reference when inactive).
 */
export function normalizeTransform(data, { posKey, valKey, channels, barPos, chartKind, x, y, z }) {
  if (chartKind === 'heatmap' || chartKind === 'density') {
    return normalizeReticleTransform(data, { x, y, z, barPos });
  }
  if (barPos == null) return data;
  const refOf = normalizeRefs(data, { posKey, valKey, channels, barPos });
  return data.map((r) => {
    const k = seriesKey(r, channels);
    const ref = refOf.get(k);
    if (ref == null || ref === 0) return r;
    return { ...r, [valKey]: (+r[valKey] / ref) * 100 };
  });
}

/**
 * Normalization feature factory (bar along the value axis in 2-D, reticle in 3-D).
 *
 * @param {object} [config] - { value, draggable, color, dash, label, id }.
 * @returns {object} Feature descriptor.
 */
export function normalize(config = {}) {
  return {
    id: config.id || 'normalize',
    kind: 'normalize',
    label: config.label || 'Barre de normalisation (100)',
    icon: 'normalize',
    roles: ['transform', 'overlay', 'interaction'],
    // 2D : barre le long de l'axe valeur. x,y,z (heatmap/density) : réticule.
    supports: (k) => TWO_D(k) || k === 'heatmap' || k === 'density',
    defaultOn: !!config.defaultOn,
    initialValue: config.value,
    Overlay: NormalizeOverlay,
    transform: normalizeTransform,
    config,
  };
}
