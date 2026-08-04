// Importation des modules
import { getOperationName } from './documents/gql';
import { graphqlTransport } from './transports/graphql';
import { mockTransport } from './transports/mock';

// =================================================================
// CLIENT API — SÉLECTION DU TRANSPORT
// =================================================================
// UNIQUE point de bascule mock <-> GraphQL de tout le projet : endpoint défini
// => API réelle, sinon fixtures locales. Les hooks `sources/` appellent
// `request()` sans jamais savoir lequel des deux répond ; ils sont donc
// strictement identiques dans les deux modes, donc lintés et exécutés dans les
// deux modes.
const transport = process.env.NEXT_PUBLIC_API_URL ? graphqlTransport : mockTransport;

/**
 * Active transport, for UI that needs to tell the two apart (demo captions…).
 *
 * @type {'graphql'|'mock'}
 */
export const TRANSPORT_NAME = process.env.NEXT_PUBLIC_API_URL ? 'graphql' : 'mock';

/**
 * Runs a GraphQL document through the active transport.
 *
 * Caching and deduplication are SWR's job (see the `sources/` hooks): this
 * client holds no cache of its own.
 *
 * @param {string} document - Query document from `lib/api/documents`.
 * @param {Object} [variables] - Query variables.
 * @param {Object} [options] - Ducklake coordinates, sent as headers by the
 *   GraphQL transport (`X-Catalog-Id` / `X-Schema-Id`).
 * @param {string} [options.catalog] - Ducklake catalog.
 * @param {string} [options.schema] - Ducklake schema.
 * @returns {Promise<Object>} The GraphQL `data` object, keyed by root field.
 */
export function request(document, variables = {}, { catalog, schema } = {}) {
  return transport({
    document,
    operationName: getOperationName(document),
    variables,
    catalog,
    schema,
  });
}
