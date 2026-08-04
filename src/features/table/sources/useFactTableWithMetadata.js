// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_FACT_TABLE_WITH_METADATA, GET_CATALOG_SCHEMA } from '@/lib/api/documents';

// =================================================================
// SOURCE — FACT TABLE + MÉTADONNÉES DE COLONNES (pour <Table>)
// =================================================================
// <Table> consomme deux choses que l'API ne renvoie PAS dans le même appel : les
// lignes (`getFactTableWithMetadata`) et le schéma de colonnes
// (`getCatalogSchema`, qui donne name/label/sql_type/is_categorical/
// is_primary_key et permet à <Table> de dériver ses colonnes automatiquement —
// cf. TABLE_ARCHITECTURE.md §9). Cette source lance donc les deux requêtes en
// parallèle et fusionne leurs réponses. `data` / `columns` sont ensuite passées
// TELLES QUELLES à <Table> (props `data` / `columnsMetadata`), sans reformatage.

function fetchFactTableWithMetadata([, fields, structuredFilters, limit, offset, sort, catalog, schema]) {
  const options = { catalog, schema };

  return Promise.all([
    request(
      GET_FACT_TABLE_WITH_METADATA,
      { fields, structuredFilters, limit, offset, sort, format: 'OBJECTS', catalog, schema },
      options,
    ).then((data) => data.getFactTableWithMetadata),
    request(GET_CATALOG_SCHEMA, { catalog, schema }, options).then((data) => data.getCatalogSchema),
  ]).then(([{ columns, data, metadata }, columnsMetadata]) => ({ columns, data, metadata, columnsMetadata }));
}

/**
 * Fetches a long-format fact table (ready to feed `<Table data={…} />`) plus
 * its column schema (ready to feed `<Table columnsMetadata={…} />`).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['factTableWithMetadata', fields, structuredFilters, limit, offset, sort,
 * catalog, schema]` key across component instances.
 *
 * @param {Object}   [params]
 * @param {string[]} [params.fields] - Columns to select.
 * @param {Array}    [params.structuredFilters] - `[{ key, operator, value|values }]`.
 * @param {number}   [params.limit=100] - Page size, max 1000.
 * @param {number}   [params.offset=0] - Row offset, max 10000.
 * @param {Array}    [params.sort] - `[{ field, order }]`.
 * @param {string}   [params.catalog] - Ducklake catalog → header X-Catalog-Id.
 * @param {string}   [params.schema]  - Ducklake schema → header X-Schema-Id.
 * @returns {{ columns: string[], data: Array<Object>, metadata: (Object|null),
 *   columnsMetadata: Array<Object>, loading: boolean, error: (Error|null) }}
 */
export function useFactTableWithMetadata({
  fields, structuredFilters, limit = 100, offset = 0, sort, catalog, schema,
} = {}) {
  const key = ['factTableWithMetadata', fields, structuredFilters, limit, offset, sort, catalog, schema];
  const { data: res, error, isLoading } = useSWR(key, fetchFactTableWithMetadata);

  // En cas d'échec du fetch, on renvoie un état vide + `error` : masquer la panne
  // derrière des données de démonstration tromperait le consommateur.
  if (error) {
    return { columns: [], data: [], metadata: null, columnsMetadata: [], loading: isLoading, error };
  }

  return {
    columns: res?.columns ?? [],
    data: res?.data ?? [],
    metadata: res?.metadata ?? null,
    columnsMetadata: res?.columnsMetadata ?? [],
    loading: isLoading,
    error: null,
  };
}
