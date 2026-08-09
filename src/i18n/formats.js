// =================================================================
// FORMATS — conventions de nombre, de date et de tri par langue
// =================================================================
// Ce qu'une traduction NE couvre pas : `1 234,5` contre `1,234.5`, `31/12/2026` contre
// `12/31/2026`, la semaine qui commence lundi ou dimanche, l'espace avant le signe
// pourcent. Ces conventions ne sont pas des libellés — elles ne vivent donc pas dans les
// dictionnaires mais ici, et elles pilotent Intl comme d3.
//
// CE QUE CETTE TABLE CORRIGE, et qui était cassé avant ce lot : le dépôt affichait
// simultanément `1 234,5` (Intl, via formatNumber, dans les StatCard et les tableaux) et
// `1,234.5` (d3-format, sur les axes de graphique), sur le même écran. Aucun
// `formatDefaultLocale` n'était installé, donc d3 restait à son défaut en-US, et
// `utcFormat('%b %Y')` imprimait des mois ANGLAIS sous une interface française. La
// correction tient à ce qu'un seul point décide désormais pour les deux moteurs.
//
// AJOUTER UNE LANGUE : une entrée ici, plus les deux fichiers de locale d3 (voir
// ./d3Locale.js). Une langue absente de cette table retombe sur `defaultLocale` avec un
// avertissement de `npm run check:i18n`.

import { DEFAULT_LOCALE } from './config';

/**
 * @typedef {Object} LocaleFormats
 * @property {string} intlLocale - Full BCP 47 tag handed to `Intl.*` and to
 *   `String.prototype.localeCompare`. Distinct from the site locale code: the site
 *   serves `fr`, but `Intl` wants a region to pick a grouping separator.
 * @property {string} currency - ISO 4217 code used when a format spec asks for a
 *   currency without naming one.
 * @property {string} percentSuffix - What follows a percentage, separator included.
 *   French inserts a narrow no-break space, English nothing.
 * @property {string} dateMask - Human-readable date mask, shown as an input placeholder
 *   and used to build the parsing regex (see src/components/filter/utils/dateParse.js).
 * @property {string} dateOrder - Order of the mask's parts, as a permutation of
 *   'D', 'M' and 'Y'. This is what `parseDate` reads; the mask is only its display.
 * @property {number} firstDayOfWeek - 0 for Sunday, 1 for Monday. Drives the column
 *   order of the calendar grid.
 * @property {string} d3Locale - Name of the d3 locale files to install, shared by
 *   `d3-format/locale/*` and `d3-time-format/locale/*`.
 * @property {string} siPrefixBillion - The SI 'G' prefix of `d3-format` is rewritten to
 *   this. English says "B" for billion; French keeps the SI "G".
 */

/**
 * Formatting conventions per shipped locale.
 *
 * @type {Object<string, LocaleFormats>}
 */
export const FORMATS = {
    fr: {
        intlLocale: 'fr-FR',
        currency: 'EUR',
        // U+202F, espace fine insécable : la typographie française l'impose avant le
        // signe pourcent. Une espace ordinaire y autoriserait un retour à la ligne.
        percentSuffix: ' %',
        dateMask: 'JJ/MM/AAAA',
        dateOrder: 'DMY',
        firstDayOfWeek: 1,
        d3Locale: 'fr-FR',
        siPrefixBillion: 'G',
    },
    en: {
        intlLocale: 'en-US',
        currency: 'USD',
        percentSuffix: '%',
        dateMask: 'MM/DD/YYYY',
        dateOrder: 'MDY',
        firstDayOfWeek: 0,
        d3Locale: 'en-US',
        siPrefixBillion: 'B',
    },
};

/**
 * Reads the formatting conventions of a locale.
 *
 * @param {string} [locale] - Site locale code.
 * @returns {LocaleFormats} The conventions, falling back to the default locale for an
 *   unknown code — never `undefined`, so no caller has to guard.
 */
export const formatsFor = (locale) => FORMATS[locale] ?? FORMATS[DEFAULT_LOCALE];

/**
 * Reads the full Intl tag of a locale.
 *
 * Shorthand for the overwhelmingly common case, worth its own export because it is what
 * every `Intl.NumberFormat` / `Intl.DateTimeFormat` / `localeCompare` call needs.
 *
 * @param {string} [locale] - Site locale code.
 * @returns {string} e.g. 'fr-FR'.
 */
export const intlLocaleFor = (locale) => formatsFor(locale).intlLocale;
