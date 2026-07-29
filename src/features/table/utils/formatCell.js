// =================================================================
// FORMAT CELL — mise en forme des valeurs de cellule (sans dépendance React)
// =================================================================
// Décide de l'alignement numérique d'une colonne puis formate une valeur brute selon
// la ColumnDef.format : fonction libre, FormatSpec (Intl.NumberFormat), ou
// défauts (nombre localisé fr-FR, chaîne brute, tiret pour vide/null).
// Le formatage numérique lui-même vit dans la couche transverse src/utils/ : il est
// partagé avec <StatCard>, qui ne peut pas importer depuis src/features/.

import { formatNumber } from '@/utils/format/formatNumber';
import { EMPTY_PLACEHOLDER } from '@/utils/format/constants';

// Ré-export : formatNumber fait partie de la surface publique de la feature
// (cf. `export * from './utils/formatCell'` dans index.js), les consommateurs
// existants continuent donc de l'importer depuis la table.
export { formatNumber };

/**
 * Canonical numeric format specification, re-exported so that existing
 * `import('.../formatCell').FormatSpec` JSDoc references keep resolving.
 *
 * @typedef {import('@/utils/format/formatNumber').FormatSpec} FormatSpec
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
  if (value == null || value === '') return EMPTY_PLACEHOLDER;
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
