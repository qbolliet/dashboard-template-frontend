// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_FIELD_STATS } from '@/lib/api/documents';

// =================================================================
// SOURCE — STATISTIQUES D'UN CHAMP (getFieldStats)
// =================================================================
// `{ min, max, distinctCount, nullCount }` d'une colonne, sur le jeu filtré par
// `structuredFilters` ou sur toute la table sans filtre. `min` / `max` suivent la
// sérialisation du scalaire JSON de l'API : nombre, date ISO `YYYY-MM-DD`, horodatage
// ISO 8601, ou texte (ordre lexical) sur une colonne VARCHAR.

function fetchFieldStats([, fieldName, filtersJson, catalog, schema]) {
  // L'arbre voyage dans la clé SWR sous forme de JSON (cf. useFactTableWithMetadata)
  const structuredFilters = filtersJson ? JSON.parse(filtersJson) : undefined;
  return request(GET_FIELD_STATS, { fieldName, structuredFilters, catalog, schema })
    .then((data) => data.getFieldStats);
}

/**
 * Fetches the statistics of one column, optionally restricted by a filter tree.
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['fieldStats', fieldName, JSON(structuredFilters), catalog, schema]` key, and
 * keeps the previous stats visible while a new filter resolves.
 *
 * @param {Object}  params
 * @param {string}  [params.fieldName]         - API field name; without it nothing is fetched.
 * @param {?Object} [params.structuredFilters] - Filter tree (`FilterNode`, root = group).
 *   A new object with the same content reuses the same cache entry.
 * @param {string}  [params.catalog]           - API catalog.
 * @param {string}  [params.schema]            - API schema within the catalog.
 * @param {boolean} [params.enabled]           - Fetch activé (défaut true).
 * @returns {{ stats: ({min: *, max: *, distinctCount: number, nullCount: number}|null),
 *   loading: boolean, error: (Error|null) }} Stats (null until the first response).
 */
export function useFieldStats({ fieldName, structuredFilters, catalog, schema, enabled = true } = {}) {
  // L'arbre est recréé à chaque rendu du consommateur : sa forme JSON, stable tant que
  // son contenu ne change pas, sert de clé.
  const filtersJson = structuredFilters ? JSON.stringify(structuredFilters) : null;
  const key = enabled && fieldName ? ['fieldStats', fieldName, filtersJson, catalog, schema] : null;
  const { data, error, isLoading } = useSWR(key, fetchFieldStats, { keepPreviousData: true });

  return { stats: data ?? null, loading: isLoading, error: error ?? null };
}
