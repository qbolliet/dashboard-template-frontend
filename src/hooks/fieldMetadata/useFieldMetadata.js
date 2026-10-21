// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_CATALOG_SCHEMA } from '@/lib/api/documents';

// =================================================================
// SOURCE — MÉTADONNÉES D'UN CHAMP
// =================================================================
// Lit la fiche d'UN champ (`Metadata` : famille de type, format d'affichage,
// `parentName`…) dans le schéma du catalogue. Le schéma entier voyage dans la clé SWR
// du catalogue : tous les champs d'un même catalogue partagent donc UNE requête, mise
// en cache, quel que soit le nombre de menus ou de sliders montés.
//
// Clé et fetcher PARTAGÉS avec features/filter/sources/useVariableMetadata : les deux
// hooks rangent la même donnée (le tableau `getCatalogSchema`), une seule requête sert
// donc les deux quand ils sont montés ensemble.

/**
 * SWR key of the metadata of a catalog/schema, shared by every hook reading it.
 *
 * @param {string} [catalog] - API catalog.
 * @param {string} [schema] - API schema within the catalog.
 * @returns {Array} The SWR key.
 */
export const catalogSchemaKey = (catalog, schema) => ['catalogSchema', catalog, schema];

/**
 * SWR fetcher of {@link catalogSchemaKey}: the `getCatalogSchema` array.
 *
 * @param {Array} key - Key built by {@link catalogSchemaKey}.
 * @returns {Promise<Array<Object>>} Metadata of every column, label columns included.
 */
export function fetchCatalogSchema([, catalog, schema]) {
  return request(GET_CATALOG_SCHEMA, { catalog, schema }).then((data) => data.getCatalogSchema);
}

/**
 * Fetches the metadata of one field from the catalog schema.
 *
 * Backed by SWR: every field of a catalog shares the same
 * `['catalogSchema', catalog, schema]` entry (see {@link catalogSchemaKey}).
 *
 * @param {Object}  params
 * @param {string}  [params.fieldName] - API field name; without it nothing is fetched.
 * @param {string}  [params.catalog]   - API catalog.
 * @param {string}  [params.schema]    - API schema within the catalog.
 * @param {boolean} [params.enabled]   - Fetch activé (défaut true). À `false`, la clé SWR
 *   est `null` : aucun appel, `ready` vaut vrai.
 * @returns {{ field: (Object|null), ready: boolean, error: (Error|null) }} The field's
 *   `Metadata` (null while loading, on error or if the field is unknown), and `ready`,
 *   true once the schema has resolved OR failed — a caller that can degrade gracefully
 *   uses it to stop waiting.
 */
export function useFieldMetadata({ fieldName, catalog, schema, enabled = true } = {}) {
  const key = enabled && fieldName ? catalogSchemaKey(catalog, schema) : null;
  const { data, error, isLoading } = useSWR(key, fetchCatalogSchema);

  return {
    field: data?.find((f) => f.name === fieldName) ?? null,
    ready: !isLoading,
    error: error ?? null,
  };
}
