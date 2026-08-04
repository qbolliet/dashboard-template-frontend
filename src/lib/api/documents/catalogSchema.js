// Importation des modules
import { gql } from './gql';

// =================================================================
// DOCUMENT — getCatalogSchema
// =================================================================
// Métadonnées de tous les champs d'un catalogue/schéma (lignes de la
// `metadata_table`). C'est la SEULE opération d'introspection de champs de
// l'API : elle alimente aussi bien les `columnsMetadata` de <Table> que les
// `variables` de CriterionMenu (via metadataToVariables).

/**
 * `getCatalogSchema` query document.
 *
 * @type {string}
 */
export const GET_CATALOG_SCHEMA = gql`
  query GetCatalogSchema($catalog: String, $schema: String) {
    getCatalogSchema(catalog: $catalog, schema: $schema) {
      name
      label
      python_type
      sql_type
      is_categorical
      is_primary_key
    }
  }
`;
