// =================================================================
// I18N CONFIG — les langues du site, dérivées du manifeste
// =================================================================
// Source UNIQUE des langues servies. Tout le reste du dépôt — routes générées, index de
// recherche, sélecteur de langue, négociation, scripts de vérification — lit ces trois
// exports et jamais `site.config.json` directement, pour qu'ajouter une langue reste un
// geste à un seul endroit.
//
// Ce module est volontairement sans dépendance React et sans effet de bord : il est
// importé aussi bien par des Server Components que par des composants clients et par
// `examples/middleware.ts`.
//
// AJOUTER UNE LANGUE — la liste complète des gestes, dans l'ordre :
//   1. son code dans `site.locales` de config/site.config.json ;
//   2. src/i18n/dictionaries/<code>.js (copier fr.js et traduire) ;
//   3. une branche dans le `switch` de src/i18n/getDictionary.js — l'import doit
//      rester LITTÉRAL, cf. l'en-tête de ce fichier ;
//   4. une entrée dans FORMATS de src/i18n/formats.js ;
//   5. `npm run check:i18n` liste ce qui manque encore.
// Les routes, l'index de recherche et la suite Playwright se déduisent seuls.

import siteConfig from '@config/site.config.json';

/**
 * Locale codes the site ships, in order of preference.
 *
 * The order is meaningful: `negotiateLocale` resolves a region-less request (`pt`) to
 * the first declared variant (`pt-BR` before `pt-PT`).
 *
 * @type {string[]}
 */
export const LOCALES = siteConfig.site.locales;

/**
 * Fallback locale, used whenever the visitor's language is not available and whenever a
 * translation is missing — in the manifest as in the interface dictionaries.
 *
 * @type {string}
 */
export const DEFAULT_LOCALE = siteConfig.site.defaultLocale;

/**
 * Tells whether a value is one of the shipped locale codes.
 *
 * Used to guard the `[locale]` route segment: an unknown code must trigger `notFound()`
 * rather than render the default locale under a wrong URL, which would duplicate every
 * page under an unbounded number of paths.
 *
 * @param {*} value - Candidate locale code.
 * @returns {boolean} True when the code is shipped.
 */
export const isLocale = (value) => typeof value === 'string' && LOCALES.includes(value);
