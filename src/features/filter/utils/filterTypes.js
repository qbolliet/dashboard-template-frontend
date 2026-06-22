// =================================================================
// FILTER TYPES — catalogues, opérations et helpers purs
// =================================================================
// Module sans logique d'affichage : alimente les SelectMenu du CriterionMenu
// (variables, opérations) et fournit les helpers de valeur initiale / validation.
// Le format des options ({ value, label }) colle à l'API du SelectMenu (Prompt 1).

// ── Formats de date attendus (saisie manuelle) ──
// Aligné sur TypeAwareInput (séparateur de plage « → »).
const DATE_SINGLE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const DATE_RANGE_RE = /^\d{2}\/\d{2}\/\d{4} → \d{2}\/\d{2}\/\d{4}$/;

// =================================================================
// a) Catalogues de variables par type
// =================================================================
// Listes [{ value, label, type }] — chaque entrée porte son `type` afin que le
// CriterionMenu retrouve le type d'une variable sélectionnée sans table annexe.

/** Variables continues (numériques). */
export const CONTINUOUS_VARS = [
  { value: 'gdp', label: 'Croissance du PIB (%)', type: 'continuous' },
  { value: 'inflation', label: "Taux d'inflation (%)", type: 'continuous' },
  { value: 'chomage', label: 'Taux de chômage (%)', type: 'continuous' },
  { value: 'dette_pib', label: 'Dette publique / PIB (%)', type: 'continuous' },
  { value: 'prod_indus', label: 'Production industrielle (idx)', type: 'continuous' },
  { value: 'taux_dir', label: 'Taux directeur (%)', type: 'continuous' },
];

/** Variables de date. */
export const DATE_VARS = [
  { value: 'date_obs', label: "Date d'observation", type: 'date' },
  { value: 'date_pub', label: 'Date de publication', type: 'date' },
  { value: 'date_rev', label: 'Date de révision', type: 'date' },
  { value: 'date_maj', label: 'Date de mise à jour', type: 'date' },
];

/** Variables catégorielles. */
export const CATEGORICAL_VARS = [
  { value: 'indicator', label: 'Indicateur', type: 'categorical' },
  { value: 'sector', label: "Secteur d'activité", type: 'categorical' },
  { value: 'region', label: 'Région', type: 'categorical' },
  { value: 'type_orga', label: "Type d'organisme", type: 'categorical' },
  { value: 'frequence', label: 'Fréquence', type: 'categorical' },
];

/** Variables texte libre. */
export const TEXT_VARS = [
  { value: 'libelle', label: 'Libellé', type: 'text' },
  { value: 'commentaire', label: 'Commentaire', type: 'text' },
  { value: 'source', label: 'Source', type: 'text' },
  { value: 'note', label: 'Note libre', type: 'text' },
];

// =================================================================
// b) Opérations par type
// =================================================================
// Objet indexé par type — valeurs pour le SelectMenu d'opération.
// On utilise `value` (et non `id`) pour coller au format du SelectMenu.
export const OPS_BY_TYPE = {
  continuous: [
    { value: 'eq', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'between', label: 'Entre' },
  ],
  date: [
    { value: 'eq', label: '=' },
    { value: 'before', label: 'Avant' },
    { value: 'after', label: 'Après' },
    { value: 'between', label: 'Entre' },
  ],
  categorical: [
    { value: 'in', label: 'IN' },
    { value: 'not_in', label: 'NOT IN' },
    { value: 'eq', label: '=' },
  ],
  text: [
    { value: 'eq', label: '=' },
    { value: 'contains', label: 'Contient' },
    { value: 'starts', label: 'Commence par' },
  ],
};

// =================================================================
// c) Connecteurs logiques par défaut
// =================================================================
export const DEFAULT_CONNECTORS = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
];

// =================================================================
// d) Valeur initiale vide par (type, opération)
// =================================================================
/**
 * Returns the empty initial value matching a (type, operation) pair.
 *
 * @param {string|null} type - Variable type (continuous, date, categorical, text).
 * @param {string|null} op - Selected operation value.
 * @returns {string|string[]|{min: string, max: string}|null} Empty seed value.
 */
export function defaultValue(type, op) {
  // Continu : plage → objet { min, max }, sinon chaîne vide
  if (type === 'continuous') return op === 'between' ? { min: '', max: '' } : '';
  // Date : toujours une chaîne (la plage est encodée « A → B » par TypeAwareInput)
  if (type === 'date') return '';
  // Catégoriel : appartenance multiple → tableau, égalité simple → null
  if (type === 'categorical') return op === 'in' || op === 'not_in' ? [] : null;
  // Texte : chaîne vide
  if (type === 'text') return '';
  // Type inconnu : pas de valeur
  return '';
}

// =================================================================
// e) Validation d'un critère complet
// =================================================================
/**
 * Checks whether a criterion holds a complete, non-empty value.
 *
 * @param {{variable: ?string, operation: ?string, value: *, type: ?string}} criterion -
 *   Criterion to validate.
 * @returns {boolean} True when the value is filled in for its (type, operation).
 */
export function isComplete(criterion) {
  const { operation, value, type } = criterion ?? {};

  // Continu : plage → deux bornes renseignées ; sinon valeur non vide
  if (type === 'continuous') {
    if (operation === 'between') {
      return !!value && value.min !== '' && value.max !== '';
    }
    return value !== '' && value != null;
  }

  // Date : plage → « A → B » complet ; sinon date simple JJ/MM/AAAA
  if (type === 'date') {
    if (operation === 'between') return DATE_RANGE_RE.test(value ?? '');
    return DATE_SINGLE_RE.test(value ?? '');
  }

  // Catégoriel : appartenance multiple → tableau non vide ; égalité → valeur non nulle
  if (type === 'categorical') {
    if (operation === 'in' || operation === 'not_in') {
      return Array.isArray(value) && value.length > 0;
    }
    return value != null;
  }

  // Texte : chaîne non vide après trim
  if (type === 'text') {
    return typeof value === 'string' && value.trim().length > 0;
  }

  return false;
}
