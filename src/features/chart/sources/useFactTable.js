// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_FACT_TABLE_WITH_METADATA } from '@/lib/api/documents';

// =================================================================
// SOURCE — FACT TABLE (lignes de faits au format long)
// =================================================================
// `getFactTableWithMetadata(fields, structuredFilters, limit, offset, sort,
// format: OBJECTS, catalog, schema)` renvoie `{ columns, data, metadata }` où
// `data` est un tableau d'OBJETS clé = nom de colonne. C'est EXACTEMENT le format
// long attendu par <Chart> : les lignes sont passées TELLES QUELLES (`rows`), sans
// reformatage — <Chart> détecte les types et `coerce()` convertit les dates ISO
// (`new Date(...)`). `metadata.extents` donne les bornes par colonne, utilisables
// pour fixer les domaines d'axes sans re-parcourir les données (cf. plus bas).
//
// Le transport (API ou fixtures) est choisi une fois pour toutes dans
// lib/api/client.js : ce hook est identique dans les deux modes. `catalog` /
// `schema` sont les coordonnées ducklake, transmises en simples arguments de
// requête.

function fetchFactTable([, fields, filtersJson, limit, offset, sort, catalog, schema]) {
  // L'arbre voyage dans la clé SWR sous forme de JSON (cf. useFactTable)
  const structuredFilters = filtersJson ? JSON.parse(filtersJson) : undefined;
  return request(
    GET_FACT_TABLE_WITH_METADATA,
    { fields, structuredFilters, limit, offset, sort, format: 'OBJECTS', catalog, schema },
  ).then((data) => data.getFactTableWithMetadata);
}

/**
 * Fetches a long-format fact table ready to feed <Chart> (`format: OBJECTS`).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['factTable', fields, JSON(structuredFilters), limit, offset, sort, catalog, schema]`
 * key across component instances, and keeps the previous rows visible while a new key
 * (e.g. a new filter) resolves.
 *
 * The returned `rows` are passed AS-IS to `<Chart data={rows} />`: no reshaping —
 * ISO date strings are coerced by the chart itself. `metadata.extents` can
 * optionally pin axis domains without re-scanning the rows (see below).
 *
 * @param {Object}   [params]
 * @param {string[]} [params.fields] - Columns to select.
 * @param {Object}   [params.structuredFilters] - Filter tree (`FilterNode`, root = group):
 *   `{ children: [{ connector, negate, criterion: { variable, operation, value } }] }`.
 * @param {number}   [params.limit=100] - Page size, max 1000.
 * @param {number}   [params.offset=0] - Row offset, max 10000.
 * @param {Array}    [params.sort] - `[{ field, order }]`.
 * @param {string}   [params.catalog] - Ducklake catalog (query argument).
 * @param {string}   [params.schema]  - Ducklake schema (query argument).
 * @param {boolean}  [params.enabled=true] - Fetch enabled; `false` sends nothing.
 * @returns {{ columns: string[], rows: Array<object>, fields: Array<object>,
 *   metadata: object|null, loading: boolean, error: (Error|null) }} `fields` are the
 *   column metadata (same names and order as `columns`), ready for `<Chart fields>`.
 */
export function useFactTable({
  fields, structuredFilters, limit = 100, offset = 0, sort, catalog, schema, enabled = true,
} = {}) {
  // L'arbre est recréé à chaque rendu du consommateur : sa forme JSON, stable tant que
  // son contenu ne change pas, sert de clé.
  const filtersJson = structuredFilters ? JSON.stringify(structuredFilters) : null;
  const key = enabled ? ['factTable', fields, filtersJson, limit, offset, sort, catalog, schema] : null;
  const { data, error, isLoading } = useSWR(key, fetchFactTable, { keepPreviousData: true });

  // ── Usage optionnel de metadata.extents ───────────────────────────────────
  // Pour fixer les domaines d'axes SANS re-parcourir `rows`, on peut lire
  // `metadata.extents[colName]` = [min, max] (mesures) ou [premier, dernier]
  // (dimensions). Exemple, à passer à <Chart> une fois le prop `domains` supporté :
  //
  //   const gdpDomain = metadata?.extents?.gdp;      // -> [98.0, 112.2]
  //   <Chart data={rows} x="date_obs" y="gdp" domains={{ y: gdpDomain }} … />
  //
  // <Chart> dérive aujourd'hui ses domaines des données ; `extents` reste dispo
  // pour coordonner plusieurs graphiques sur une échelle commune sans recalcul.

  // En cas d'échec du fetch, on renvoie un état vide + `error` : masquer la panne
  // derrière des données de démonstration tromperait le consommateur.
  if (error) {
    return { columns: [], rows: [], fields: [], metadata: null, loading: isLoading, error };
  }

  return {
    columns: data?.columns ?? [],
    rows: data?.data ?? [],
    fields: data?.fields ?? [],
    metadata: data?.metadata ?? null,
    loading: isLoading,
    error: null,
  };
}
