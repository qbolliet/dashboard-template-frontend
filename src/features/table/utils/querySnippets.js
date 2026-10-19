// =================================================================
// QUERY SNIPPETS — filtres/tri de la table → variables + requêtes GraphQL copiables
// =================================================================
// Les extraits reproduisent EXACTEMENT la requête du tableau : même FilterNode
// (filtre du menu + critères IN des colonnes filtrées), même tri, même page. L'API
// n'a pas d'authentification : aucun en-tête Authorization.

// Importation des modules
import { andNodes, columnCriteria } from '@/features/filter/utils/filterEngine';

/** GraphQL argument types, keyed by variable name (used to build the query document). */
const GRAPHQL_TYPE_BY_VAR = {
  structuredFilters: 'FilterNode',
  sort: '[SortInput!]',
  limit: 'Int!',
  catalog: 'String',
  schema: 'String',
};

const DEFAULT_OPERATION = 'getFactTableWithMetadata';
// Repli quand NEXT_PUBLIC_API_URL n'est pas défini (transport mock en mémoire) :
// l'URL du serveur mock `npm run mock:api`, contre lequel les extraits s'exécutent.
const DEFAULT_ENDPOINT = 'http://localhost:4000/graphql';

/**
 * Resolves the GraphQL endpoint: explicit `queryHint.apiBase` first, then the
 * `NEXT_PUBLIC_API_URL` env var, then the local mock server (`npm run mock:api`).
 *
 * @param {{apiBase?: string}} [queryHint]
 * @returns {string} Endpoint URL.
 */
function resolveEndpoint(queryHint = {}) {
  return queryHint.apiBase || process.env.NEXT_PUBLIC_API_URL || DEFAULT_ENDPOINT;
}

/**
 * Builds the GraphQL variables object driving the `getFactTableWithMetadata`
 * query from the table's active per-column filters and sort state.
 *
 * @param {Object<string, ?Array>} filters - Per-column value selections
 *   (`null` = all selected / no filter for that column).
 * @param {?{key: string, dir: 'asc'|'desc'}} sort - Active sort, or `null`.
 * @param {Array<{key: string, typeFamily?: string}>} columns - Column definitions
 *   (drive filter iteration order and value typing).
 * @param {{catalog?: string, schema?: string, limit?: number,
 *   structuredFilters?: Object}} [queryHint] - Ducklake coordinates / page size,
 *   forwarded to variables when defined; `structuredFilters` (e.g. the dashboard
 *   menu filter) is ANDed with the column filters.
 * @returns {{structuredFilters?: Object, sort: Array<{field: string, order: 'ASC'|'DESC'}>,
 *   limit?: number, catalog?: string, schema?: string}} GraphQL variables.
 */
export function buildQueryVariables(filters, sort, columns, queryHint = {}) {
  const variables = {};
  // FilterNode unique : filtre amont (menu) ET critères IN des colonnes filtrées.
  // Absent quand il n'y a aucun filtre (une variable nulle serait déclarée pour rien).
  const structuredFilters = andNodes(queryHint.structuredFilters ?? null, columnCriteria(filters, columns));
  if (structuredFilters) variables.structuredFilters = structuredFilters;
  variables.sort = sort ? [{ field: sort.key, order: sort.dir === 'asc' ? 'ASC' : 'DESC' }] : [];
  if (queryHint.limit != null) variables.limit = queryHint.limit;
  if (queryHint.catalog != null) variables.catalog = queryHint.catalog;
  if (queryHint.schema != null) variables.schema = queryHint.schema;
  return variables;
}

/**
 * Builds the GraphQL query document text for `getFactTableWithMetadata`,
 * declaring only the variables actually present in `vars` (an unused
 * declared variable is a GraphQL validation error).
 *
 * @param {Object} vars - Variables object from `buildQueryVariables`.
 * @param {string} operation - GraphQL field name (e.g. `getFactTableWithMetadata`).
 * @returns {string} Query document, e.g.
 *   `query GetFactTableWithMetadata($structuredFilters: FilterNode, …) { … }`.
 */
export function buildQueryDocument(vars, operation = DEFAULT_OPERATION) {
  const varNames = Object.keys(vars).filter((k) => vars[k] !== undefined);
  const decl = varNames.map((k) => `$${k}: ${GRAPHQL_TYPE_BY_VAR[k]}`).join(', ');
  const args = varNames.map((k) => `${k}: $${k}`).join(', ');
  const operationName = operation.charAt(0).toUpperCase() + operation.slice(1);
  return [
    `query ${operationName}(${decl}) {`,
    `  ${operation}(${args}) {`,
    '    columns',
    '    data',
    '    metadata { count total }',
    '  }',
    '}',
  ].join('\n');
}

/**
 * Builds the fetch (JavaScript) snippet for the current filters/sort.
 *
 * @param {Object} vars - Variables object from `buildQueryVariables`.
 * @param {{apiBase?: string, operation?: string}} [queryHint]
 * @returns {string} Copy-pasteable JavaScript snippet.
 */
