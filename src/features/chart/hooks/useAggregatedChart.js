// Importation des modules
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import { useAggregates } from '../sources/useAggregates';
import { useFactTable } from '../sources/useFactTable';
import { planAggregation, toChartProps, DEFAULT_AGGREGATE_LABELS } from '../utils/aggregationPlan';

// =================================================================
// HOOK — PROPS DE <Chart> ISSUES DES AGRÉGATS DE L'API OU DES LIGNES BRUTES
// =================================================================
// Pont entre une page et <Chart> : décide qui agrège (planAggregation), interroge
// getAggregates quand c'est le serveur, et rend des props prêtes à étaler sur <Chart>.
// <Chart> lui-même ne fait aucune requête — il reste installable seul depuis le
// registry ; sa prop `aggregate`, posée ici, lui dit seulement de ne pas ré-agréger.

// Plafond de groupes (agrégats) ou de lignes (tracé brut) d'une requête
// (API.PAGINATION.MAX_LIMIT) : au-delà, le graphique est tronqué et `truncated` le signale.
const MAX_GROUPS = 1000;
const MAX_ROWS = 1000;

/**
 * Builds `<Chart>` props from server-side aggregates for grouping charts (bars, stacks,
 * heatmap, lines, bubbles on two categorical axes), or from the raw rows for the others
 * (scatter, violin, density, other bubbles).
 *
 * @param {Object} params
 * @param {string} params.x - Abscissa column.
 * @param {string} [params.y] - Ordinate column (defaults to the first measure).
 * @param {string} [params.z] - Third dimension.
 * @param {string|string[]} [params.hue] - Series columns.
 * @param {Array<string|{measure: string, aggregation?: string}>} [params.measures] -
 *   Measures of the value axis; two or more are plotted as hue = measure.
 * @param {?Array<Object>} params.fields - Column metadata (`fields` of DatasetWithMetadata).
 * @param {'none'|'line'|'fill'} [params.fill='line'] - Fill mode passed to `<Chart>`.
 * @param {string} [params.grain] - `TimeGrain` of a date position column (e.g. 'MONTH').
 * @param {Array<Object>} [params.rows] - Raw rows, plotted in client mode. Without them
 *   the hook loads its own: the plotted columns only, under `structuredFilters`, up to
 *   1000 rows — never the page of a table, whose order and size have nothing to do with
 *   the chart.
 * @param {?Object} [params.structuredFilters] - Filter tree sent with the aggregates.
 * @param {string} [params.catalog] - API catalog.
 * @param {string} [params.schema] - API schema.
 * @param {boolean} [params.categoricalX=false] - Same as `<Chart categorical-x>`.
 * @param {boolean} [params.categoricalY=false] - Same as `<Chart categorical-y>`.
 * @param {'density'|'bubble'} [params.zMark='density'] - Same as `<Chart zMark>`; it
 *   drives the plan and is returned in `chartProps`, so that `<Chart>` detects the same kind.
 * @param {Object} [params.labels] - Wording of the aggregated axes and series (see
 *   `DEFAULT_AGGREGATE_LABELS`), filled by the i18n layer.
 * @returns {{mode: ('server'|'client'), chartProps: Object, loading: boolean,
 *   error: (Error|null), truncated: boolean}} `chartProps` holds `data`, `x`, `y`, `z`,
 *   `hue`, `fields`, `zMark` (when z is given), and in server mode `labels` and `aggregate`.
 */
export function useAggregatedChart({
  x, y, z, hue, measures, fields, fill = 'line', grain, rows,
  structuredFilters, catalog, schema, categoricalX = false, categoricalY = false, labels,
  zMark = 'density',
}) {
  const plan = planAggregation({ x, y, z, hue, fields, fill, measures, grain, categoricalX, categoricalY, zMark });
  // La marque de z suit les props : <Chart> doit détecter le même kind que le plan
  const zProps = z ? { z, zMark } : {};

  // Colonnes du tracé brut : axes et séries, rien d'autre (moins de lignes à transférer).
  const first = measures?.[0];
  const rawY = y ?? (typeof first === 'string' ? first : first?.measure);
  const rawColumns = [...new Set([x, rawY, z, ...(Array.isArray(hue) ? hue : [hue])].filter(Boolean))];
  // Lignes brutes chargées ici seulement en mode client et sans `rows` fournies.
  const own = useFactTable({
    fields: rawColumns,
    structuredFilters,
    limit: MAX_ROWS,
    catalog,
    schema,
    enabled: !plan && rows === undefined && rawColumns.length > 0,
  });
  const { result, loading, error } = useAggregates({
    groupBy: plan?.groupBy,
    aggregates: plan?.aggregates,
    format: plan?.format,
    structuredFilters,
    catalog,
    schema,
    limit: MAX_GROUPS,
    includeRowCount: false,
    enabled: Boolean(plan),
  });

  // Lignes brutes : le graphique les réduit lui-même (agrégation par défaut de la mesure)
  // ou n'a rien à réduire (KDE, nuage).
  if (!plan) {
    const provided = rows !== undefined;
    return {
      mode: 'client',
      chartProps: { data: provided ? rows : own.rows, x, y: rawY, ...zProps, hue, fields },
      loading: provided ? false : own.loading,
      error: provided ? null : own.error,
      truncated: provided ? false : Boolean(own.metadata?.hasNextPage),
    };
  }

  // Agrégats : aucun graphique tant qu'aucun résultat de CE plan n'est arrivé (des lignes
  // brutes affichées entre-temps seraient des valeurs d'une autre nature).
  const mapped = result ? toChartProps(result, plan, mergeLabels(DEFAULT_AGGREGATE_LABELS, labels)) : null;
  const zMarkProps = plan.z ? { zMark } : {};
  return {
    mode: 'server',
    chartProps: mapped ? { ...mapped, ...zMarkProps } : {
      data: [], x: plan.x, y: plan.y, ...(plan.z ? { z: plan.z } : {}), ...zMarkProps, hue: plan.hue, fields,
    },
    loading,
    error,
    truncated: Boolean(result?.hasNextPage),
  };
}
