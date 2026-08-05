// =================================================================
// SEARCH MATCH — comparaison insensible à la casse et aux accents
// =================================================================
// Repli NFD + suppression des marques diacritiques : chaque lettre accentuée
// composée (« é ») compte pour UN seul caractère avant comme après, donc les
// indices calculés sur la chaîne repliée restent valides pour découper la
// chaîne ORIGINALE (surlignage du fragment correspondant).

const DIACRITIC_MARKS = /[̀-ͯ]/g;

/**
 * Folds a string for comparison: lower-cased, diacritics stripped, same length
 * as the input for common Latin accents.
 *
 * @param {string} value - The string to fold.
 * @returns {string} The folded string.
 */
const fold = (value) => value.normalize('NFD').replace(DIACRITIC_MARKS, '').toLowerCase();

/**
 * Locates the first occurrence of a query inside a string, ignoring case and
 * diacritics on both sides.
 *
 * @param {?string} value - The haystack, in its original form. Absent values
 *   (e.g. an entry with no description) never match.
 * @param {string} query - The needle, already trimmed and non-empty.
 * @returns {?{start: number, end: number}} Match bounds on the ORIGINAL
 *   `value` string, or `null` if the query isn't found.
 */
export const findMatch = (value, query) => {
    if (!value || !query) return null;

    const index = fold(value).indexOf(fold(query));
    if (index === -1) return null;

    return { start: index, end: index + query.length };
};
