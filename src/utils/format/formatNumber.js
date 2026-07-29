// =================================================================
// FORMAT NUMBER — formatage numérique localisé (sans dépendance React)
// =================================================================
// Formatteur canonique partagé par les consommateurs qui affichent un chiffre :
// <StatCard> (src/components/ui/) et la feature table (formatCell.js). Il vit dans
// la couche transverse src/utils/ car src/components/ ne peut pas dépendre de
// src/features/, et la table ne doit pas dépendre des internes d'un composant UI.

/**
 * Format specification driving {@link formatNumber}. Every field is optional.
 *
 * @typedef {Object} FormatSpec
 * @property {('number'|'currency'|'percent')} [style] - Formatting mode. 'currency' delegates
 *   entirely to Intl.NumberFormat and returns early (prefix/suffix/unit are ignored on that
 *   branch). 'percent' does NOT use Intl's percent style (no ×100 multiplication): it formats
 *   the raw number and appends a ' %' suffix unless a custom `suffix` is provided.
 * @property {string} [currency] - ISO currency code used when style is 'currency' (default: 'EUR').
 * @property {string} [locale] - Intl locale (default: 'fr-FR', kept explicit so server and
 *   client render identically regardless of the runtime's environment locale).
 * @property {number} [decimals] - Sets both minimumFractionDigits and maximumFractionDigits.
 * @property {number} [minDecimals] - Overrides minimumFractionDigits after `decimals` is applied.
 * @property {number} [maxDecimals] - Overrides maximumFractionDigits after `decimals` is applied.
 *   When both bounds end up defined and the minimum exceeds the maximum, the explicitly
 *   provided one wins over the one merely inherited from `decimals`: with
 *   `{ decimals: 3, maxDecimals: 1 }` the minimum drops to 1, while with
 *   `{ decimals: 1, minDecimals: 3 }` the maximum rises to 3. When both bounds are explicit
 *   (`{ minDecimals: 3, maxDecimals: 1 }`), the upper bound wins and the minimum drops.
 * @property {boolean} [compact] - Uses Intl's 'compact' notation (e.g. 1.2M).
 * @property {string} [prefix] - Text prepended to the formatted number (ignored on the
 *   'currency' branch).
 * @property {string} [suffix] - Text appended to the formatted number (ignored on the
 *   'currency' branch). Takes precedence over the implicit ' %' / unit suffixes.
 * @property {string} [unit] - Appended as ' ' + unit when no suffix has already been set
 *   (i.e. no explicit `suffix` and style is not 'percent').
 */

/**
 * Formats a numeric value via `Intl.NumberFormat`, driven by a FormatSpec.
 * Accepts tolerant textual input (e.g. "1 234,5", French thousands separator
 * + comma decimal) in addition to plain numbers.
 *
 * Empty values are not handled here: guard for null/'' upstream, where the caller
 * knows which placeholder to display.
 *
 * @param {number|string} value - Raw value to format.
 * @param {FormatSpec} f - Formatting instructions.
 * @returns {string} Localized, formatted string (or the raw value stringified
 *   when parsing fails).
 */
export function formatNumber(value, f) {
  // Parsing tolérant : espace = séparateur de milliers, virgule = décimale.
  const raw = typeof value === 'number'
    ? value
    : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  if (Number.isNaN(raw)) return String(value);

  const locale = f.locale || 'fr-FR';
  const opts = {};
  if (f.decimals != null) { opts.minimumFractionDigits = f.decimals; opts.maximumFractionDigits = f.decimals; }
  if (f.minDecimals != null) opts.minimumFractionDigits = f.minDecimals;
  if (f.maxDecimals != null) opts.maximumFractionDigits = f.maxDecimals;
  if (f.compact) opts.notation = 'compact';

  // Garde-fou : Intl lève une RangeError si les DEUX bornes sont fournies et que min > max
  // (ex. { decimals: 3, maxDecimals: 1 }). Non rattrapée, elle remonterait hors du render et
  // ferait tomber la route entière. On arbitre en faveur de la borne EXPLICITE, c'est-à-dire
  // celle posée par minDecimals/maxDecimals — une borne héritée de `decimals` n'est qu'un
  // défaut et doit céder. Si les deux sont explicites, c'est la borne haute qui gagne, par
  // cohérence avec l'ordre d'application documenté.
  // Quand une seule borne est fournie, ECMA-402 rabat lui-même la borne par défaut : rien à faire.
  if (opts.minimumFractionDigits != null
    && opts.maximumFractionDigits != null
    && opts.minimumFractionDigits > opts.maximumFractionDigits) {
    if (f.maxDecimals != null) {
      opts.minimumFractionDigits = opts.maximumFractionDigits;
    } else {
      opts.maximumFractionDigits = opts.minimumFractionDigits;
    }
  }

  if (f.style === 'currency') {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: f.currency || 'EUR', ...opts }).format(raw);
  }
  const s = new Intl.NumberFormat(locale, opts).format(raw);
  const prefix = f.prefix || '';
  let suffix = f.suffix || '';
  if (f.style === 'percent' && !suffix) suffix = ' %';
  if (f.unit && !suffix) suffix = ` ${f.unit}`;
  return prefix + s + suffix;
}
