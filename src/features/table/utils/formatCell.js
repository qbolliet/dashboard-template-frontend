// =================================================================
// FORMAT CELL — mise en forme des valeurs de cellule (sans dépendance React)
// =================================================================
// Décide de l'alignement numérique d'une colonne puis formate une valeur brute selon
// la ColumnDef.format : fonction libre, FormatSpec (Intl.NumberFormat), ou
// défauts (nombre localisé selon la langue du site, chaîne brute, tiret pour vide/null).
// Le formatage numérique lui-même vit dans la couche transverse src/utils/ : il est
// partagé avec <StatCard>, qui ne peut pas importer depuis src/features/.

import { formatNumber } from '@/utils/format/formatNumber';
import { formatValue } from '@/utils/format/formatValue';
import { EMPTY_PLACEHOLDER, DEFAULT_INTL_LOCALE } from '@/utils/format/constants';

/**
 * Separator between a code and its label in a « code — libellé » cell.
 *
 * @type {string}
 */
export const CODE_LABEL_SEPARATOR = ' — ';

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
 * @property {?string} [displayFormat] - d3-format specifier from the API metadata; formats
 *   a `type: 'number'` column (see {@link formatValue}). Ignored when `format` is set.
 * @property {?string} [unit] - Unit appended by `displayFormat`.
 * @property {string} [labelKey] - Key of a label column present in the rows: the cell then
 *   reads « code — libellé ». Set by `<Table codeLabels>`, from `labelFields`.
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
 * `col.render` (custom node — called even for a null/empty value, since the
 * render function owns its own empty-state handling) > null/empty guard (em
 * dash) > `col.format` function > `col.format` FormatSpec object > « code — libellé »
 * (`col.labelKey`) > column-level defaults (`displayFormat` + `unit` for
 * `type: 'number'`, else localized number; raw string otherwise).
 *
 * @param {*} value - Raw cell value (`row[col.key]`).
 * @param {ColumnDef} col - Column definition.
 * @param {Object} row - Full row, forwarded to `render`/`format` functions.
 * @param {string} [intlLocale] - Full Intl tag (e.g. 'en-US') used by the column-level
 *   default number formatting. A FormatSpec carrying its own `locale` still wins.
 * @returns {JSX.Element|string} Cell content.
 */
export function formatCell(value, col, row, intlLocale = DEFAULT_INTL_LOCALE) {
  if (col.render) return col.render(value, row);
  if (value == null || value === '') return EMPTY_PLACEHOLDER;
  const f = col.format;
  if (typeof f === 'function') return f(value, row);
  // La locale de la table sert de défaut ; une FormatSpec qui déclare la sienne la
  // conserve, c'est le point d'échappement pour une colonne en devise étrangère.
  if (f && typeof f === 'object') return formatNumber(value, { locale: intlLocale, ...f });
  // Colonne de code adossée à une colonne de libellés présente dans les données :
  // « code — libellé ». Un libellé vide laisse le code seul.
  if (col.labelKey) {
    const label = row?.[col.labelKey];
    return label == null || label === '' ? String(value) : `${value}${CODE_LABEL_SEPARATOR}${label}`;
  }
  if (col.type === 'number') {
    // Le format de l'API (`displayFormat` + `unit`) prime sur le défaut localisé ; sans
    // lui, `formatValue` rend `null` et le comportement historique s'applique.
    const formatted = formatValue(value, col, intlLocale);
    if (formatted != null) return formatted;
    const n = +value;
    if (Number.isNaN(n)) return String(value);
    return n.toLocaleString(intlLocale);
  }
  return String(value);
}
