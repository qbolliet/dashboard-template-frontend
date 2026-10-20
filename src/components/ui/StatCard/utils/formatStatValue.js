// =================================================================
// FORMAT STAT VALUE — valeur affichée par <StatCard>
// =================================================================
// Fine surcouche du formatteur partagé src/utils/format/formatNumber : elle n'ajoute
// que ce qui est propre à la carte — placeholder pour une valeur vide, spec absente,
// formatteur fourni sous forme de fonction.

import { formatNumber } from '@/utils/format/formatNumber';
import { formatValue } from '@/utils/format/formatValue';
import { EMPTY_PLACEHOLDER } from '@/utils/format/constants';

/**
 * Formats a stat value according to a FormatSpec (Intl.NumberFormat based), or via a
 * custom formatter function. Shares its numeric rendering with the table feature through
 * {@link formatNumber}.
 *
 * @param {number|string|null} [value] - Raw value to format. Strings accept French notation
 *   ('1 234,5' — spaces stripped, comma treated as decimal separator).
 * @param {import('@/utils/format/formatNumber').FormatSpec|Function} [f] - A FormatSpec object
 *   (which may carry the API's `displayFormat` and `unit` instead of Intl fields — see
 *   {@link formatValue}), or a custom formatter fn(value) returning the display string
 *   directly. Nullish returns `value` unchanged.
 * @returns {number|string} The formatted value, or an em dash placeholder when `value` is
 *   null, undefined or an empty string — that guard applies even without a format spec.
 */
export const formatStatValue = (value, f) => {
    // Garde en tête, avant même le test sur `f` : sans elle, parseFloat('null') = NaN et la
    // carte afficherait la chaîne "null" en gras.
    if (value == null || value === '') return EMPTY_PLACEHOLDER;

    if (f == null) return value;
    if (typeof f === 'function') return f(value);

    // Un `displayFormat` (spécificateur d3-format, tel que l'API le fournit) prime sur
    // les champs Intl de la spec ; sans lui, formatValue rend null et rien ne change.
    return formatValue(value, f, f.locale) ?? formatNumber(value, f);
};
