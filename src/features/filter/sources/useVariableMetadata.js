// Importation des modules
import useSWR from 'swr';
import { catalogSchemaKey, fetchCatalogSchema } from '@/hooks/fieldMetadata/useFieldMetadata';

// =================================================================
// SOURCE — VARIABLE METADATA (métadonnées de champs)
// =================================================================
// `getCatalogSchema(catalog, schema)` renvoie la liste des champs avec leurs
// métadonnées au contrat 0.3.0 { name, label, sqlType, typeFamily,
// filterOperations, isCategorical, isPrimaryKey, labelFor, … }. Ces métadonnées
// pilotent directement le CriterionMenu (famille de type, opérations acceptées,
// widget) sans type intermédiaire.
//
// `catalog` / `schema` sont les coordonnées ducklake, passées en arguments de requête.
// La clé SWR et le fetcher sont ceux de useFieldMetadata : une seule requête
// getCatalogSchema par catalogue, quel que soit le hook qui la demande.

/**
 * Maps API field metadata to the `variables` shape consumed by CriterionMenu /
 * MultiCriterionMenu: `{ value, label, typeFamily, isCategorical, filterOperations,
 * parentName, displayFormat }` (value = field name). `parentName` tells the value menu
 * to load grouped options and `displayFormat` gives the slider step, without the cards
 * requesting the schema again.
 *
 * Label columns (`labelFor` set) are dropped: they carry the label of a code
 * column, not a variable to filter on.
 *
 * @param {Array} fields - Metadata list from {@link useVariableMetadata} (or the
 *   `fields` of `getFactTableWithMetadata`).
 * @returns {{value: string, label: string, typeFamily: string, isCategorical: boolean,
 *   filterOperations: string[], parentName: ?string, displayFormat: ?string}[]}
 */
export function metadataToVariables(fields = []) {
  return fields
    .filter((f) => !f.labelFor)
    .map((f) => ({
      value: f.name,
      label: f.label,
      typeFamily: f.typeFamily,
      isCategorical: f.isCategorical,
      filterOperations: f.filterOperations,
      parentName: f.parentName ?? null,
      displayFormat: f.displayFormat ?? null,
    }));
}

/**
 * Fetches the field metadata of a catalog/schema (every column, label columns included).
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
  const { data, error, isLoading } = useSWR(catalogSchemaKey(catalog, schema), fetchCatalogSchema);

  // En cas d'échec du fetch, on renvoie un état vide + `error` : masquer la panne
  // derrière des données de démonstration tromperait le consommateur.
  if (error) {
    return { fields: [], loading: isLoading, error };
  }

  return { fields: data ?? [], loading: isLoading, error: null };
}
