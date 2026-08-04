// Importation des modules
import { gql } from './gql';

// =================================================================
// DOCUMENT — getFactTableWithMetadata
// =================================================================
// Lignes de faits au format long (`data`, mis en forme par `format`) + `metadata`
// (count/extents/pagination) : la paire consommée à la fois par <Chart> (rows
// passées telles quelles) et par <Table>. `catalog` / `schema` sont à la fois des
// arguments de requête et des en-têtes ducklake (posés par le transport GraphQL).

/**
 * `getFactTableWithMetadata` query document.
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
        generatedAt
      }
    }
  }
`;
