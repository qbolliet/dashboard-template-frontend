// Importation des modules
import useSWR from 'swr';

// ── Bornes mock par défaut ──
// Repli local exerçant le même cycle loading→données que l'API GraphQL réelle.
const MOCK_BOUNDS = { min: 0, max: 100, step: 1 };

// ── Bornes mock par champ ──
// Imite getFieldBounds(fieldName) (dérivé des `extents` du dataset côté API).
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

// --- Fallback mock : résolu en asynchrone pour exercer le même cycle
//     loading→données que l'API GraphQL réelle. Bornes indexées par champ. ---
function fetchRangeBounds([, fieldName, catalog]) {
  const promise = Promise.resolve(MOCK_BOUNDS_BY_FIELD[fieldName] ?? MOCK_BOUNDS);

  // ====================================================================
  // INTÉGRATION GRAPHQL RÉELLE — à décommenter pour brancher l'API
  // ====================================================================
  // Prérequis : un client GraphQL (ex: @apollo/client ou graphql-request),
  // non installé à ce jour. Définir la fonction de requête ci-dessous (idéalement
  // dans `src/components/filter/ConstraintField/sources/`), puis REMPLACER le
  // `const promise = ...` du fallback mock ci-dessus par :
  //
  //   const promise = getFieldBounds({ fieldName, catalog });
  //
  // Exemple d'implémentation (graphql-request) :
  //
  //   import { request, gql } from 'graphql-request';
  //   const ENDPOINT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
  //
  //   const FIELD_BOUNDS = gql`
  //     query GetFieldBounds($fieldName: String!, $catalog: String) {
  //       getFieldBounds(fieldName: $fieldName, catalog: $catalog) {
  //         min max step
  //       }
  //     }`;
  //   export async function getFieldBounds({ fieldName, catalog }) {
  //     // Catalogue routé via l'en-tête X-Catalog-Id (ou l'argument `catalog`).
  //     const headers = catalog ? { 'X-Catalog-Id': catalog } : {};
  //     const data = await request(ENDPOINT, FIELD_BOUNDS, { fieldName, catalog }, headers);
  //     return data.getFieldBounds; // -> { min, max, step }
  //   }
  //
  // Le cycle { loading, error } est déjà câblé : `loading` vient de `isLoading`
  // (SWR), `error` est renseigné par un rejet de la promesse ci-dessus.
  // ====================================================================

  return promise;
}

/**
 * Fetches the numeric/date bounds (min, max, step) that drive ConstraintField's slider.
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['rangeBounds', fieldName, catalog]` key across component instances. By
 * default the resolver returns local mocks; swap it for the GraphQL call
 * `getFieldBounds` inside {@link fetchRangeBounds} (see the commented block).
 * The component lets explicit `min`/`max` props take precedence over the
 * returned values.
 *
 * @param {Object}  params
 * @param {string}  params.fieldName - API field name. Ignored by the mock resolver.
 * @param {string}  [params.catalog] - API catalog (mock: ignored).
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
