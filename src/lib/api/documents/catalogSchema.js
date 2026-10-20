// Importation des modules
import { gql } from './gql';

// =================================================================
// DOCUMENT — getCatalogSchema
// =================================================================
// Métadonnées de TOUS les champs d'un catalogue/schéma (colonnes de libellés
// comprises), au contrat 0.3.0 : camelCase, famille de type (`typeFamily`) et
// opérations de filtre acceptées (`filterOperations`) dérivées par le serveur.
// Alimente les `variables` de CriterionMenu (via metadataToVariables). Pour les
// colonnes d'un jeu de résultats, préférer `getFactTableWithMetadata.fields`,
// déjà aligné sur `columns`.
//
// La sélection est la même que celle de `fields` dans factTable.js : texte
// dupliqué volontairement, `check:gql` extrayant les blocs sans interpolation.

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
  }
`;
