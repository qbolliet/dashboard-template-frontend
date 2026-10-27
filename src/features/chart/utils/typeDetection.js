// =================================================================
// TYPE DETECTION — détection de type de colonne et sélection du chart
// =================================================================


/**
 * Detects a column's data type from a sample of raw values.
 *
 * @param {Array<*>} values - Raw column values (may include null/"" holes).
 * @returns {'date'|'number'|'categorical'} Detected type.
 */
export function detectType(values) {
  // Ignore les trous (null/undefined/chaîne vide) pour l'échantillonnage
  const sample = values.filter((v) => v != null && v !== '');
  if (sample.length === 0) return 'categorical';

  // Colonne déjà typée (Date ou number natif)
  if (sample[0] instanceof Date) return 'date';
  if (typeof sample[0] === 'number') return 'number';

  // Chaînes de caractères — on tente date puis nombre sur un échantillon de 30
  if (typeof sample[0] === 'string') {
    const check = sample.slice(0, Math.min(30, sample.length));
    const isDateLike = (s) =>
      /^\d{4}-\d{2}/.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s) || /^[A-Z][a-z]+\s\d/.test(s);
    const dates = check.filter((v) => isDateLike(v) && !isNaN(Date.parse(v))).length;
    if (dates / check.length > 0.8) return 'date';

    const nums = check.filter((v) => v !== '' && !isNaN(Number(v))).length;
    if (nums / check.length > 0.8) return 'number';
  }
  return 'categorical';
}

/**
 * Coerces a raw value to its detected column type.
 *
 * @param {*} value - Raw value.
 * @param {'date'|'number'|'categorical'} type - Detected column type.
 * @returns {Date|number|string|null} Coerced value, or null for a hole.
 */
export function coerce(value, type) {
  if (value == null || value === '') return null;
  if (type === 'date') return value instanceof Date ? value : new Date(value);
  if (type === 'number') return +value;
  return String(value);
}

// Marques possibles de la 3e dimension (prop `zMark` de <Chart>).
const Z_MARKS = ['density', 'bubble'];

/**
 * Determines which chart kind to render from the detected column types.
 *
 * With a numeric z, `zMark` picks how the third dimension is drawn:
 *   - `'density'` (default): heatmap (categorical × categorical), violin (categorical ×
 *     continuous, `'violin-v'` / `'violin-h'`) or 2-D density (continuous × continuous);
 *   - `'bubble'`: a single `'bubble'` kind for the three combinations — one marker per
 *     observation (per cell × series on two categorical axes), its AREA proportional to
 *     z. The position scales then follow xType / yType as for any other kind, and
 *     `layoutKindOf` tells which kind it borrows its zoom, brush and minimaps from.
 *
 * @param {object} params - Detection input.
 * @param {'date'|'number'|'categorical'} params.xType - Detected type of x.
 * @param {'date'|'number'|'categorical'} params.yType - Detected type of y.
 * @param {'date'|'number'|'categorical'} [params.zType] - Detected type of z.
 * @param {boolean} params.hasZ - Whether a z column was supplied.
 * @param {'density'|'bubble'} [params.zMark='density'] - Mark of the third dimension.
 * @returns {'line'|'bar'|'bar-h'|'heatmap'|'violin-v'|'violin-h'|'density'|'bubble'} Chart kind.
 * @throws {Error} When z is supplied but is not numeric, or `zMark` is unknown.
 */
export function detectChart({ xType, yType, zType, hasZ, zMark = 'density' }) {
  if (hasZ) {
    if (zType !== 'number') {
      throw new Error("L'argument z doit être numérique.");
    }
    if (!Z_MARKS.includes(zMark)) {
      throw new Error(`L'argument zMark doit valoir ${Z_MARKS.map((m) => `'${m}'`).join(' ou ')}.`);
    }
    // Bulles : un seul kind, les échelles se déduisent ensuite des types d'axes
    if (zMark === 'bubble') return 'bubble';
    if (xType === 'categorical' && yType === 'categorical') return 'heatmap';
    if (xType === 'categorical' && (yType === 'number' || yType === 'date')) return 'violin-v';
    if (yType === 'categorical' && (xType === 'number' || xType === 'date')) return 'violin-h';
    return 'density';
  }
  // Catégoriel en abscisse + numérique en ordonnée → barres verticales
  if (xType === 'categorical' && (yType === 'number' || yType === 'date')) return 'bar';
  // Catégoriel en ordonnée + numérique en abscisse → barres horizontales
  if (yType === 'categorical' && (xType === 'number' || xType === 'date')) return 'bar-h';
  // Deux axes continus → ligne (fill:'none' bascule en nuage de points côté Chart)
  if (yType === 'number' && (xType === 'number' || xType === 'date')) return 'line';
  return 'line';
}

/**
 * Kind whose layout (band padding, zoom, brush, minimaps, aggregation mode) a chart kind
 * follows. Every kind follows itself, except `'bubble'`, which behaves like the kind it
 * replaces: `'heatmap'` on two categorical axes, `'violin-v'` / `'violin-h'` on one
 * categorical axis, `'density'` on two continuous axes.
 *
 * @param {?string} chartKind - Kind returned by `detectChart`.
 * @param {'date'|'number'|'categorical'} xType - Type of x.
 * @param {'date'|'number'|'categorical'} yType - Type of y.
 * @returns {?string} The layout kind.
 */
export const layoutKindOf = (chartKind, xType, yType) => {
  if (chartKind !== 'bubble') return chartKind;
  const xCat = xType === 'categorical';
  const yCat = yType === 'categorical';
  if (xCat && yCat) return 'heatmap';
  if (xCat) return 'violin-v';
  if (yCat) return 'violin-h';
  return 'density';
};
