// Importation des modules
import { gql } from './gql';

// =================================================================
// DOCUMENT — getAggregates
// =================================================================
// Agrégats de une ou plusieurs mesures, regroupés par zéro à quatre colonnes (une
// colonne date ou horodatage pouvant être tronquée à un grain : MONTH…), calculés
// par l'API sur TOUT le jeu filtré — pas sur une page de lignes. `aggregates`
// décrit chaque colonne de valeur (alias, agrégation effective, unité, format) :
// de quoi typer et formater un graphique sans requête de métadonnées parallèle.
// `format: LONG` rend une ligne par (groupe, agrégat) — `{groupes…, measure, value}`
// — pour tracer plusieurs mesures en séries.
//
// La sélection de `field` reprend celle de `fields` dans factTable.js : texte
// dupliqué volontairement, `check:gql` extrayant les blocs sans interpolation.

/**
 * `getAggregates` query document.
 *
 * @type {string}
 */
export const GET_AGGREGATES = gql`
  query GetAggregates(
    $groupBy: [GroupByInput!]
    $aggregates: [AggregateInput!]!
    $structuredFilters: FilterNode
    $sort: [AggregateSortInput!]
    $limit: Int! = 100
    $offset: Int! = 0
    $format: AggregateFormat = OBJECTS
    $includeRowCount: Boolean = true
    $catalog: String
    $schema: String
  ) {
    getAggregates(
      groupBy: $groupBy
      aggregates: $aggregates
      structuredFilters: $structuredFilters
      sort: $sort
      limit: $limit
      offset: $offset
      format: $format
      includeRowCount: $includeRowCount
      catalog: $catalog
      schema: $schema
    ) {
      groupBy {
        name
        grain
        labelColumn
        extent
        field {
          name
          label
          sqlType
          typeFamily
          isCategorical
          unit
          displayFormat
        }
      }
      aggregates {
        alias
        measure
        aggregation
        sqlType
        unit
        displayFormat
        extent
        field {
          name
          label
          sqlType
          typeFamily
          isCategorical
          unit
          displayFormat
          defaultAggregation
        }
      }
      columns
      data
      total
      hasNextPage
      generatedAt
    }
  }
`;
