// =================================================================
// FORMAT VALUE — formateur unique des valeurs décrites par les métadonnées de colonne
// =================================================================
// L'API décrit chaque colonne par un `displayFormat` (spécificateur d3-format, ex.
// `',.2f'`, `'.1%'`) et une `unit` (ex. `'€'`). Ce module est le SEUL endroit qui les
// transforme en texte : axes et infobulles du graphique, cellules du tableau, StatCard
// et plages d'indicateurs l'appellent tous, pour qu'une même mesure s'écrive de la même
// façon partout sur l'écran.
//
// Il vit dans src/utils/ et reste donc sans dépendance à la configuration du site : la
// langue arrive sous forme de tag Intl (`intlLocale`), jamais de code de langue du site.
// Le prix de cette indépendance est une petite table locale → définition d3, qui double
// celle de src/i18n/d3Locale.js. Les deux ne portent que fr-FR et en-US ; ajouter une
// langue demande donc d'y toucher aussi (le repli est le même : fr-FR). Aucun
// `import { format } from 'd3-format'` nu : ce serait la locale en-US de d3, qui
// contredirait silencieusement Intl.

import { formatLocale } from 'd3-format';
import frFormat from 'd3-format/locale/fr-FR';
import enFormat from 'd3-format/locale/en-US';

import { DEFAULT_INTL_LOCALE } from './constants';

// Locales d3 liées à une langue, construites une seule fois : `formatLocale` ne touche
// pas à l'état global de d3 (contrairement à `formatDefaultLocale`).
// `percent` est le suffixe du spécificateur `%` de la définition (absent en en-US, où le
// signe se colle au nombre) : une unité « % » s'écrit comme lui, pas comme Intl, dont
// l'espace varie d'une version d'ICU à l'autre.
const D3_LOCALES = {
  fr: { locale: formatLocale(frFormat), percent: frFormat.percent },
  en: { locale: formatLocale(enFormat), percent: enFormat.percent },
};

// Les formateurs compilés sont mémorisés par (langue, spécificateur) : un axe appelle le
// formateur une fois par graduation, à chaque rendu.
const compiled = new Map();

/**
 * Metadata driving the formatting of a column. A `Metadata` object of the API (a `fields`
 * entry) fits as is.
 *
 * @typedef {Object} ValueSpec
 * @property {?string} [displayFormat] - d3-format specifier. Without it, no formatter is
 *   built and callers keep their own default rendering — `unit` alone is not displayed.
 * @property {?string} [unit] - Unit appended after the formatted number, unless the
 *   format already ends with it (a `$` or `%` specifier writes its own sign).
 */

/**
 * Picks the d3 locale matching an Intl tag.
 *
 * @param {string} intlLocale - Full Intl tag, e.g. 'en-US'.
 * @returns {{locale: import('d3-format').FormatLocaleObject, percent: ?string}} d3 locale
 *   and its percent suffix; fr-FR for an unknown language.
 */
const d3LocaleOf = (intlLocale) => {
  const language = String(intlLocale).split('-')[0];
  return D3_LOCALES[language] ?? D3_LOCALES[DEFAULT_INTL_LOCALE.split('-')[0]];
};

/**
 * Builds the number formatter of a column once, for reuse over many values (axis ticks,
 * table rows).
 *
 * @param {?ValueSpec} spec - Column metadata.
 * @param {string} [intlLocale] - Full Intl tag driving separators and the percent sign.
 * @returns {?function(*): string} Formatter, or `null` when the column has no usable
 *   `displayFormat` (absent, or rejected by d3) — the caller then applies its own default.
 *   The formatter returns the stringified input for a value that is not a number.
 */
export const valueFormatter = (spec, intlLocale = DEFAULT_INTL_LOCALE) => {
  const displayFormat = spec?.displayFormat;
  if (!displayFormat) return null;

  const unit = spec.unit || '';
  const key = `${intlLocale}\u0000${displayFormat}\u0000${unit}`;
  if (compiled.has(key)) return compiled.get(key);

  let formatter = null;
  try {
    const { locale, percent } = d3LocaleOf(intlLocale);
    const d3Format = locale.format(displayFormat);
    // Unité collée au nombre par une espace insécable (le « € » ne doit pas passer seul
    // à la ligne) ; « % » prend la typographie de la langue.
    const suffix = unit === '%' ? (percent ?? '%') : ` ${unit}`;

    formatter = (value) => {
      const n = typeof value === 'number' ? value : +value;
      if (value == null || value === '' || Number.isNaN(n)) return String(value ?? '');
      const text = d3Format(n);
      return unit && !text.endsWith(unit) ? `${text}${suffix}` : text;
    };
  } catch {
    // Spécificateur inconnu de d3 (`d3.format` lève « unknown format ») : repli du
    // consommateur plutôt qu'une route qui tombe sur une métadonnée mal saisie.
  }

  compiled.set(key, formatter);
  return formatter;
};

/**
 * Formats one value according to its column metadata.
 *
 * @param {*} value - Raw value (number, or numeric string).
 * @param {?ValueSpec} spec - Column metadata (`displayFormat`, `unit`).
 * @param {string} [intlLocale] - Full Intl tag, e.g. 'fr-FR'.
 * @returns {?string} The formatted text, or `null` when the column has no usable
 *   `displayFormat` — so that `formatValue(v, f, loc) ?? current rendering` keeps the
 *   historical behavior. Empty values are not handled here: guard upstream.
 */
export const formatValue = (value, spec, intlLocale = DEFAULT_INTL_LOCALE) => {
  const formatter = valueFormatter(spec, intlLocale);
  return formatter ? formatter(value) : null;
};
