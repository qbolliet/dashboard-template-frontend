// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_CATALOG_SCHEMA } from '@/lib/api/documents';

// =================================================================
// SOURCE — VARIABLE METADATA (métadonnées de champs)
// =================================================================
// `getCatalogSchema(catalog, schema)` renvoie la liste des champs avec leurs
// métadonnées { name, label, python_type, sql_type, is_categorical,
// is_primary_key } depuis la `metadata_table`. Ces métadonnées pilotent
// DIRECTEMENT le CriterionMenu (type de champ, opérations, widget) sans type
// intermédiaire. C'est la même opération que celle dont <Table> tire ses
// `columnsMetadata` : un seul point d'introspection de schéma côté API.
//
// `catalog` / `schema` restent les coordonnées ducklake d'accès.

function fetchVariableMetadata([, catalog, schema]) {
  return request(GET_CATALOG_SCHEMA, { catalog, schema }, { catalog, schema })
    .then((data) => data.getCatalogSchema);
}

/**
 * Maps API field metadata to the `variables` shape consumed by CriterionMenu /
 * MultiCriterionMenu : `{ value, label, sql_type, is_categorical }` (value = field name).
 *
 * @param {Array} fields - Metadata list from {@link useVariableMetadata}.
 * @returns {{value: string, label: string, sql_type: string, is_categorical: boolean}[]}
 */
export function metadataToVariables(fields = []) {
  return fields.map((f) => ({
    value: f.name,
    label: f.label,
    sql_type: f.sql_type,
    is_categorical: f.is_categorical,
  }));
}

/**
 * Fetches the field metadata of a catalog/schema (rows of the `metadata_table`).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['catalogSchema', catalog, schema]` key across component instances.
 *
 * @param {Object}  [params]
 * @param {string}  [params.catalog] - Ducklake catalog.
 * @param {string}  [params.schema]  - Ducklake schema.
 * @returns {{ fields: Array, loading: boolean, error: (Error|null) }}
 */
export function useVariableMetadata({ catalog, schema } = {}) {
  const { data, error, isLoading } = useSWR(['catalogSchema', catalog, schema], fetchVariableMetadata);

  // En cas d'échec du fetch, on renvoie un état vide + `error` : masquer la panne
  // derrière des données de démonstration tromperait le consommateur.
  if (error) {
    return { fields: [], loading: isLoading, error };
  }

  return { fields: data ?? [], loading: isLoading, error: null };
}
