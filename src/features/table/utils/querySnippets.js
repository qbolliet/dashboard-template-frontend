// =================================================================
// QUERY SNIPPETS — filtres/tri de la table → variables + requêtes GraphQL copiables
// =================================================================

/** GraphQL argument types, keyed by variable name (used to build the query document). */
const GRAPHQL_TYPE_BY_VAR = {
  structuredFilters: '[Filter]',
  sort: '[SortInput!]',
  limit: 'Int',
  catalog: 'String',
  schema: 'String',
};

const DEFAULT_OPERATION = 'getFactTableWithMetadata';
const DEFAULT_ENDPOINT = 'http://localhost:4000/graphql';

/**
 * Resolves the GraphQL endpoint: explicit `queryHint.apiBase` first, then the
 * `NEXT_PUBLIC_API_URL` env var, then a local-dev default.
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
 * @param {Array<{key: string}>} columns - Column definitions (drives filter
 *   iteration order).
 * @param {{catalog?: string, schema?: string, limit?: number}} [queryHint] -
 *   Ducklake coordinates / page size, forwarded to variables when defined.
 * @returns {{structuredFilters: Array<{key: string, operator: 'IN', values: string[]}>,
 *   sort: Array<{field: string, order: 'ASC'|'DESC'}>, limit?: number,
 *   catalog?: string, schema?: string}} GraphQL variables.
 */
export function buildQueryVariables(filters, sort, columns, queryHint = {}) {
  const structuredFilters = [];
  for (const c of columns) {
    const f = filters[c.key];
    if (f !== null) {
      structuredFilters.push({ key: c.key, operator: 'IN', values: f.map(String) });
    }
  }

  const variables = { structuredFilters };
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
 *   `query GetFactTableWithMetadata($structuredFilters: [Filter], …) { … }`.
 */
function buildQueryDocument(vars, operation) {
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
    '  headers: {',
    '    "Content-Type": "application/json",',
    '    "Authorization": `Bearer ${API_TOKEN}`,',
    '  },',
    '  body: JSON.stringify({',
    `    query: ${JSON.stringify(query)},`,
    `    variables: ${JSON.stringify(vars, null, 2)},`,
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
    'import os, requests, pandas as pd',
    '',
    `query = ${JSON.stringify(query)}`,
    '',
    'resp = requests.post(',
    `    ${JSON.stringify(endpoint)},`,
    `    json={"query": query, "variables": ${JSON.stringify(vars)}},`,
    '    headers={"Authorization": f"Bearer {os.environ[\'API_TOKEN\']}"},',
    '    timeout=30,',
    ')',
    'resp.raise_for_status()',
    `df = pd.DataFrame(resp.json()["data"]["${operation}"]["data"])`,
  ].join('\n');
}

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
    `curl -sS ${JSON.stringify(endpoint)} \\`,
    '  -H "Content-Type: application/json" \\',
    '  -H "Authorization: Bearer $API_TOKEN" \\',
    `  -d ${JSON.stringify(body)}`,
  ].join('\n');
}

/**
 * Minimal, dependency-free syntax highlighter (keywords / strings / comments)
 * for the code-reveal panel. Direct port of the prototype's `highlight()`.
 *
 * @param {string} code - Source code to highlight.
 * @param {'javascript'|'js'|'python'|'py'|'bash'|'curl'} lang - Language hint.
 * @returns {string} HTML string (escaped code + `<span class="…">` wrappers),
 *   meant for `dangerouslySetInnerHTML` on code we generated ourselves.
 */
export function highlight(code, lang) {
  let s = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (lang === 'javascript' || lang === 'js') {
    s = s.replace(/(\/\/[^\n]*)/g, '<span class="c">$1</span>');
    s = s.replace(/(&quot;[^&]*?&quot;|"[^"]*?"|`[^`]*?`)/g, '<span class="s">$1</span>');
    s = s.replace(/\b(const|let|var|await|async|function|return|if|else|for|of|in)\b/g, '<span class="k">$1</span>');
  } else if (lang === 'python' || lang === 'py') {
    s = s.replace(/(#[^\n]*)/g, '<span class="c">$1</span>');
    s = s.replace(/("[^"]*?"|'[^']*?'|f"[^"]*?")/g, '<span class="s">$1</span>');
    s = s.replace(/\b(import|from|as|def|return|if|else|for|in|raise|with|try|except)\b/g, '<span class="k">$1</span>');
  } else if (lang === 'bash' || lang === 'curl') {
    s = s.replace(/(#[^\n]*)/g, '<span class="c">$1</span>');
    s = s.replace(/("[^"]*?")/g, '<span class="s">$1</span>');
    s = s.replace(/\b(curl)\b/g, '<span class="k">$1</span>');
    s = s.replace(/(-[a-zA-Z]+)/g, '<span class="n">$1</span>');
  }
  return s;
}
