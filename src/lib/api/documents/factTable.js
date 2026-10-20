// Importation des modules
import { gql } from './gql';

// =================================================================
// DOCUMENT — getFactTableWithMetadata
// =================================================================
// Lignes de faits au format long (`data`, mis en forme par `format`), leurs
// métadonnées de colonnes (`fields`, mêmes noms et même ordre que `columns`) et
// `metadata` (count/extents/pagination) : de quoi alimenter <Chart> et <Table>
// en un seul appel, sans requête getCatalogSchema parallèle. `catalog` / `schema`
// sont de simples arguments de requête.
//
// La sélection de `fields` est la même que celle de catalogSchema.js.

/**
 * `getFactTableWithMetadata` query document.
 *
 * @type {string}
 */
export const GET_FACT_TABLE_WITH_METADATA = gql`
  query GetFactTableWithMetadata(
    $fields: [String!]
    $structuredFilters: FilterNode
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
      fields {
        name
        label
        sqlType
        typeFamily
        filterOperations
        isCategorical
        isPrimaryKey
        unit
        displayFormat
        labelFor
        labelFields
        parentName
        defaultAggregation
      }
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
