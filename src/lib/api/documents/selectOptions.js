// Importation des modules
import { gql } from './gql';

// =================================================================
// DOCUMENTS — getSelectOptions / getGroupedSelectOptions
// =================================================================
// Options des menus déroulants de filtrage. Mode plat : valeurs distinctes d'une
// colonne, filtrables côté serveur par `searchTerm`. Mode groupé : deux niveaux
// (ex. continent -> pays), renvoyé directement sous la forme [{ group, options }]
// consommée par SelectMenu.

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
 * `getGroupedSelectOptions` query document — two-level grouped options.
 *
 * Note: the API exposes no `searchTerm` argument here — grouped options are not
 * server-filterable (see the mock transport, which keeps a local filter).
 *
 * @type {string}
 */
export const GET_GROUPED_SELECT_OPTIONS = gql`
  query GetGroupedSelectOptions(
    $groupField: String!
    $optionsField: String!
    $limit: Int = 50
    $catalog: String
    $schema: String
  ) {
    getGroupedSelectOptions(
      groupField: $groupField
      optionsField: $optionsField
      limit: $limit
      catalog: $catalog
      schema: $schema
    ) {
      group {
        value
        label
      }
      options {
        value
        label
      }
    }
  }
`;
