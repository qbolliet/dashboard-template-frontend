// Importation des modules
import { GraphQLClient } from 'graphql-request';

// =================================================================
// TRANSPORT — API GRAPHQL
// =================================================================
// Client léger (pas de cache concurrent : la mise en cache et la déduplication
// sont assurées par SWR côté hooks). Aucun repli d'endpoint ici : si
// NEXT_PUBLIC_API_URL est absente, client.js sélectionne le transport mock et ce
// module n'est jamais appelé.
const client = new GraphQLClient(process.env.NEXT_PUBLIC_API_URL);

/**
 * Sends a GraphQL document to `NEXT_PUBLIC_API_URL`.
 *
 * `catalog` / `schema` are ducklake coordinates: they travel both as query
 * arguments (already in `variables`) and as the `X-Catalog-Id` / `X-Schema-Id`
 * headers, which override the server-side defaults.
 *
 * @param {Object} params
 * @param {string} params.document - Query document.
 * @param {Object} [params.variables] - Query variables.
 * @param {string} [params.catalog] - Ducklake catalog -> header X-Catalog-Id.
 * @param {string} [params.schema] - Ducklake schema -> header X-Schema-Id.
 * @returns {Promise<Object>} The GraphQL `data` object, keyed by root field.
 */
export function graphqlTransport({ document, variables, catalog, schema }) {
  const requestHeaders = {
    ...(catalog ? { 'X-Catalog-Id': catalog } : {}),
    ...(schema ? { 'X-Schema-Id': schema } : {}),
  };

  return client.request({ document, variables, requestHeaders });
}
