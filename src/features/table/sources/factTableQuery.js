// =================================================================
// SOURCE — DOCUMENT GRAPHQL getFactTableWithMetadata
// =================================================================
// Document de référence de l'opération consommée par la table (fields,
// structuredFilters, limit, offset, sort, format: OBJECTS, catalog, schema),
// repris tel quel de la référence API (skill dashboard-api-client). Prêt à
// être passé à un vrai client GraphQL (@apollo/client, graphql-request…) une
// fois celui-ci installé — voir le bloc commenté de useFactTableWithMetadata.js.

// Tag gabarit minimal (identité) : aucun client GraphQL n'est installé à ce
// jour (cf. package.json) ; ce tag évite la dépendance à `graphql-request`
// tout en gardant le document copiable/collable tel quel dans un vrai `gql`
// le moment venu (même convention que highlight()/buildQueryDocument() de
// utils/querySnippets.js, qui génèrent aussi du texte de requête brut).
const gql = (strings, ...values) => strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '');

/**
 * `getFactTableWithMetadata` query document — rows in long format (`data`,
 * shaped by `format`) plus `metadata` (count/extents/pagination), the exact
 * pair consumed by `<Table>` (`data` prop + optional `metadata.total`).
 *
 * @type {string}
 */
export const GET_FACT_TABLE_WITH_METADATA = gql`
  query GetFactTableWithMetadata(
    $fields: [String!]
    $structuredFilters: [Filter]
    $limit: Int! = 100
    $offset: Int! = 0
    $sort: [SortInput!]
    $format: DataFormat = OBJECTS
    $catalog: String
    $schema: String
  ) {
    getFactTableWithMetadata(
      fields: $fields
      structuredFilters: $structuredFilters
      limit: $limit
      offset: $offset
      sort: $sort
      format: $format
      catalog: $catalog
      schema: $schema
    ) {
      columns
      data
      metadata {
        count
        extents
        total
        hasNextPage
        currentPage
        totalPages
      }
    }
  }
`;

export default GET_FACT_TABLE_WITH_METADATA;
