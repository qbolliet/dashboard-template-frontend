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

/**
 * Determines which chart kind to render from the detected column types.
 *
 * @param {object} params - Detection input.
 * @param {'date'|'number'|'categorical'} params.xType - Detected type of x.
 * @param {'date'|'number'|'categorical'} params.yType - Detected type of y.
 * @param {'date'|'number'|'categorical'} [params.zType] - Detected type of z.
 * @param {boolean} params.hasZ - Whether a z column was supplied.
 * @returns {'line'|'bar'|'bar-h'|'heatmap'|'violin-v'|'violin-h'|'density'} Chart kind.
 * @throws {Error} When z is supplied but is not numeric.
 */
export function detectChart({ xType, yType, zType, hasZ }) {
  if (hasZ) {
    if (zType !== 'number') {
      throw new Error("L'argument z doit être numérique.");
    }
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
