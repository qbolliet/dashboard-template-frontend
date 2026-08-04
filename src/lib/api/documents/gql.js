// =================================================================
// DOCUMENTS — TAG GABARIT & NOM D'OPÉRATION
// =================================================================
// Les documents de `documents/` sont de simples chaînes : `graphql-request`
// accepte le texte brut, et le transport mock doit pouvoir les lire sans tirer
// de dépendance GraphQL. On garde donc un tag identité local plutôt que le `gql`
// de graphql-request, pour que `documents/` reste importable par les deux
// transports sans embarquer le client dans le bundle en mode mock.

/**
 * Identity template tag: returns the interpolated query text unchanged.
 *
 * Exists purely so editors and tooling recognise the tagged blocks as GraphQL.
 *
 * @param {TemplateStringsArray} strings - Literal chunks of the template.
 * @param {...*} values - Interpolated values.
 * @returns {string} The assembled query document.
 */
export const gql = (strings, ...values) => strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '');

// Nom d'opération = l'identifiant qui suit `query`/`mutation` en tête de document
// (ex: `query GetFactTableWithMetadata(...)` -> `GetFactTableWithMetadata`).
// C'est la clé de routage du transport mock : une opération, un résolveur.
const OPERATION_NAME = /\b(?:query|mutation|subscription)\s+([A-Za-z_]\w*)/;

/**
 * Extracts the operation name declared by a GraphQL document.
 *
 * @param {string} document - Query document (see {@link gql}).
 * @returns {string|null} The operation name, or `null` for an anonymous document.
 */
export const getOperationName = (document) => document.match(OPERATION_NAME)?.[1] ?? null;
