// =================================================================
// FILTER TYPES — familles de type, opérations, valeur initiale et validation
// =================================================================
// Module sans logique d'affichage. Le modèle de type suit les métadonnées de l'API
// GraphQL au contrat 0.3.0 (`Metadata` → { typeFamily, isCategorical,
// filterOperations }) : on route sur la FAMILLE de type calculée par le serveur
// (INTEGER, NUMBER, DATE, TIMESTAMP, TEXT, BOOLEAN, OTHER), jamais sur le type SQL
// brut — la règle type SQL → famille → opérations est celle du serveur.
//
// Les métadonnées des variables sont fournies par la source `sources/useVariableMetadata`
// (ou par `fields` de getFactTableWithMetadata). Les LIBELLÉS des opérations vivent
// dans `config/filter/operations.json`, indexés par valeur d'enum.

// ── Formats de date attendus (saisie manuelle) ──
// Source unique : utils/dateParse des primitives (séparateur de plage « → » compris) ;
// ré-exportés ici pour les consommateurs de la feature.
import { DATE_SINGLE_RE, DATE_RANGE_RE } from '@/components/filter/utils/dateParse';
import { resolveLocalized } from '@/utils/i18n/resolveLocalized';

export { DATE_SINGLE_RE, DATE_RANGE_RE };


// =================================================================
// a) Prédicats de famille de type (enum TypeFamily de l'API)
// =================================================================
// Petits prédicats sur le `typeFamily` renvoyé par l'API. Les types SQL eux-mêmes
// (DOUBLE, UBIGINT, DECIMAL(18,2)…) ne sont jamais interprétés côté client.

/** True for the integer family (TINYINT … UHUGEINT). */
export const isIntegerFamily = (typeFamily) => typeFamily === 'INTEGER';
/** True for any numeric family (integer, or float/decimal). */
export const isNumericFamily = (typeFamily) => typeFamily === 'INTEGER' || typeFamily === 'NUMBER';
/** True for the date and date-time families. */
export const isDateFamily = (typeFamily) => typeFamily === 'DATE' || typeFamily === 'TIMESTAMP';

