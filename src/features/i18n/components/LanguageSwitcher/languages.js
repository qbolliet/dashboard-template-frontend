// Source des langues par défaut du groupe LanguageSwitcher + résolution de
// l'URL des drapeaux. Aucun React, aucun effet de bord : ce module doit pouvoir
// être importé aussi bien par un composant client (LanguageSwitcher) que par un
// script de build ou un test, sans traîner de dépendance à `src/i18n/` — la présentation ne lit jamais le dictionnaire.

/**
 * @typedef {Object} Language
 * @property {string} code - Code langue ISO 639-1 (ex. "fr"). Sert de valeur
 *   remontée par le composant et d'attribut `lang` posé sur chaque option.
 * @property {string} country - Code pays ISO 3166-1 alpha-2 (ex. "FR"). Pilote
 *   le drapeau affiché et le badge du bouton — distinct de `code` car une langue
 *   n'est pas un pays (ex. "en" se drapeau avec "GB", pas "EN").
 * @property {string} name - Nom de la langue, écrit dans sa propre langue.
 */

// Langue affichée dans sa propre langue, jamais traduite : convention universelle
// des sélecteurs de langue — qui cherche l'anglais cherche « English », pas
// « Anglais », et n'a donc pas besoin de connaître la langue courante de l'UI pour
// reconnaître la sienne dans la liste.
/** @type {Language[]} */
export const DEFAULT_LANGUAGES = [
  { code: 'fr', country: 'FR', name: 'Français' },
  { code: 'en', country: 'GB', name: 'English' },
  { code: 'es', country: 'ES', name: 'Español' },
  { code: 'de', country: 'DE', name: 'Deutsch' },
  { code: 'it', country: 'IT', name: 'Italiano' },
  { code: 'pt', country: 'PT', name: 'Português' },
  { code: 'nl', country: 'NL', name: 'Nederlands' },
  { code: 'ja', country: 'JP', name: '日本語' },
];

/**
 * Resolves the flag image URL for a given country code.
 *
 * @param {string} [country] - ISO 3166-1 alpha-2 country code (case-insensitive).
 * @returns {?string} The flagcdn.com SVG URL, or null when no country is given.
 */
export const flagCdnSrc = (country) => (country ? `https://flagcdn.com/${country.toLowerCase()}.svg` : null);
