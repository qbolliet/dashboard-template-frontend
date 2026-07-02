// =================================================================
// FILTER TYPES — helpers de type SQL, valeur initiale et validation
// =================================================================
// Module sans logique d'affichage. Le modèle de type suit désormais les métadonnées
// de l'API GraphQL (getVariableMetadata → { sql_type, is_categorical }) : on route
// DIRECTEMENT sur le type SQL et le drapeau catégoriel, sans type intermédiaire.
//
// Les métadonnées des variables sont fournies par la source `sources/useVariableMetadata`.
// Les opérations par type vivent dans `config/filter/operations.json`.

// ── Formats de date attendus (saisie manuelle) ──
// Aligné sur TypeAwareInput (séparateur de plage « → »).
export const DATE_SINGLE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
export const DATE_RANGE_RE = /^\d{2}\/\d{2}\/\d{4} → \d{2}\/\d{2}\/\d{4}$/;

// =================================================================
// a) Prédicats de type SQL (familles PostgreSQL)
// =================================================================
// Petits prédicats sur le `sql_type` renvoyé par l'API — pas de table de
// correspondance vers un type abstrait : on interroge directement la famille.
const INTEGER_SQL_TYPES = new Set([
  'integer', 'int', 'int2', 'int4', 'int8', 'smallint', 'bigint', 'serial', 'bigserial',
]);
const FLOAT_SQL_TYPES = new Set([
  'numeric', 'decimal', 'real', 'double precision', 'float', 'float4', 'float8', 'money',
]);
const DATE_SQL_TYPES = new Set([
  'date', 'timestamp', 'timestamp without time zone', 'timestamp with time zone',
  'timestamptz', 'time', 'time without time zone', 'time with time zone',
]);

const norm = (t) => String(t ?? '').toLowerCase().trim();

/** True for PostgreSQL integer families. */
export const isIntegerSqlType = (sqlType) => INTEGER_SQL_TYPES.has(norm(sqlType));
/** True for any numeric family (integer or floating/decimal). */
export const isNumericSqlType = (sqlType) => isIntegerSqlType(sqlType) || FLOAT_SQL_TYPES.has(norm(sqlType));
/** True for date/time families. */
export const isDateSqlType = (sqlType) => DATE_SQL_TYPES.has(norm(sqlType));

/**
 * Value type fed to TypeAwareInput/ConstraintField for a numeric/date SQL type.
 *
 * @param {string} sqlType - PostgreSQL sql_type from the API metadata.
 * @returns {"integer"|"float"|"date"} Field value type.
 */
export const fieldValueType = (sqlType) => {
  if (isDateSqlType(sqlType)) return 'date';
  if (isIntegerSqlType(sqlType)) return 'integer';
  return 'float';
};

// =================================================================
// b) Résolution des opérations disponibles
// =================================================================
/**
 * Returns the operation options for a field, keyed directly by sql_type.
 * A categorical field always uses the `categorical` bucket, whatever its sql_type.
 *
 * @param {string} sqlType - PostgreSQL sql_type.
 * @param {boolean} isCategorical - Categorical flag from the API metadata.
 * @param {Object<string, {value: string, label: string}[]>} operations - Map keyed by
 *   "categorical" / sql_type (see config/filter/operations.json).
 * @returns {{value: string, label: string}[]} Operation options for the SelectMenu.
 */
export function resolveOperations(sqlType, isCategorical, operations = {}) {
  if (isCategorical) return operations.categorical ?? [];
  return operations[norm(sqlType)] ?? operations.text ?? [];
}

// =================================================================
// c) Connecteurs logiques par défaut
// =================================================================
export const DEFAULT_CONNECTORS = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
];

// =================================================================
// d) Adaptateur valeur interne (id) → format SelectMenu
// =================================================================
/**
 * Adapts a stored id to the `[{ value, label }]` shape expected by SelectMenu.
 * The criterion keeps plain ids as source of truth (needed for SQL/serialisation);
 * this thin adapter is the single place resolving them to the select format.
 *
 * @param {?string} id - Stored id (variable, operation, single categorical value).
 * @param {{value: string, label: string}[]} [options] - Catalogue used to find the label.
 * @returns {{value: string, label: string}[]} One-element array, or empty when id is null.
 */
export function toSelectValue(id, options = []) {
  if (id == null) return [];
  return [options.find((o) => o.value === id) ?? { value: id, label: id }];
}

// =================================================================
// e) Valeur initiale vide par (type, opération)
// =================================================================
/**
 * Returns the empty initial value matching a field type and operation.
 *
 * @param {string} sqlType - PostgreSQL sql_type.
 * @param {boolean} isCategorical - Categorical flag.
 * @param {string|null} op - Selected operation value.
 * @returns {string|string[]|{min: string, max: string}|null} Empty seed value.
 */
export function defaultValue(sqlType, isCategorical, op) {
  // Catégoriel : appartenance multiple → tableau, égalité simple → null
  if (isCategorical) return op === 'in' || op === 'not_in' ? [] : null;
  // Numérique : plage → objet { min, max }, sinon chaîne vide
  if (isNumericSqlType(sqlType)) return op === 'between' ? { min: '', max: '' } : '';
  // Date : toujours une chaîne (la plage est encodée « A → B » par TypeAwareInput)
  if (isDateSqlType(sqlType)) return '';
  // Texte (et autres) : chaîne vide
  return '';
}

// =================================================================
// f) Complétude d'un critère (rempli — indépendant de la cohérence)
// =================================================================
/**
 * Checks whether a criterion holds a complete, non-empty value. « Rempli » ne dit
 * rien de la cohérence (min ≤ max…), qui est portée par le champ (ConstraintField)
 * et remontée via onValidityChange.
 *
 * @param {{operation: ?string, value: *, sql_type: ?string, is_categorical: ?boolean}} criterion -
 *   Criterion to validate.
 * @returns {boolean} True when the value is filled in for its type/operation.
 */
export function isComplete(criterion) {
  const { operation, value, sql_type: sqlType, is_categorical: isCategorical } = criterion ?? {};

  // Catégoriel : appartenance multiple → tableau non vide ; égalité → valeur non nulle
  if (isCategorical) {
    if (operation === 'in' || operation === 'not_in') {
      return Array.isArray(value) && value.length > 0;
    }
    return value != null;
  }

  // Numérique : plage → deux bornes renseignées ; sinon valeur non vide
  if (isNumericSqlType(sqlType)) {
    if (operation === 'between') {
      return !!value && value.min !== '' && value.max !== '';
    }
    return value !== '' && value != null;
  }

  // Date : plage → « A → B » complet ; sinon date simple JJ/MM/AAAA
  if (isDateSqlType(sqlType)) {
    if (operation === 'between') return DATE_RANGE_RE.test(value ?? '');
    return DATE_SINGLE_RE.test(value ?? '');
  }

  // Texte (et autres) : chaîne non vide après trim
  return typeof value === 'string' && value.trim().length > 0;
}
