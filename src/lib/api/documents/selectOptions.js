// Importation des modules
import { gql } from './gql';

// =================================================================
// DOCUMENTS — getSelectOptions / getSelectOptionsTree
// =================================================================
// Options des menus déroulants de filtrage. Mode plat : valeurs distinctes d'une
// colonne, filtrables côté serveur par `searchTerm`. Mode hiérarchique : arbre
// [{ value, label, children? }] d'une chaîne de colonnes (remontée côté serveur
// par `Metadata.parentName`) ; avec `maxDepth: 2` sur la feuille, c'est le format
// « groupes d'options » de SelectMenu, une fois mappé par useSelectOptions.
// `structuredFilters` (le FilterNode de getFieldStats) restreint, dans les deux modes, les
// lignes lues AVANT le DISTINCT : seules les valeurs encore portées par une ligne qui le
// satisfait sont renvoyées. Absent : toutes les lignes, comme sans l'argument.

/**
 * `getSelectOptions` query document — flat, server-searchable options, optionally
 * restricted to the rows satisfying `structuredFilters`.
 *
 * @type {string}
 */
export const GET_SELECT_OPTIONS = gql`
  query GetSelectOptions(
    $fieldName: String!
    $limit: Int = 50
    $searchTerm: String = ""
    $catalog: String
    $schema: String
    $structuredFilters: FilterNode
  ) {
    getSelectOptions(
      fieldName: $fieldName
      limit: $limit
      searchTerm: $searchTerm
      catalog: $catalog
      schema: $schema
      structuredFilters: $structuredFilters
    ) {
      value
      label
    }
  }
`;

/**
 * `getSelectOptionsTree` query document — nested options of a column hierarchy.
 *
 * Returns a JSON tree `[{ value, label, children? }]`; `fieldName` is the deepest
 * level and `maxDepth` the number of levels kept going up from it. `structuredFilters`
 * prunes the branches holding no row that satisfies it.
 *
 * @type {string}
 */
export const GET_SELECT_OPTIONS_TREE = gql`
  query GetSelectOptionsTree(
    $fieldName: String!
    $maxDepth: Int
    $searchTerm: String
    $catalog: String
    $schema: String
    $structuredFilters: FilterNode
  ) {
    getSelectOptionsTree(
      fieldName: $fieldName
      maxDepth: $maxDepth
      searchTerm: $searchTerm
      catalog: $catalog
      schema: $schema
      structuredFilters: $structuredFilters
    )
  }
`;
