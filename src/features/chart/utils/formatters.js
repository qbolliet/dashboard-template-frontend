// =================================================================
// FORMATTERS — mise en forme des valeurs d'axe (dates, nombres, texte)
// =================================================================
// Importation des modules
// `format` est importé sous l'alias `d3Format` : le paramètre `format` de
// resolveFormatter (spec utilisateur, string|Function) porte le même nom que
// dans le prototype et masquerait sinon l'import.

import { format as d3Format } from 'd3-format';
import { utcFormat } from 'd3-time-format';

/**
 * Builds the default formatter for a column type, given a representative sample.
 *
 * @param {'date'|'number'|'categorical'} type - Column type.
 * @param {Array<*>} [sample] - Sorted sample (used for dates to pick a sensible granularity).
 * @returns {(value: *) => string} Formatter function.
 */
export function defaultFormat(type, sample) {
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
      if (abs >= 1e9) return d3Format('.2~s')(v).replace('G', 'B');
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
 * @returns {(value: *) => string} Resolved formatter function.
 */
export function resolveFormatter(format, type, sample) {
  if (typeof format === 'function') return format;
  if (typeof format === 'string' && format.length > 0) {
    if (type === 'date') return utcFormat(format);
    if (type === 'number') return d3Format(format);
  }
  return defaultFormat(type, sample);
}
