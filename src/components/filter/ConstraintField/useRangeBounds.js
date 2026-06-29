import { useEffect, useState } from 'react';

// ── Bornes mock par défaut ──
// Repli local exerçant le même cycle loading→données que l'API GraphQL réelle.
const MOCK_BOUNDS = { min: 0, max: 100, step: 1 };

/**
 * Fetches the numeric/date bounds (min, max, step) that drive ConstraintField's slider.
 *
 * Mirrors {@link useSelectOptions}: an effect resolves the request asynchronously and
 * stores the result in state, while `loading` is derived during render from a
 * request-key comparison. By default the resolver returns local mocks; swap it for the
 * GraphQL call `getFieldBounds` (see the commented block). The component lets explicit
 * `min`/`max` props take precedence over the returned values.
 *
 * @param {Object}  params
 * @param {string}  params.fieldName - API field name. Ignored by the mock resolver.
 * @param {string}  [params.catalog] - API catalog (mock: ignored).
 * @returns {{ min: number, max: number, step: number, loading: boolean, error: (Error|null) }}
 *   Resolved bounds, loading flag and error.
 */
export function useRangeBounds({ fieldName, catalog } = {}) {
  // État du résultat courant. `key` identifie le jeu d'inputs qui l'a produit :
  // on s'en sert pour dériver `loading` sans setState synchrone dans l'effet
  // (interdit par les Rules of Hooks v6 — règle set-state-in-effect).
  const [result, setResult] = useState({ key: null, bounds: MOCK_BOUNDS, error: null });

  // Clé de la requête courante (miroir de celle stockée dans l'effet).
  const requestKey = `${fieldName}|${catalog}`;

  useEffect(() => {
    // Garde d'annulation : ignore la réponse si les inputs ont changé entre-temps.
    let cancelled = false;
    const key = `${fieldName}|${catalog}`;

    // --- Fallback mock : résolu en asynchrone pour exercer le même cycle
    //     loading→données que l'API GraphQL réelle. ---
    const promise = Promise.resolve(MOCK_BOUNDS);

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
    // Le cycle { loading, error } est déjà câblé : `loading` se déduit de la
    // comparaison de clés (plus bas), `error` est renseigné par le .catch ci-dessous.
    // ====================================================================

    promise
      // Succès : on enregistre le résultat tagué avec la clé de la requête.
      .then((bounds) => { if (!cancelled) setResult({ key, bounds: bounds ?? MOCK_BOUNDS, error: null }); })
      // Erreur : place réservée pour la remontée d'erreur GraphQL.
      .catch((err) => { if (!cancelled) setResult({ key, bounds: MOCK_BOUNDS, error: err }); });

    return () => { cancelled = true; };
  }, [fieldName, catalog]);

  // `loading` dérivé : vrai tant que le résultat stocké ne correspond pas aux
  // inputs courants (premier rendu ou inputs qui viennent de changer).
  const loading = result.key !== requestKey;

  return {
    min: result.bounds.min,
    max: result.bounds.max,
    step: result.bounds.step,
    loading,
    error: result.error,
  };
}
