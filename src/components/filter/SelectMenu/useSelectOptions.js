import { useEffect, useState } from 'react';
import { MOCK_FLAT_OPTIONS, MOCK_GROUPED_OPTIONS, MOCK_OPTIONS_BY_FIELD } from './mockData';

/**
 * Fetches the options displayed by SelectMenu (flat or two-level grouped).
 *
 * The data lifecycle (loading → data / error) is modelled exactly as it will
 * behave against the real GraphQL API: an effect resolves the request
 * asynchronously and stores the result in state, while `loading` is derived
 * during render from a request-key comparison. By default the resolver returns
 * the local mocks (client-side filtering); swap it for the GraphQL calls
 * `getSelectOptions` / `getGroupedSelectOptions` (see the commented block).
 *
 * @param {Object}  params
 * @param {string}  params.fieldName    - API field name (also used as the
 *   `optionsField` in grouped mode). Ignored by the mock resolver.
 * @param {string}  [params.catalog]    - API catalog (mock: ignored).
 * @param {boolean} [params.grouped]    - Enables grouped-options mode.
 * @param {string}  [params.groupField] - Group field in grouped mode (mock: ignored).
 * @param {string}  [params.searchTerm] - Text filter applied to labels.
 * @returns {{ options: Array, groups: Array, loading: boolean, error: (Error|null) }}
 *   Flat options, grouped options ([{ group, options }]), loading flag and error.
 */
export function useSelectOptions({ fieldName, catalog, grouped, groupField, searchTerm } = {}) {
  // État du résultat courant. `key` identifie le jeu d'inputs qui l'a produit :
  // on s'en sert pour dériver `loading` sans setState synchrone dans l'effet
  // (interdit par les Rules of Hooks v6 — règle set-state-in-effect).
  const [result, setResult] = useState({ key: null, flat: [], groups: [], error: null });

  // Clé de la requête courante (miroir de celle stockée dans l'effet). Doit être
  // construite à l'identique des deux côtés pour que la comparaison soit fiable.
  const requestKey = `${fieldName}|${catalog}|${grouped}|${groupField}|${searchTerm}`;

  useEffect(() => {
    // Garde d'annulation : ignore la réponse si les inputs ont changé entre-temps.
    let cancelled = false;
    const key = `${fieldName}|${catalog}|${grouped}|${groupField}|${searchTerm}`;
    const term = (searchTerm || '').trim().toLowerCase();

    // --- Fallback mock : filtrage client résolu en asynchrone pour exercer le
    //     même cycle loading→données que l'API GraphQL réelle. ---
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
    // Le cycle { loading, error } est déjà câblé : `loading` se déduit de la
    // comparaison de clés (plus bas), `error` est renseigné par le .catch ci-dessous.
    // ====================================================================

    promise
      // Succès : on enregistre le résultat tagué avec la clé de la requête.
      .then((res) => { if (!cancelled) setResult({ key, error: null, ...res }); })
      // Erreur : place réservée pour la remontée d'erreur GraphQL.
      .catch((err) => { if (!cancelled) setResult({ key, error: err, flat: [], groups: [] }); });

    return () => { cancelled = true; };
  }, [fieldName, catalog, grouped, groupField, searchTerm]);

  // `loading` dérivé : vrai tant que le résultat stocké ne correspond pas aux
  // inputs courants (premier rendu ou inputs qui viennent de changer). Pendant
  // ce laps de temps, on renvoie le dernier résultat connu (stale-while-loading).
  const loading = result.key !== requestKey;

  return {
    options: result.flat,
    groups: result.groups,
    loading,
    error: result.error,
  };
}
