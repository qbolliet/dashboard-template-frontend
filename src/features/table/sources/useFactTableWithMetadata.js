// Importation des modules
import useSWR from 'swr';
import mockFactTable from './mockFactTable.json';

// =================================================================
// SOURCE — FACT TABLE + MÉTADONNÉES DE COLONNES (pour <Table>)
// =================================================================
// Imite `getFactTableWithMetadata(fields, structuredFilters, limit, offset,
// sort, format: OBJECTS, catalog, schema)`, complété d'un bloc `columnsMetadata`
// (forme `getCatalogSchema`) que <Table> consomme pour dériver ses colonnes
// automatiquement (cf. TABLE_ARCHITECTURE.md §9 — la vraie API ne renvoie pas
// encore les deux dans le même appel, cette source les fusionne en attendant).
//
// Même cycle mock→API que features/chart/sources/useFactTable.js et
// components/filter/SelectMenu/useSelectOptions.js : le mock figé
// (mockFactTable.json) sert de repli tant que le client GraphQL n'est pas
// branché (bloc réel commenté ci-dessous). `data`/`columns` sont passées
// TELLES QUELLES à <Table> (props `data` / `columnsMetadata`), sans reformatage.

// --- Fallback mock : résolu en asynchrone pour exercer le même cycle
//     loading→données que l'API GraphQL réelle. ---
function fetchFactTableWithMetadata([, fields, structuredFilters, limit, offset, sort, catalog, schema]) {
  const promise = Promise.resolve(mockFactTable);

  // ====================================================================
  // INTÉGRATION GRAPHQL RÉELLE — à décommenter pour brancher l'API
  // ====================================================================
  // Prérequis : un client GraphQL (ex: @apollo/client ou graphql-request),
  // non installé à ce jour. Remplacer le `const promise = ...` ci-dessus par :
  //
  //   const ENDPOINT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
  //   const headers = {
  //     ...(catalog ? { 'X-Catalog-Id': catalog } : {}),
  //     ...(schema ? { 'X-Schema-Id': schema } : {}),
  //   };
  //   const promise = Promise.all([
  //     request(ENDPOINT, GET_FACT_TABLE_WITH_METADATA, {
  //       fields, structuredFilters, limit, offset, sort, format: 'OBJECTS', catalog, schema,
  //     }, headers).then((r) => r.getFactTableWithMetadata),
  //     // getCatalogSchema résout les colonnes (name/label/sql_type/is_categorical/is_primary_key) ;
  //     // fusionnée ici pour offrir la même forme combinée que le mock.
  //     request(ENDPOINT, GET_CATALOG_SCHEMA, { catalog, schema }, headers).then((r) => r.getCatalogSchema),
  //   ]).then(([{ columns, data, metadata }, columnsMetadata]) => ({ columns, data, metadata, columnsMetadata }));
  //
  // `import { request } from 'graphql-request';` en tête de fichier, et
  // `GET_CATALOG_SCHEMA` défini à côté de GET_FACT_TABLE_WITH_METADATA
  // (cf. factTableQuery.js) une fois le client installé.
  // ====================================================================

  return promise;
}

/**
 * Fetches a long-format fact table (ready to feed `<Table data={…} />`) plus
 * its column schema (ready to feed `<Table columnsMetadata={…} />`).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['factTableWithMetadata', fields, structuredFilters, limit, offset, sort,
 * catalog, schema]` key across component instances. By default returns the
 * local mock ({@link mockFactTable}); swap it for the real GraphQL calls
 * inside {@link fetchFactTableWithMetadata} (see the commented block).
 *
 * @param {Object}   [params]
 * @param {string[]} [params.fields] - Columns to select (mock: ignored).
 * @param {Array}    [params.structuredFilters] - `[{ key, operator, value|values }]` (mock: ignored).
 * @param {number}   [params.limit=100] - Page size, max 1000 (mock: ignored).
 * @param {number}   [params.offset=0] - Row offset, max 10000 (mock: ignored).
 * @param {Array}    [params.sort] - `[{ field, order }]` (mock: ignored).
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

  // En cas d'échec du fetch, on renvoie un état vide + `error` : le mock est un
  // repli "client GraphQL pas encore branché", PAS un repli sur erreur.
  if (error) {
    return { columns: [], data: [], metadata: null, columnsMetadata: [], loading: isLoading, error };
  }

  return {
    columns: res?.columns ?? mockFactTable.columns,
    data: res?.data ?? mockFactTable.data,
    metadata: res?.metadata ?? mockFactTable.metadata,
    columnsMetadata: res?.columnsMetadata ?? mockFactTable.columnsMetadata,
    loading: isLoading,
    error: null,
  };
}
