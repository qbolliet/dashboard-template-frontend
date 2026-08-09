// =================================================================
// PLURALIZE — accord en nombre d'un libellé, selon les règles de la langue
// =================================================================
// Remplace le motif `n > 1 ? 's' : ''` qui traînait dans le dépôt (TableFooter,
// TokenReference). Ce motif est doublement faux :
//
//   • il est FAUX EN FRANÇAIS pour zéro — « 0 ligne » s'écrit au singulier, et
//     `0 > 1` est bien `false`… mais `1.5 > 1` est `true`, or « 1,5 ligne » est aussi
//     un singulier. Le test sur `> 1` tombe juste par accident sur les entiers ;
//   • il est FAUX DÈS QU'ON TRADUIT — l'anglais met zéro au pluriel (« 0 rows »), le
//     polonais a trois formes, l'arabe six. Coller un « s » n'est pas une règle
//     d'accord, c'est une coïncidence orthographique de deux langues.
//
// `Intl.PluralRules` connaît ces règles pour toutes les locales et est disponible
// partout (Node ≥ 13, tous les navigateurs cibles) — aucune dépendance.
//
// Côté dictionnaire, un libellé accordable est un OBJET de catégories CLDR plutôt
// qu'une chaîne :
//
//   rowCount: { one: '{count} ligne', other: '{count} lignes' }        // fr
//   rowCount: { one: '{count} row',   other: '{count} rows' }          // en
//
// Les six catégories possibles sont `zero`, `one`, `two`, `few`, `many`, `other`. Une
// langue n'en déclare que celles qui la concernent ; `other` est la seule obligatoire,
// et sert de repli à toutes les autres.

import { interpolate } from './interpolate';

/**
 * Selects and fills the plural form of a label for a given count.
 *
 * @param {Object<string, string>|string} forms - Either a map of CLDR plural categories
 *   (`one`, `other`, …) to label templates, or a plain string when the label does not
 *   vary. A `{count}` placeholder is filled automatically.
 * @param {number} count - The quantity to agree with.
 * @param {string} intlLocale - Full Intl locale, e.g. 'fr-FR' (see src/i18n/formats.js).
 * @param {Object<string, *>} [values] - Extra placeholder values, merged with `count`.
 * @returns {string} The agreed, interpolated label.
 */
export const pluralize = (forms, count, intlLocale, values) => {
    // Forme dégradée tolérée : un libellé qui ne varie pas en nombre reste une chaîne
    // dans le dictionnaire. Évite d'imposer `{ one, other }` identiques partout.
    if (typeof forms === 'string') return interpolate(forms, { count, ...values });
    if (forms == null || typeof forms !== 'object') return '';

    const category = new Intl.PluralRules(intlLocale).select(count);
    // `other` est la seule catégorie que le CLDR garantit dans toutes les langues :
    // c'est le repli, y compris quand une traduction n'a pas rempli sa catégorie.
    const template = forms[category] ?? forms.other ?? '';

    return interpolate(template, { count, ...values });
};
