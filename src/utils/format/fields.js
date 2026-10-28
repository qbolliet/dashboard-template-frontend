// =================================================================
// FIELDS — lecture des métadonnées de colonne (`fields` de DatasetWithMetadata)
// =================================================================
// Promu depuis src/features/chart/utils/fieldTypes.js : le globe (formatage des
// valeurs `z` de ses points et de ses flux) est le second consommateur. Module pur,
// sans React ni configuration du site ; le formatage proprement dit reste dans
// ./formatValue.js, qui reçoit directement l'entrée renvoyée par `fieldOf`.

const DATE_FAMILIES = new Set(['DATE', 'TIMESTAMP']);
const NUMERIC_FAMILIES = new Set(['INTEGER', 'NUMBER']);

/**
 * Maps a column's metadata to a column type (as detected by the chart).
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
