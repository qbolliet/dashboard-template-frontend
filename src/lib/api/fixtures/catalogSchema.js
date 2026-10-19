// Importation des modules
// Extension explicite : scripts/mock-api-server.js charge ce fichier par `import()` natif
// de Node, qui ne résout pas les chemins sans extension (le bundler, lui, accepte les deux).
import { defineField } from './metadata.js';

// =================================================================
// FIXTURE — getCatalogSchema (panel macro)
// =================================================================
// Métadonnées de champs telles que les renvoie `getCatalogSchema` au contrat 0.3.0 :
// types DuckDB (`sqlType`), famille de type et opérations de filtre dérivées,
// hiérarchie (`parentName`) et colonnes de libellés (`labelFor` / `labelFields`).
// Elles pilotent DIRECTEMENT CriterionMenu (type de champ, opérations, widget).
// Jeu par défaut du transport mock ; le schéma du catalogue documentaire est
// porté par fixtures/factTable.json (clé `columnsMetadata`).

/**
 * Field metadata list (`Metadata[]`) for the macro demo catalog.
 *
 * @type {Array<Object>}
 */
export const MACRO_CATALOG_SCHEMA = [
  // Mesures continues
  defineField({ name: 'gdp', label: 'Croissance du PIB (%)', sqlType: 'DOUBLE', unit: '%', displayFormat: ',.1f', family: 'Mesures' }),
  defineField({ name: 'inflation', label: "Taux d'inflation (%)", sqlType: 'DOUBLE', unit: '%', displayFormat: ',.1f', family: 'Mesures' }),
  defineField({ name: 'chomage', label: 'Taux de chômage (%)', sqlType: 'DOUBLE', unit: '%', displayFormat: ',.1f', family: 'Mesures' }),
  defineField({ name: 'dette_pib', label: 'Dette publique / PIB (%)', sqlType: 'DOUBLE', unit: '%', displayFormat: ',.1f', family: 'Mesures' }),
  defineField({ name: 'prod_indus', label: 'Production industrielle (idx)', sqlType: 'DOUBLE', displayFormat: ',.1f', family: 'Mesures' }),
  defineField({ name: 'taux_dir', label: 'Taux directeur (%)', sqlType: 'DOUBLE', unit: '%', displayFormat: ',.2f', family: 'Mesures' }),

  // Dates
  defineField({ name: 'date_obs', label: "Date d'observation", sqlType: 'DATE', isPrimaryKey: true, family: 'Dates' }),
  defineField({ name: 'date_pub', label: 'Date de publication', sqlType: 'DATE', family: 'Dates' }),
  defineField({ name: 'date_rev', label: 'Date de révision', sqlType: 'DATE', family: 'Dates' }),
  defineField({ name: 'date_maj', label: 'Date de mise à jour', sqlType: 'DATE', family: 'Dates' }),

  // Dimensions catégorielles. `country` descend de `region` (hiérarchie à 2 niveaux,
  // lue par getSelectOptionsTree) ; `region` et `indicator` portent chacune une
  // colonne de libellés : leur `value` est un code, leur `label` un texte lisible.
  defineField({ name: 'indicator', label: 'Indicateur', sqlType: 'VARCHAR', isCategorical: true, labelFields: ['indicator_label'], family: 'Dimensions' }),
  defineField({ name: 'indicator_label', label: "Libellé de l'indicateur", sqlType: 'VARCHAR', labelFor: 'indicator', family: 'Dimensions' }),
  defineField({ name: 'sector', label: "Secteur d'activité", sqlType: 'VARCHAR', isCategorical: true, family: 'Dimensions' }),
  defineField({ name: 'region', label: 'Région', sqlType: 'VARCHAR', isCategorical: true, labelFields: ['region_label'], family: 'Dimensions' }),
  defineField({ name: 'region_label', label: 'Libellé de la région', sqlType: 'VARCHAR', labelFor: 'region', family: 'Dimensions' }),
  defineField({ name: 'type_orga', label: "Type d'organisme", sqlType: 'VARCHAR', isCategorical: true, family: 'Dimensions' }),
  defineField({ name: 'frequence', label: 'Fréquence', sqlType: 'VARCHAR', isCategorical: true, family: 'Dimensions' }),
  defineField({ name: 'country', label: 'Pays', sqlType: 'VARCHAR', isCategorical: true, isPrimaryKey: true, parentName: 'region', family: 'Dimensions' }),

  // Champs texte libre (non catégoriels)
  defineField({ name: 'libelle', label: 'Libellé', sqlType: 'VARCHAR' }),
  defineField({ name: 'commentaire', label: 'Commentaire', sqlType: 'VARCHAR' }),
  defineField({ name: 'source', label: 'Source', sqlType: 'VARCHAR' }),
  defineField({ name: 'note', label: 'Note libre', sqlType: 'VARCHAR' }),
];
