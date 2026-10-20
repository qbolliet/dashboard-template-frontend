// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_AGGREGATES } from '@/lib/api/documents';

// =================================================================
// SOURCE — AGRÉGATS CALCULÉS PAR L'API (getAggregates)
// =================================================================
// Valeurs déjà agrégées par groupe (abscisse × séries, cellule…) sur TOUT le jeu filtré,
// et la description de chaque colonne de valeur (agrégation effective, unité, format).
// Le résultat porte en plus `request`, les variables avec lesquelles il a été obtenu :
// SWR garde l'ancien résultat affiché pendant qu'une nouvelle requête aboutit
// (keepPreviousData), et son format (OBJECTS / LONG) doit alors être lu sur LUI, pas sur
// la requête en cours.

function fetchAggregates([, variablesJson]) {
  // Les variables voyagent dans la clé SWR sous forme de JSON (cf. useAggregates)
  const variables = JSON.parse(variablesJson);
  return request(GET_AGGREGATES, variables)
    .then(({ getAggregates }) => ({ ...getAggregates, request: variables }));
}

/**
 * Fetches server-side aggregates (`getAggregates`).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same variables, and keeps
 * the previous result visible while a new one (new filter, new measure) resolves.
 *
 * @param {Object}  params
 * @param {Array<{field: string, grain?: string}>} [params.groupBy] - Group columns.
 * @param {Array<{measure: string, aggregation?: string, alias?: string}>} [params.aggregates] -
 *   Aggregates to compute; without them nothing is fetched.
 * @param {?Object} [params.structuredFilters] - Filter tree (`FilterNode`, root = group).
 *   A new object with the same content reuses the same cache entry.
 * @param {Array<{by: string, order?: string}>} [params.sort] - Sort of the groups.
 * @param {number}  [params.limit=1000] - Number of groups of the page (API max 1000).
 * @param {'OBJECTS'|'ARRAYS'|'LONG'} [params.format='OBJECTS'] - Row serialization.
 * @param {boolean} [params.includeRowCount=false] - Adds `row_count` to each group.
 * @param {string}  [params.catalog] - API catalog.
 * @param {string}  [params.schema] - API schema within the catalog.
 * @param {boolean} [params.enabled=true] - Fetch enabled.
 * @returns {{ result: (Object|null), loading: boolean, error: (Error|null) }} The
 *   `AggregateResult` plus its `request` variables (null until the first response).
 */
export function useAggregates({
  groupBy, aggregates, structuredFilters, sort, limit = 1000, format = 'OBJECTS',
  includeRowCount = false, catalog, schema, enabled = true,
} = {}) {
  // Les arguments sont recréés à chaque rendu du consommateur : leur forme JSON, stable
  // tant que leur contenu ne change pas, sert de clé. Les absents sont omis, pour que
  // l'API applique ses valeurs par défaut.
  const variables = {
    groupBy: groupBy ?? [],
    aggregates,
    ...(structuredFilters ? { structuredFilters } : {}),
    ...(sort ? { sort } : {}),
    limit,
    format,
    includeRowCount,
    ...(catalog ? { catalog } : {}),
    ...(schema ? { schema } : {}),
  };
  const key = enabled && aggregates?.length ? ['aggregates', JSON.stringify(variables)] : null;
  const { data, error, isLoading } = useSWR(key, fetchAggregates, { keepPreviousData: true });

  return { result: data ?? null, loading: isLoading, error: error ?? null };
}
