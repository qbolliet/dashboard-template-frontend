// Importation des modules
import { gql } from './gql';

// =================================================================
// DOCUMENT — getFieldStats
// =================================================================
// Bornes et cardinalité d'UNE colonne, éventuellement restreintes par l'arbre de
// filtres courant (le même `FilterNode` que getFactTableWithMetadata). Sans filtre,
// ce sont les valeurs de `Metadata.stats` ; avec filtre, de quoi recalibrer un slider
// sur le jeu filtré. `Metadata.stats` n'est volontairement PAS sélectionné dans
// factTable.js / catalogSchema.js : l'API le calcule à la demande, une requête SQL
// par colonne demandée.

/**
 * `getFieldStats` query document.
 *
 * @type {string}
 */
export const GET_FIELD_STATS = gql`
  query GetFieldStats(
    $fieldName: String!
    $structuredFilters: FilterNode
    $catalog: String
    $schema: String
  ) {
    getFieldStats(
      fieldName: $fieldName
      structuredFilters: $structuredFilters
      catalog: $catalog
      schema: $schema
    ) {
      min
      max
      distinctCount
      nullCount
    }
  }
`;
