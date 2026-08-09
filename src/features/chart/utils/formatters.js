// =================================================================
// FORMATTERS — mise en forme des valeurs d'axe (dates, nombres, texte)
// =================================================================
// CE QUE CE FICHIER CORRIGEAIT MAL AVANT P5.4, et qui était le défaut de cohérence le
// plus visible du dépôt : il importait `format` et `utcFormat` DIRECTEMENT de d3, donc
// dans la locale par défaut de d3, qui est en-US. Sur un même écran français, les axes
// affichaient `1,234.5` et des mois `Jan`/`Feb`, pendant que le tableau et les StatCard
// affichaient `1 234,5` via Intl. Aucun `formatDefaultLocale` n'était installé nulle part.
//
// Les formateurs sont désormais construits à partir de `d3LocaleFor(locale)`, qui renvoie
// des fonctions LIÉES à une langue sans toucher à l'état global de d3 — indispensable au
// build, où les pages françaises et anglaises sont rendues dans le même processus.
// Voir src/i18n/d3Locale.js.

import { d3LocaleFor } from '@/i18n/d3Locale';

/**
 * Builds the default formatter for a column type, given a representative sample.
 *
 * @param {'date'|'number'|'categorical'} type - Column type.
 * @param {Array<*>} [sample] - Sorted sample (used for dates to pick a sensible granularity).
 * @param {string} [locale] - Site locale code driving month names and number separators.
 * @returns {(value: *) => string} Formatter function.
 */
export function defaultFormat(type, sample, locale) {
  const { format: d3Format, utcFormat, siPrefixBillion } = d3LocaleFor(locale);

  if (type === 'date') {
    // Choisit un format adapté à l'étendue de la série (bornes du sample)
    if (Array.isArray(sample) && sample.length >= 2) {
      const [a, b] = [+sample[0], +sample[sample.length - 1]];
      const span = Math.abs(b - a);
      const DAY = 86400000;
      if (span < 3 * DAY) return utcFormat('%H:%M');
      if (span < 60 * DAY) return utcFormat('%d %b');
      if (span < 730 * DAY) return utcFormat('%b %Y');
      return utcFormat('%Y');
    }
    return utcFormat('%Y-%m-%d');
  }
  if (type === 'number') {
    // Suffixe SI pour les grands nombres, sinon notation compacte
    return (v) => {
      if (v == null || isNaN(v)) return '';
      const abs = Math.abs(v);
      // Le préfixe SI 'G' se dit « B » (billion) en anglais et reste 'G' en français :
      // c'est une convention de locale, pas une traduction (cf. src/i18n/formats.js).
      if (abs >= 1e9) return d3Format('.2~s')(v).replace('G', siPrefixBillion);
      if (abs >= 1e6) return d3Format('.2~s')(v);
      if (abs >= 1e3) return d3Format(',')(Math.round(v));
      if (abs >= 1) return d3Format('.3~f')(v);
      return d3Format('.3~g')(v);
    };
  }
  return (v) => String(v ?? '');
}

/**
 * Resolves a user-supplied format (d3 spec string or function) into a formatter,
 * falling back to defaultFormat when none is supplied.
 *
 * @param {string|Function} format - User format: a d3-format/d3-time-format spec
 *   string, or a formatter function.
 * @param {'date'|'number'|'categorical'} type - Column type.
 * @param {Array<*>} [sample] - Sorted sample, forwarded to defaultFormat.
 * @param {string} [locale] - Site locale code. A caller that omits it gets the template's
 *   default language, which is what a chart installed on its own from the registry needs.
 * @returns {(value: *) => string} Resolved formatter function.
 */
export function resolveFormatter(format, type, sample, locale) {
  if (typeof format === 'function') return format;
  if (typeof format === 'string' && format.length > 0) {
    const { format: d3Format, utcFormat } = d3LocaleFor(locale);
    if (type === 'date') return utcFormat(format);
    if (type === 'number') return d3Format(format);
  }
  return defaultFormat(type, sample, locale);
}
