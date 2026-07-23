// =================================================================
// FORMAT CELL — mise en forme des valeurs de cellule (sans dépendance React)
// =================================================================
// Décide de l'alignement numérique d'une colonne puis formate une valeur brute selon
// la ColumnDef.format : fonction libre, FormatSpec (Intl.NumberFormat), ou
// défauts (nombre localisé fr-FR, chaîne brute, tiret pour vide/null).

/**
 * @typedef {object} FormatSpec
 * @property {'number'|'currency'|'percent'} [style='number']
 * @property {string} [currency] - Code ISO ('EUR', 'USD'…) quand style='currency'.
 * @property {string} [locale='fr-FR']
 * @property {number} [decimals] - Fixe min = max de décimales.
 * @property {number} [minDecimals]
 * @property {number} [maxDecimals]
 * @property {boolean} [compact] - Notation compacte (1,2 k / 3,4 M).
 * @property {string} [prefix]
 * @property {string} [suffix]
 * @property {string} [unit]
 */

/**
 * @typedef {object} ColumnDef
 * @property {string} key
 * @property {string} [label]
 * @property {'number'} [type]
 * @property {function(*, Object): (JSX.Element|FormatSpec)} [format]
 * @property {function(*, Object): JSX.Element} [render]
 * @property {boolean} [mono]
 * @property {boolean} [strong]
 */

/**
 * Determines whether a column should render right-aligned, tabular-numeric
 * cells: either `type: 'number'`, or a FormatSpec object whose style is
 * numeric (`number`/`currency`/`percent`, or omitted).
 *
 * @param {ColumnDef} col - Column definition.
 * @returns {boolean} True when the column is numeric.
 */
export function isNumericCol(col) {
  if (col.type === 'number') return true;
  if (col.format && typeof col.format === 'object') {
    return col.format.style == null
      || col.format.style === 'number'
      || col.format.style === 'currency'
      || col.format.style === 'percent';
  }
  return false;
}

/**
 * Formats a numeric value via `Intl.NumberFormat`, driven by a FormatSpec.
 * Accepts tolerant textual input (e.g. "1 234,5", French thousands separator
 * + comma decimal) in addition to plain numbers.
 *
 * @param {number|string} value - Raw cell value.
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

/**
 * Resolves the display value of a table cell, in priority order:
 * `col.render` (custom node) > `col.format` function > `col.format` FormatSpec
 * object > column-level defaults (localized number for `type: 'number'`, raw
 * string otherwise). Null/empty values render as an em dash, ahead of any
 * other rule.
 *
 * @param {*} value - Raw cell value (`row[col.key]`).
 * @param {ColumnDef} col - Column definition.
 * @param {Object} row - Full row, forwarded to `render`/`format` functions.
 * @returns {JSX.Element|string} Cell content.
 */
export function formatCell(value, col, row) {
  if (col.render) return col.render(value, row);
  if (value == null || value === '') return '—';
  const f = col.format;
  if (typeof f === 'function') return f(value, row);
  if (f && typeof f === 'object') return formatNumber(value, f);
  if (col.type === 'number') {
    const n = +value;
    if (Number.isNaN(n)) return String(value);
    return n.toLocaleString('fr-FR');
  }
  return String(value);
}
