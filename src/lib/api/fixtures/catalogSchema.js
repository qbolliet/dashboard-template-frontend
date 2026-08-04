// =================================================================
// FIXTURE — getCatalogSchema (panel macro)
// =================================================================
// Métadonnées de champs telles que les renvoie `getCatalogSchema` : elles
// pilotent DIRECTEMENT CriterionMenu (type de champ, opérations, widget), sans
// type intermédiaire. `sql_type` = type PostgreSQL ; `is_categorical` distingue
// les dimensions (SelectMenu + options) des mesures continues.
// Jeu par défaut du transport mock ; le schéma du catalogue documentaire est
// porté par fixtures/factTable.json (clé `columnsMetadata`).

/**
 * Field metadata list (`Metadata[]`) for the macro demo catalog.
 *
 * @type {Array<{name: string, label: string, python_type: string, sql_type: string,
 *   is_categorical: boolean, is_primary_key: boolean}>}
 */
export const MACRO_CATALOG_SCHEMA = [
  // Mesures continues (double precision)
  { name: 'gdp',        label: 'Croissance du PIB (%)',        python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'inflation',  label: "Taux d'inflation (%)",         python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'chomage',    label: 'Taux de chômage (%)',          python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'dette_pib',  label: 'Dette publique / PIB (%)',     python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'prod_indus', label: 'Production industrielle (idx)', python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'taux_dir',   label: 'Taux directeur (%)',           python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },

  // Dates
  { name: 'date_obs', label: "Date d'observation",   python_type: 'date', sql_type: 'date', is_categorical: false, is_primary_key: false },
  { name: 'date_pub', label: 'Date de publication',  python_type: 'date', sql_type: 'date', is_categorical: false, is_primary_key: false },
  { name: 'date_rev', label: 'Date de révision',     python_type: 'date', sql_type: 'date', is_categorical: false, is_primary_key: false },
  { name: 'date_maj', label: 'Date de mise à jour',  python_type: 'date', sql_type: 'date', is_categorical: false, is_primary_key: false },

  // Dimensions catégorielles (character varying, is_categorical)
  { name: 'indicator', label: 'Indicateur',         python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'sector',    label: "Secteur d'activité", python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'region',    label: 'Région',             python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'type_orga', label: "Type d'organisme",   python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'frequence', label: 'Fréquence',          python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'country',   label: 'Pays',               python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },

  // Champs texte libre (non catégoriels)
  { name: 'libelle',     label: 'Libellé',    python_type: 'str', sql_type: 'text', is_categorical: false, is_primary_key: false },
  { name: 'commentaire', label: 'Commentaire', python_type: 'str', sql_type: 'text', is_categorical: false, is_primary_key: false },
  { name: 'source',      label: 'Source',     python_type: 'str', sql_type: 'text', is_categorical: false, is_primary_key: false },
  { name: 'note',        label: 'Note libre', python_type: 'str', sql_type: 'text', is_categorical: false, is_primary_key: false },
];
