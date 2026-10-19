// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_FACT_TABLE_WITH_METADATA } from '@/lib/api/documents';

// =================================================================
// SOURCE — FACT TABLE + MÉTADONNÉES DE COLONNES (pour <Table>)
// =================================================================
// <Table> consomme deux choses : les lignes et le schéma de leurs colonnes (nom,
// libellé, famille de type, drapeau catégoriel… qui lui permettent de dériver ses
// colonnes automatiquement ). Dans la version 0.3.0 de l'API GraphQL
// `getFactTableWithMetadata` renvoie les deux dans le même appel :
//  `data` / `fields` sont passées telles quelles à <Table>
// (props `data` / `columnsMetadata`), sans reformatage.

function fetchFactTableWithMetadata([, fields, structuredFilters, limit, offset, sort, catalog, schema]) {
  return request(
    GET_FACT_TABLE_WITH_METADATA,
    { fields, structuredFilters, limit, offset, sort, format: 'OBJECTS', catalog, schema },
  ).then(({ getFactTableWithMetadata: { columns, fields: columnsMetadata, data, metadata } }) => (
    { columns, data, metadata, columnsMetadata }
  ));
}

/**
 * Fetches a long-format fact table (ready to feed `<Table data={…} />`) plus
 * the metadata of its columns (`fields`, ready to feed `<Table columnsMetadata={…} />`).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['factTableWithMetadata', fields, structuredFilters, limit, offset, sort,
 * catalog, schema]` key across component instances.
 *
 * @param {Object}   [params]
 * @param {string[]} [params.fields] - Columns to select.
 * @param {Object}   [params.structuredFilters] - Filter tree (`FilterNode`, root = group).
 * @param {number}   [params.limit=100] - Page size, max 1000.
 * @param {number}   [params.offset=0] - Row offset, max 10000.
 * @param {Array}    [params.sort] - `[{ field, order }]`.
 * @param {string}   [params.catalog] - Ducklake catalog (query argument).
 * @param {string}   [params.schema]  - Ducklake schema (query argument).
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