export function snippetFetch(vars, queryHint = {}) {
  const endpoint = resolveEndpoint(queryHint);
  const operation = queryHint.operation || DEFAULT_OPERATION;
  const query = buildQueryDocument(vars, operation);
  return [
    '// JavaScript — fetch',
    `const res = await fetch(${JSON.stringify(endpoint)}, {`,
    '  method: "POST",',
    '  headers: { "Content-Type": "application/json" },',
    '  body: JSON.stringify({',
    `    query: ${JSON.stringify(query)},`,
    `    variables: ${JSON.stringify(vars, null, 2).replace(/\n/g, '\n    ')},`,
    '  }),',
    '});',
    'const { data } = await res.json();',
    `console.table(data.${operation}.data);`,
  ].join('\n');
}

/**
 * Builds the Python (`requests` + `pandas`) snippet for the current
 * filters/sort.
 *
 * @param {Object} vars - Variables object from `buildQueryVariables`.
 * @param {{apiBase?: string, operation?: string}} [queryHint]
 * @returns {string} Copy-pasteable Python snippet.
 */
export function snippetPython(vars, queryHint = {}) {
  const endpoint = resolveEndpoint(queryHint);
  const operation = queryHint.operation || DEFAULT_OPERATION;
  const query = buildQueryDocument(vars, operation);
  return [
    '# Python — requests',
    'import json, requests, pandas as pd',
    '',
    `query = ${JSON.stringify(query)}`,
    // Variables relues depuis du JSON : `null`/`true` n'existent pas en Python,
    // un littéral dict ne serait pas exécutable tel quel.
    `variables = json.loads(${JSON.stringify(JSON.stringify(vars))})`,
    '',
    'resp = requests.post(',
    `    ${JSON.stringify(endpoint)},`,
    '    json={"query": query, "variables": variables},',
    '    timeout=30,',
    ')',
    'resp.raise_for_status()',
    `df = pd.DataFrame(resp.json()["data"]["${operation}"]["data"])`,
  ].join('\n');
}

/**
 * Quotes a string for a POSIX shell (single quotes, inner quotes escaped).
 *
 * @param {string} s - Raw string.
 * @returns {string} Shell-safe single-quoted string.
 */
const shellQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/**
 * Builds the cURL snippet for the current filters/sort.
 *
 * @param {Object} vars - Variables object from `buildQueryVariables`.
 * @param {{apiBase?: string, operation?: string}} [queryHint]
 * @returns {string} Copy-pasteable cURL command.
 */
export function snippetCurl(vars, queryHint = {}) {
  const endpoint = resolveEndpoint(queryHint);
  const operation = queryHint.operation || DEFAULT_OPERATION;
  const query = buildQueryDocument(vars, operation);
  const body = JSON.stringify({ query, variables: vars });
  return [
    '# cURL',
    `curl -sS ${shellQuote(endpoint)} \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d ${shellQuote(body)}`,
  ].join('\n');
}

/**
 * Builds the URL of the REST export endpoint (`GET /api/export`) for the current
 * filters/sort: the whole filtered dataset, not only the loaded page.
 *
 * @param {Object} vars - Variables object from `buildQueryVariables`.
 * @param {{apiBase?: string}} [queryHint]
 * @param {'parquet'|'csv'|'arrow'} [format='parquet'] - Export format.
 * @returns {string} Export URL, `filters` being the URL-encoded FilterNode JSON.
 */
export function buildExportUrl(vars, queryHint = {}, format = 'parquet') {
  // L'export est servi à côté de /graphql, sous le même préfixe éventuel
  const base = resolveEndpoint(queryHint).replace(/\/graphql\/?$/, '');
  const params = new URLSearchParams({ format });
  if (vars.catalog != null) params.set('catalog', vars.catalog);
  if (vars.schema != null) params.set('schema', vars.schema);
  if (vars.sort?.length) {
    params.set('sort', vars.sort.map(({ field, order }) => `${field}:${order.toLowerCase()}`).join(','));
  }
  if (vars.structuredFilters) params.set('filters', JSON.stringify(vars.structuredFilters));
  // Pas de `limit` : l'export porte sur tout le jeu filtré
  return `${base}/api/export?${params}`;
}

/**
 * Builds the cURL snippet downloading the whole filtered dataset as Parquet
 * through the export endpoint (`curl -OJ` keeps the server-provided file name).
 *
 * @param {Object} vars - Variables object from `buildQueryVariables`.
 * @param {{apiBase?: string}} [queryHint]
 * @returns {string} Copy-pasteable cURL command.
 */
export function snippetExport(vars, queryHint = {}) {
  return [
    '# cURL — export complet (.parquet)',
    `curl -sS -OJ ${shellQuote(buildExportUrl(vars, queryHint))}`,
  ].join('\n');
}

// NOTE : `highlight()` vivait ici. Elle est promue dans src/utils/highlight/highlight.js
// depuis qu'un second consommateur non lié existe (les blocs de code de la
// documentation du template), et y a été corrigée : coloration en une seule passe, au lieu de
// `replace` enchaînés dont la regex de chaînes rematchait le balisage déjà injecté.
