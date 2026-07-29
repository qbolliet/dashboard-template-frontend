// =================================================================
// FORMAT STAT VALUE — valeur affichée par <StatCard>
// =================================================================
// Fine surcouche du formatteur partagé src/utils/format/formatNumber : elle n'ajoute
// que ce qui est propre à la carte — placeholder pour une valeur vide, spec absente,
// formatteur fourni sous forme de fonction.

import { formatNumber } from '@/utils/format/formatNumber';

// Tiret cadratin : même placeholder que les cellules vides de la table (formatCell.js).
const EMPTY_PLACEHOLDER = '—';

/**
 * Formats a stat value according to a FormatSpec (Intl.NumberFormat based), or via a
 * custom formatter function. Shares its numeric rendering with the table feature through
 * {@link formatNumber}.
 *
 * @param {number|string|null} [value] - Raw value to format. Strings accept French notation
 *   ('1 234,5' — spaces stripped, comma treated as decimal separator).
 * @param {import('@/utils/format/formatNumber').FormatSpec|Function} [f] - A FormatSpec object,
 *   or a custom formatter fn(value) returning the display string directly. Nullish returns
 *   `value` unchanged.
 * @returns {number|string} The formatted value, or an em dash placeholder when `value` is
 *   null, undefined or an empty string — that guard applies even without a format spec.
 */
export const formatStatValue = (value, f) => {
    // Garde en tête, avant même le test sur `f` : sans elle, parseFloat('null') = NaN et la
    // carte afficherait la chaîne "null" en gras.
    if (value == null || value === '') return EMPTY_PLACEHOLDER;

    if (f == null) return value;
    if (typeof f === 'function') return f(value);

    return formatNumber(value, f);
};

export default formatStatValue;
