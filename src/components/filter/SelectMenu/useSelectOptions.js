// Importation des modules
import useSWR from 'swr';
import { MOCK_FLAT_OPTIONS, MOCK_GROUPED_OPTIONS, MOCK_OPTIONS_BY_FIELD } from './mockData';

// --- Fallback mock : filtrage client résolu en asynchrone pour exercer le
//     même cycle loading→données que l'API GraphQL réelle. ---
function fetchSelectOptions([, fieldName, catalog, groupField, searchTerm]) {
  // Mode groupé dérivé de la présence du champ de groupe (aligné sur SelectMenu)
  const grouped = !!groupField;
  const term = (searchTerm || '').trim().toLowerCase();

  const promise = Promise.resolve().then(() => {
    if (grouped) {
      // Filtrage option par option, puis suppression des groupes devenus vides.
      const groups = MOCK_GROUPED_OPTIONS
        .map((g) => ({
          ...g,
          options: term
            ? g.options.filter((o) => o.label.toLowerCase().includes(term))
            : g.options,
        }))
        .filter((g) => g.options.length > 0);
      return { flat: [], groups };
    }
    // Mode plat : options du champ demandé (repli sur la liste générique), puis
    // filtrage direct par le terme de recherche.
    const source = MOCK_OPTIONS_BY_FIELD[fieldName] ?? MOCK_FLAT_OPTIONS;
    const flat = term
      ? source.filter((o) => o.label.toLowerCase().includes(term))
      : source;
    return { flat, groups: [] };
  });

  // ====================================================================
  // INTÉGRATION GRAPHQL RÉELLE — à décommenter pour brancher l'API
  // ====================================================================
  // Prérequis : un client GraphQL (ex: @apollo/client ou graphql-request),
  // non installé à ce jour. Définir les fonctions de requête ci-dessous (idéalement
  // dans `src/components/filter/SelectMenu/sources/`), puis REMPLACER le
  // `const promise = ...` du fallback mock ci-dessus par :
  //
  //   const limit = 50;
  //   const promise = grouped
  //     ? getGroupedSelectOptions({ groupField, optionsField: fieldName, limit, catalog })
  //         // L'API renvoie déjà un tableau [{ group, options }] où chaque groupe
  //         // porte SA propre liste d'options : structure consommée telle quelle
  //         // par SelectMenu, donc pass-through.
  //         .then((groups) => ({ flat: [], groups }))
  //     : getSelectOptions({ fieldName, searchTerm, limit, catalog })
  //         .then((flat) => ({ flat, groups: [] }));
  //
  // Exemple d'implémentation des fonctions de requête (graphql-request) :
  //
  //   import { request, gql } from 'graphql-request';
  //   const ENDPOINT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
  //
  //   const SELECT_OPTIONS = gql`
  //     query GetSelectOptions($fieldName: String!, $limit: Int, $searchTerm: String, $catalog: String) {
  //       getSelectOptions(fieldName: $fieldName, limit: $limit, searchTerm: $searchTerm, catalog: $catalog) {
  //         value label
  //       }
  //     }`;
  //   export async function getSelectOptions({ fieldName, searchTerm = '', limit = 50, catalog }) {
  //     // Catalogue routé via l'en-tête X-Catalog-Id (ou l'argument `catalog`).
  //     const headers = catalog ? { 'X-Catalog-Id': catalog } : {};
  //     const data = await request(ENDPOINT, SELECT_OPTIONS, { fieldName, searchTerm, limit, catalog }, headers);
  //     return data.getSelectOptions; // -> [{ value, label }]
  //   }
  //
  //   const GROUPED_SELECT_OPTIONS = gql`
  //     query GetGroupedSelectOptions($groupField: String!, $optionsField: String!, $limit: Int, $catalog: String) {
  //       getGroupedSelectOptions(groupField: $groupField, optionsField: $optionsField, limit: $limit, catalog: $catalog) {
  //         group { value label }
  //         options { value label }
  //       }
  //     }`;
  //   export async function getGroupedSelectOptions({ groupField, optionsField, limit = 50, catalog }) {
  //     const headers = catalog ? { 'X-Catalog-Id': catalog } : {};
  //     const data = await request(ENDPOINT, GROUPED_SELECT_OPTIONS, { groupField, optionsField, limit, catalog }, headers);
  //     return data.getGroupedSelectOptions; // -> [{ group: { value, label }, options: [{ value, label }] }]
  //   }
  //
  // Le cycle { loading, error } est déjà câblé : `loading` vient de `isLoading`
  // (SWR), `error` est renseigné par un rejet de la promesse ci-dessus.
  // ====================================================================

  return promise;
}

/**
 * Fetches the options displayed by SelectMenu (flat or two-level grouped).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['selectOptions', fieldName, catalog, groupField, searchTerm]` key across
 * component instances, and keeps the previous options visible (no flash to
 * empty) while a new key — e.g. a debounced search term — resolves. By default
 * the resolver returns the local mocks (client-side filtering); swap it for
 * the GraphQL calls `getSelectOptions` / `getGroupedSelectOptions` inside
 * {@link fetchSelectOptions} (see the commented block).
 *
 * @param {Object}  params
 * @param {string}  params.fieldName    - API field name (also used as the
 *   `optionsField` in grouped mode). Ignored by the mock resolver.
 * @param {string}  [params.catalog]    - API catalog (mock: ignored).
 * @param {string}  [params.groupField] - Group field; its presence enables the
 *   grouped-options mode (mock: ignored).
 * @param {string}  [params.searchTerm] - Text filter applied to labels.
 * @param {boolean} [params.enabled]    - Fetch activé (défaut true). À `false` quand le
 *   parent fournit une liste statique (`options`) : la clé SWR devient `null`, aucun
 *   appel n'est déclenché (règles des hooks : appel inconditionnel, mais fetch conditionnel).
 * @returns {{ options: Array, groups: Array, loading: boolean, error: (Error|null) }}
 *   Flat options, grouped options ([{ group, options }]), loading flag and error.
 */
export function useSelectOptions({ fieldName, catalog, groupField, searchTerm, enabled = true } = {}) {
  const key = enabled ? ['selectOptions', fieldName, catalog, groupField, searchTerm] : null;
  const { data, error, isLoading } = useSWR(key, fetchSelectOptions, { keepPreviousData: true });

  return {
    options: data?.flat ?? [],
    groups: data?.groups ?? [],
    loading: isLoading,
    error: error ?? null,
  };
}
