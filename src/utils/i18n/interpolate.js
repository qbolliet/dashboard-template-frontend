// =================================================================
// INTERPOLATE — gabarits de libellés à trous nommés
// =================================================================
// Beaucoup de libellés du dépôt sont dynamiques : « Trier par Région », « Supprimer la
// colonne « PIB » », « 12 lignes ». La tentation est d'en faire des FONCTIONS dans le
// dictionnaire (`sort: (col) => `Trier par ${col}``). C'est impossible ici, et le
// savoir évite une réécriture :
//
//   le dictionnaire est chargé par un Server Component (`getDictionary`) puis passé en
//   prop à des composants CLIENTS — <Header>, <Table>, <SelectMenu> portent tous
//   'use client'. Une fonction ne traverse pas cette frontière de sérialisation ; React
//   lève « Functions cannot be passed directly to Client Components ».
//
// D'où le gabarit à trous nommés : une CHAÎNE, donc sérialisable, résolue au point de
// rendu. Les trous sont nommés et non positionnels parce que l'ordre des mots n'est pas
// universel — c'est précisément ce qu'une concaténation en JSX empêche de traduire.
//
// Volontairement minimal : pas de pluriels ni de formatage de nombre ici. Les pluriels
// passent par `pluralize` (même dossier, qui s'appuie sur Intl.PluralRules), les nombres
// par src/utils/format/formatNumber.js.

// Un trou = {nom}, en lettres, chiffres et tirets bas. La forme est volontairement
// stricte : elle ne peut pas entrer en collision avec une accolade littérale d'un
// libellé décrivant du code (les pages de documentation en affichent).
const PLACEHOLDER_RE = /\{([A-Za-z0-9_]+)\}/g;

/**
 * Fills the named placeholders of a label template.
 *
 * @param {string} template - Label holding `{name}` placeholders, e.g. 'Trier par {column}'.
 * @param {Object<string, *>} [values] - Value per placeholder name. Values are coerced
 *   with `String()`.
 * @returns {string} The filled label. A placeholder with no matching value is left
 *   verbatim rather than replaced by 'undefined' — a visible `{column}` in the interface
 *   names the missing key, where an empty string would silently produce a mutilated
 *   accessible name.
 */
export const interpolate = (template, values) => {
    if (typeof template !== 'string') return '';
    if (values == null) return template;

    return template.replace(PLACEHOLDER_RE, (match, name) => {
        const value = values[name];

        // `null` et `undefined` laissent le trou apparent (cf. docstring). Zéro et la
        // chaîne vide, eux, sont des valeurs légitimes et doivent être substitués.
        if (value === undefined || value === null) return match;

        return String(value);
    });
};

/**
 * Lists the placeholder names a template expects.
 *
 * Used by `scripts/check-i18n.js` to verify that a translation keeps every placeholder
 * of its French reference — a template that drops `{column}` silently renders a label
 * with a hole in its meaning.
 *
 * @param {string} template - Label template.
 * @returns {string[]} Placeholder names, in order of first appearance, without duplicates.
 */
export const placeholdersOf = (template) => {
    if (typeof template !== 'string') return [];

    // `matchAll` plutôt que `match` : on veut les groupes de capture, pas les
    // correspondances entières avec leurs accolades.
    return [...new Set([...template.matchAll(PLACEHOLDER_RE)].map((match) => match[1]))];
};
