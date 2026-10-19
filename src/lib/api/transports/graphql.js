// Importation des modules
import { GraphQLClient } from 'graphql-request';

// =================================================================
// TRANSPORT — API GRAPHQL
// =================================================================
// Client léger (pas de cache concurrent : la mise en cache et la déduplication
// sont assurées par SWR côté hooks). Aucun repli d'endpoint ici : si
// NEXT_PUBLIC_API_URL est absente, client.js sélectionne le transport mock et ce
// module n'est jamais appelé.
//
// Aucun en-tête personnalisé : depuis le contrat 0.3.0, `catalog` / `schema` ne
// voyagent QUE comme arguments de requête (dans `variables`). L'API ne lit plus
// X-Catalog-Id / X-Schema-Id et son CORS ne les autorise pas : les envoyer ferait
// échouer le preflight du navigateur.
const client = new GraphQLClient(process.env.NEXT_PUBLIC_API_URL);

/**
 * Sends a GraphQL document to `NEXT_PUBLIC_API_URL`.
 *
 * @param {Object} params
 * @param {string} params.document - Query document.
 * @param {Object} [params.variables] - Query variables (`catalog` / `schema` included).
 * @returns {Promise<Object>} The GraphQL `data` object, keyed by root field.
 */
export function graphqlTransport({ document, variables }) {
  return client.request({ document, variables });
}