// =================================================================
// b) Résolution des opérations disponibles
// =================================================================
// L'API dit quelles opérations une colonne ACCEPTE (`filterOperations`) ; l'UI ne
// sait en saisir qu'une partie, qui dépend du widget de valeur (menu pour un champ
// catégoriel, champ numérique, sélecteur de date, saisie texte). Liste explicite, par
// widget et dans l'ordre d'affichage : la première est l'opération par défaut d'une
// nouvelle carte. BOOLEAN passe par le widget texte (EQ seul en commun) ; OTHER
// (IS_NULL / IS_NOT_NULL seulement) ne propose rien, l'UI n'ayant pas encore de
// critère sans valeur.
const SUPPORTED_OPERATIONS = {
  categorical: ['IN', 'NOT_IN', 'EQ'],
  numeric: ['EQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
  date: ['EQ', 'BEFORE', 'AFTER', 'BETWEEN'],
  text: ['EQ', 'CONTAINS', 'STARTS'],
};

/**
 * Returns the value widget a field is edited with.
 *
 * @param {string} typeFamily - `TypeFamily` enum value from the API metadata.
 * @param {boolean} isCategorical - Categorical flag from the API metadata.
 * @returns {'categorical'|'numeric'|'date'|'text'} Widget kind.
 */
const widgetOf = (typeFamily, isCategorical) => {
  if (isCategorical) return 'categorical';
  if (isNumericFamily(typeFamily)) return 'numeric';
  if (isDateFamily(typeFamily)) return 'date';
  return 'text';
};

/**
 * Returns the operation options offered for a field.
 *
 * The set comes from the API (`filterOperations`, exactly what `structuredFilters`
 * accepts on that column), narrowed to the operations the field's widget can edit,
 * in the widget's display order.
 *
 * @param {{typeFamily: ?string, isCategorical: ?boolean, filterOperations: ?string[]}} [field] -
 *   Field metadata (a `variables` entry or a `Metadata` object).
 * @param {Object<string, string>} [operationLabels] - Flat label map keyed by enum value
 *   (see {@link resolveOperationLabels}); a missing label falls back to the enum value.
 * @returns {{value: string, label: string}[]} Operation options for the SelectMenu.
 */
export function resolveOperations(field, operationLabels = {}) {
  const { typeFamily, isCategorical, filterOperations } = field ?? {};
  // Ensemble autorisé par le serveur pour CETTE colonne
  const accepted = new Set(filterOperations ?? []);

  return SUPPORTED_OPERATIONS[widgetOf(typeFamily, isCategorical)]
    .filter((op) => accepted.has(op))
    .map((op) => ({ value: op, label: operationLabels[op] ?? op }));
}

// =================================================================
// c) Connecteurs logiques par défaut
// =================================================================
// Un appelant qui veut d'autres libellés passe sa propre liste à `connectorOptions` de
// <MultiCriterionMenu> — c'est ce que fait l'application, avec les valeurs du
// dictionnaire.
export const DEFAULT_CONNECTORS = [
  { value: 'AND', label: 'ET' },
  { value: 'OR', label: 'OU' },
];

/**
 * Builds the default connector list with caller-supplied wording.
 *
 * @param {{and: string, or: string}} labels - Connector wording.
 * @returns {{value: string, label: string}[]} The two logical connectors.
 */
export const connectorsFrom = (labels) => [
  { value: 'AND', label: labels.and },
  { value: 'OR', label: labels.or },
];

/**
 * Flattens the localized labels of the operations catalogue.
 *
 * `config/filter/operations.json` maps each `FilterOperation` enum value to either a
 * plain string (`=`, `≥` — identical in every language) or a `{ fr, en }` map. The
 * filter components only ever receive strings: this is the single boundary where the
 * map collapses, shared by every consumer of the filter components so they cannot
 * diverge.
 *
 * Keys starting with `_` are dropped — the file carries a `_comment`.
 *
 * @param {Object<string, (string|Object)>} operations - The raw catalogue, keyed by
 *   enum value.
 * @param {string} locale - Requested locale code.
 * @param {string} defaultLocale - Fallback locale.
 * @returns {Object<string, string>} The same catalogue with plain-string labels.
 */
export const resolveOperationLabels = (operations, locale, defaultLocale) =>
  Object.fromEntries(
    Object.entries(operations)
      .filter(([key]) => !key.startsWith('_'))
      .map(([op, label]) => [op, resolveLocalized(label, locale, defaultLocale)]),
  );

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
// e) Valeur initiale vide par (famille, opération)
// =================================================================
/**
 * Returns the empty initial value matching a field type and operation.
 *
 * @param {string} typeFamily - `TypeFamily` enum value.
 * @param {boolean} isCategorical - Categorical flag.
 * @param {string|null} op - Selected operation (`FilterOperation` enum value).
 * @returns {string|string[]|{min: string, max: string}|null} Empty seed value.
 */
export function defaultValue(typeFamily, isCategorical, op) {
  // Catégoriel : appartenance multiple → tableau, égalité simple → null
  if (isCategorical) return op === 'IN' || op === 'NOT_IN' ? [] : null;
  // Numérique : plage → objet { min, max }, sinon chaîne vide
  if (isNumericFamily(typeFamily)) return op === 'BETWEEN' ? { min: '', max: '' } : '';
  // Date : toujours une chaîne (la plage est encodée « A → B » par TypeAwareInput)
  if (isDateFamily(typeFamily)) return '';
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
 * @param {{operation: ?string, value: *, typeFamily: ?string, isCategorical: ?boolean}} criterion -
 *   Criterion to validate.
 * @returns {boolean} True when the value is filled in for its type/operation.
 */
export function isComplete(criterion) {
  const { operation, value, typeFamily, isCategorical } = criterion ?? {};

  // Catégoriel : appartenance multiple → tableau non vide ; égalité → valeur non nulle
  if (isCategorical) {
    if (operation === 'IN' || operation === 'NOT_IN') {
      return Array.isArray(value) && value.length > 0;
    }
    return value != null;
  }

  // Numérique : plage → deux bornes renseignées ; sinon valeur non vide
  if (isNumericFamily(typeFamily)) {
    if (operation === 'BETWEEN') {
      return !!value && value.min !== '' && value.max !== '';
    }
    return value !== '' && value != null;
  }

  // Date : plage → « A → B » complet ; sinon date simple JJ/MM/AAAA
  if (isDateFamily(typeFamily)) {
    if (operation === 'BETWEEN') return DATE_RANGE_RE.test(value ?? '');
    return DATE_SINGLE_RE.test(value ?? '');
  }

  // Texte (et autres) : chaîne non vide après trim
  return typeof value === 'string' && value.trim().length > 0;
}
