// =================================================================
// FIELD TYPES — typage et formatage des colonnes d'après leurs métadonnées
// =================================================================
// `detectType` devine le type en échantillonnant les valeurs, ce qui se trompe sur un code :
// '01012100' (NC8) passe pour un nombre et `coerce` le convertit en 1012100, zéros de tête
// perdus. Quand l'appelant dispose des métadonnées de colonne (`fields` de
// DatasetWithMetadata), le type vient de la famille calculée par l'API et la détection
// n'a plus lieu. Ce module est la frontière : il ne dépend ni de la feature filtre ni de
// React.

import { valueFormatter } from '@/utils/format/formatValue';
import { intlLocaleFor } from '@/i18n/formats';

const DATE_FAMILIES = new Set(['DATE', 'TIMESTAMP']);
const NUMERIC_FAMILIES = new Set(['INTEGER', 'NUMBER']);

/**
 * Maps a column's metadata to the chart's column type.
 *
 * @param {{typeFamily: ?string, isCategorical: ?boolean}} field - Column metadata.
 * @returns {'date'|'number'|'categorical'} DATE/TIMESTAMP → date; INTEGER/NUMBER that is
 *   not categorical → number; anything else (text, boolean, categorical code) → categorical.
 */
export const typeFromField = (field) => {
  if (DATE_FAMILIES.has(field.typeFamily)) return 'date';
  if (NUMERIC_FAMILIES.has(field.typeFamily) && !field.isCategorical) return 'number';
  return 'categorical';
};

/**
 * Looks a column up in the metadata.
 *
 * @param {?Array<Object>} fields - Column metadata (`fields` of DatasetWithMetadata).
 * @param {string} [name] - Column name.
 * @returns {?Object} The metadata entry, or `null` without `fields` or when the column is
 *   not described.
 */
export const fieldOf = (fields, name) => (
  name != null && Array.isArray(fields) ? (fields.find((f) => f.name === name) ?? null) : null
);

/**
 * Resolves the type of a column: from its metadata when `fields` describes it, by sampling
 * the values otherwise.
 *
 * @param {?Array<Object>} fields - Column metadata, or nothing for the historical detection.
 * @param {string} name - Column name.
 * @param {function(): 'date'|'number'|'categorical'} detect - Sampling fallback; only
 *   called when the metadata does not settle the type, so that `detectType` is never
 *   run for a described column.
 * @returns {'date'|'number'|'categorical'} Column type.
 */
export const resolveColumnType = (fields, name, detect) => {
  const field = fieldOf(fields, name);
  return field ? typeFromField(field) : detect();
};

/**
 * Completes the `format` prop of a chart with the formatters of the described columns.
 * A format the caller wrote explicitly always wins; a column without `displayFormat` (or
 * not numeric) is left to the chart's default formatter.
 *
 * @param {?Array<Object>} fields - Column metadata.
 * @param {{x: ?string, y: ?string, z: ?string}} columns - Column plotted on each axis.
 * @param {{x?: *, y?: *, z?: *}} format - The caller's `format` prop.
 * @param {string} [locale] - Site locale code.
 * @returns {{x?: *, y?: *, z?: *}} `format`, extended with a formatter function per axis.
 */
export const formatFromFields = (fields, columns, format, locale) => {
  if (!Array.isArray(fields)) return format;

  const intlLocale = intlLocaleFor(locale);
  const completed = { ...format };

  for (const axis of ['x', 'y', 'z']) {
    const field = fieldOf(fields, columns[axis]);
    // Une date garde son format temporel : `displayFormat` est un spécificateur de nombre.
    if (completed[axis] != null || !field || typeFromField(field) !== 'number') continue;
    const formatter = valueFormatter(field, intlLocale);
    if (formatter) completed[axis] = formatter;
  }

  return completed;
};
