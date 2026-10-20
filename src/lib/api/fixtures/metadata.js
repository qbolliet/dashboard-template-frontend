// =================================================================
// FIXTURE — CONSTRUCTEUR DE `Metadata` (contrat API 0.3.0)
// =================================================================
// Une entrée de `getCatalogSchema` / `DatasetWithMetadata.fields` porte, en plus du
// nom et du libellé, deux champs que le serveur DÉRIVE de `sqlType` (cf.
// dashboard-template-api/src/utils/metadata-mapping.ts) : `typeFamily` et
// `filterOperations`. On rejoue ici la même dérivation plutôt que de recopier ces
// listes champ par champ, pour que les fixtures ne puissent pas se contredire.
// Le module n'importe rien : il est chargé tel quel par scripts/mock-api-server.js.

const INTEGER_TYPES = [
  'TINYINT', 'SMALLINT', 'INTEGER', 'BIGINT', 'HUGEINT',
  'UTINYINT', 'USMALLINT', 'UINTEGER', 'UBIGINT', 'UHUGEINT',
];

const COMPARISONS = ['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN', 'NOT_BETWEEN', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'];

// Opérations par famille de type — même contenu et même ordre que ALLOWED_OPERATIONS côté API.
const OPERATIONS_BY_FAMILY = {
  INTEGER: COMPARISONS,
  NUMBER: COMPARISONS,
  DATE: ['EQ', 'NEQ', 'BEFORE', 'AFTER', 'ON_OR_BEFORE', 'ON_OR_AFTER', 'BETWEEN', 'NOT_BETWEEN', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
  TIMESTAMP: ['EQ', 'NEQ', 'BEFORE', 'AFTER', 'ON_OR_BEFORE', 'ON_OR_AFTER', 'BETWEEN', 'NOT_BETWEEN', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
  TEXT: [
    'EQ', 'NEQ', 'IEQ', 'CONTAINS', 'NOT_CONTAINS', 'ICONTAINS', 'STARTS', 'NOT_STARTS', 'ISTARTS',
    'ENDS', 'NOT_ENDS', 'IENDS', 'MATCHES', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL',
  ],
  BOOLEAN: ['EQ', 'NEQ', 'IS_TRUE', 'IS_FALSE', 'IS_NOT_TRUE', 'IS_NOT_FALSE', 'IS_NULL', 'IS_NOT_NULL'],
  OTHER: ['IS_NULL', 'IS_NOT_NULL'],
};

/**
 * Derives the `TypeFamily` enum value from a DuckDB SQL type.
 *
 * @param {string} sqlType - DuckDB type as written in the database (`DOUBLE`, `BIGINT`…).
 * @returns {'INTEGER'|'NUMBER'|'DATE'|'TIMESTAMP'|'TEXT'|'BOOLEAN'|'OTHER'} The family.
 */
export const typeFamilyOf = (sqlType) => {
  const type = sqlType.trim().toUpperCase();

  if (INTEGER_TYPES.includes(type)) return 'INTEGER';
  if (type === 'FLOAT' || type === 'DOUBLE' || type.startsWith('DECIMAL')) return 'NUMBER';
  if (type === 'DATE') return 'DATE';
  if (type.startsWith('TIMESTAMP')) return 'TIMESTAMP';
  if (type === 'VARCHAR') return 'TEXT';
  if (type === 'BOOLEAN') return 'BOOLEAN';
  return 'OTHER';
};

/**
 * Builds one complete `Metadata` object (every field of the 0.3.0 contract, `stats`
 * excluded — it is attached by the resolvers from the `FieldStats` fixtures).
 *
 * @param {Object} field - Values specific to the column; the rest takes the API defaults.
 * @param {string} field.name - Technical column name.
 * @param {string} field.sqlType - DuckDB type.
 * @param {string} [field.label] - Display label (defaults to `name`, like the API).
 * @param {boolean} [field.isCategorical=false] - Filterable through a menu.
 * @param {boolean} [field.isPrimaryKey=false] - Part of the logical key.
 * @param {string|null} [field.parentName] - Parent column of a hierarchy.
 * @param {string|null} [field.labelFor] - Code column this label column describes.
 * @param {string[]} [field.labelFields] - Label columns of this code column.
 * @param {string|null} [field.unit] - Axis / tooltip suffix.
 * @param {string|null} [field.displayFormat] - d3-format string.
 * @param {string|null} [field.family] - Thematic family.
 * @param {string|null} [field.description] - Contextual help.
 * @param {string|null} [field.defaultAggregation] - `Aggregation` applied by getAggregates
 *   when the request names none (SUM for a stock, AVG for a rate…).
 * @returns {Object} A `Metadata` object as `getCatalogSchema` returns it.
 */
export const defineField = ({
  name,
  sqlType,
  label = name,
  isCategorical = false,
  isPrimaryKey = false,
  parentName = null,
  labelFor = null,
  labelFields = [],
  unit = null,
  displayFormat = null,
  family = null,
  description = null,
  defaultAggregation = null,
}) => {
  const typeFamily = typeFamilyOf(sqlType);

  return {
    name,
    label,
    sqlType,
    typeFamily,
    filterOperations: OPERATIONS_BY_FAMILY[typeFamily],
    isCategorical,
    isPrimaryKey,
    parentName,
    labelFor,
    labelFields,
    unit,
    displayFormat,
    family,
    description,
    defaultAggregation,
  };
};
