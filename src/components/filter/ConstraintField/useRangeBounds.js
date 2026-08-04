// Importation des modules
import useSWR from 'swr';

// =================================================================
// SOURCE — BORNES DE CHAMP (locales)
// =================================================================
// Seule source du projet qui ne passe PAS par lib/api/client : l'API n'expose
// aucune opération de bornes par champ. Les seules bornes réelles disponibles
// sont les `metadata.extents` de getFactTableWithMetadata — les brancher
// supposerait une requête par champ et une dérivation du `step` côté client,
// hors périmètre tant que le besoin n'est pas tranché. Le hook garde donc un
// résolveur local, asynchrone pour exercer le même cycle loading→données.

// ── Bornes par défaut ──
const MOCK_BOUNDS = { min: 0, max: 100, step: 1 };

// ── Bornes par champ ──
// Numériques : {min,max,step} chiffrés. Dates : bornes en JJ/MM/AAAA + step en ms
// (ConstraintField sait projeter des dates sur son axe numérique). Repli : MOCK_BOUNDS.
const MS_PER_DAY = 86_400_000;
const MOCK_BOUNDS_BY_FIELD = {
  gdp:        { min: -10, max: 15,  step: 0.1 },
  inflation:  { min: -2,  max: 20,  step: 0.1 },
  chomage:    { min: 0,   max: 30,  step: 0.1 },
  dette_pib:  { min: 0,   max: 200, step: 1 },
  prod_indus: { min: 0,   max: 200, step: 1 },
  taux_dir:   { min: 0,   max: 10,  step: 0.05 },
  date_obs:   { min: '01/01/2000', max: '31/12/2025', step: MS_PER_DAY },
  date_pub:   { min: '01/01/2000', max: '31/12/2025', step: MS_PER_DAY },
  date_rev:   { min: '01/01/2000', max: '31/12/2025', step: MS_PER_DAY },
  date_maj:   { min: '01/01/2000', max: '31/12/2025', step: MS_PER_DAY },
};

async function fetchRangeBounds([, fieldName]) {
  return MOCK_BOUNDS_BY_FIELD[fieldName] ?? MOCK_BOUNDS;
}

/**
 * Fetches the numeric/date bounds (min, max, step) that drive ConstraintField's slider.
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['rangeBounds', fieldName, catalog]` key across component instances. Bounds
 * are resolved locally — the API exposes no per-field bounds operation (see the
 * header note). The component lets explicit `min`/`max` props take precedence
 * over the returned values.
 *
 * @param {Object}  params
 * @param {string}  params.fieldName - API field name, indexes the local bounds.
 * @param {string}  [params.catalog] - API catalog (part of the key only).
 * @param {boolean} [params.enabled] - Fetch activé (défaut true). À `false` quand le
 *   parent ne fournit pas de `fieldName` (bornes `min`/`max` statiques passées en props) :
 *   la clé SWR devient `null`, aucun appel n'est déclenché ; les bornes retournées
 *   retombent alors sur `MOCK_BOUNDS`.
 * @returns {{ min: number, max: number, step: number, loading: boolean, error: (Error|null) }}
 *   Resolved bounds, loading flag and error.
 */
export function useRangeBounds({ fieldName, catalog, enabled = true } = {}) {
  const key = enabled ? ['rangeBounds', fieldName, catalog] : null;
  const { data, error, isLoading } = useSWR(key, fetchRangeBounds);

  const bounds = data ?? MOCK_BOUNDS;

  return {
    min: bounds.min,
    max: bounds.max,
    step: bounds.step,
    loading: isLoading,
    error: error ?? null,
  };
}
