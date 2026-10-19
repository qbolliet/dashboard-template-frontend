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

/**
 * `getSelectOptions` query document — flat, server-searchable options.
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
  ) {
    getSelectOptions(
      fieldName: $fieldName
      limit: $limit
      searchTerm: $searchTerm
      catalog: $catalog
      schema: $schema
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
 * level and `maxDepth` the number of levels kept going up from it.
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
  ) {
    getSelectOptionsTree(
      fieldName: $fieldName
      maxDepth: $maxDepth
      searchTerm: $searchTerm
      catalog: $catalog
      schema: $schema
    )
  }
`;
