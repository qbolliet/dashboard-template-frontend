// =================================================================
// AGGREGATION PLAN — agréger côté serveur ou côté client, et comment
// =================================================================
// Un graphique « qui regroupe » réduit plusieurs lignes à une valeur par groupe : une
// barre par (abscisse × série), une cellule par (x × y), un point de ligne par
// (date × série). Fait côté client, ce calcul ne voit que la page chargée (100 lignes)
// et ignore l'agrégation déclarée de la mesure. L'API le fait sur TOUT le jeu filtré
// (getAggregates). Ce module décide, à partir des seules métadonnées de colonnes :
//   - QUI agrège : le serveur pour barres, barres horizontales, heatmap, lignes et bulles
//     sur deux axes catégoriels ; le client (lignes brutes) pour le nuage de points, le
//     violon, la densité et les autres bulles, dont le tracé (KDE, points, une bulle par
//     ligne) a besoin des observations individuelles ;
//   - COMMENT : colonnes de groupe (position, tronquée à un grain si c'est une date,
//     puis séries hue), mesures, format (OBJECTS pour une mesure, LONG pour plusieurs,
//     avec hue = measure) ;
// puis met le résultat de l'API à la forme des props de <Chart>. Pur : ni React, ni API.

// Importation des modules
import { interpolate } from '@/utils/i18n/interpolate';
import { resolveColumnType, fieldOf } from './fieldTypes';
import { detectChart, layoutKindOf } from './typeDetection';

/**
 * Chart kinds whose grouped values are computed by the API.
 *
 * @type {Set<string>}
 */
export const SERVER_KINDS = new Set(['bar', 'bar-h', 'heatmap', 'line']);

// Nombre maximal de canaux hue de <Chart> (couleur, style, marqueur).
const MAX_HUE = 3;

// Nom de la colonne de séries du format LONG (une valeur par mesure).
const MEASURE_COLUMN = 'measure';
const VALUE_COLUMN = 'value';

/**
 * Default wording of the series and axes built from aggregates (French), overridable by
 * the `labels` of `toChartProps` — the i18n layer fills them, this module never reads
 * the dictionary.
 *
 * @type {{aggregateAxis: string, measureSeries: string, aggregations: Object<string, string>}}
 */
export const DEFAULT_AGGREGATE_LABELS = {
  aggregateAxis: '{label} ({aggregation})',
  measureSeries: 'Mesure',
  aggregations: {
    SUM: 'somme',
    AVG: 'moyenne',
    MEDIAN: 'médiane',
    MIN: 'minimum',
    MAX: 'maximum',
    COUNT: 'effectif',
    MODE: 'mode',
  },
};

/**
 * Decides who aggregates a chart kind.
 *
 * A kind is judged on its layout kind (`layoutKindOf`): bubbles on two categorical axes
 * are aggregated like a heatmap, the others plot their raw rows like a violin / density.
 *
 * @param {Object} params
 * @param {?string} params.chartKind - Kind returned by `detectChart` (null when unknown).
 * @param {'none'|'line'|'fill'} [params.fill='line'] - Fill mode; `'none'` turns a line
 *   chart into a scatter plot, which plots the raw observations.
 * @param {'date'|'number'|'categorical'} [params.xType] - Type of x (bubble only).
 * @param {'date'|'number'|'categorical'} [params.yType] - Type of y (bubble only).
 * @returns {'server'|'client'} `'server'` for bar, bar-h, heatmap, line (not scatter) and
 *   categorical × categorical bubbles; `'client'` (raw rows) for scatter, violin, density,
 *   the other bubbles and an unknown kind.
 */
export const aggregationMode = ({ chartKind, fill = 'line', xType, yType }) => {
  const kind = layoutKindOf(chartKind, xType, yType);
  if (!SERVER_KINDS.has(kind)) return 'client';
  return kind === 'line' && fill === 'none' ? 'client' : 'server';
};

// Kind et types d'axes déduits des seules métadonnées ; null si une colonne tracée n'est
// pas décrite par `fields` ou si z n'est pas numérique.
const resolveKind = ({ x, y, z, fields, categoricalX = false, categoricalY = false, zMark }) => {
  // Une colonne non décrite ne se type pas sans lignes : on renonce (repli client)
  const typeOf = (column) => (column == null ? null : resolveColumnType(fields, column, () => null));
  const xType = categoricalX ? 'categorical' : typeOf(x);
  const yType = categoricalY ? 'categorical' : typeOf(y);
  const zType = z ? typeOf(z) : null;
  if (!xType || !yType || (z && !zType)) return null;

  try {
    return { chartKind: detectChart({ xType, yType, zType, hasZ: Boolean(z), zMark }), xType, yType };
  } catch {
    // z non numérique (ou zMark inconnu) : <Chart> lèvera lui-même, rien à agréger ici
    return null;
  }
};

/**
 * Detects the chart kind from column metadata alone, before any row is loaded.
 *
 * @param {Object} params
 * @param {string} params.x - Abscissa column.
 * @param {string} params.y - Ordinate column.
 * @param {string} [params.z] - Third dimension.
 * @param {?Array<Object>} params.fields - Column metadata.
 * @param {boolean} [params.categoricalX=false] - Same as `<Chart categorical-x>`.
 * @param {boolean} [params.categoricalY=false] - Same as `<Chart categorical-y>`.
 * @param {'density'|'bubble'} [params.zMark='density'] - Same as `<Chart zMark>`.
 * @returns {?string} The `detectChart` kind, or `null` when a plotted column is not
 *   described by `fields` (its type would have to be sampled from the rows).
 */
export const chartKindOf = (params) => resolveKind(params)?.chartKind ?? null;

// Une mesure s'écrit 'population' ou { measure: 'population', aggregation: 'AVG' }.
const toAggregateInput = (m) => {
  const { measure, aggregation } = typeof m === 'string' ? { measure: m } : m;
  return aggregation ? { measure, aggregation } : { measure };
};

/**
 * Plans the server-side aggregation of a chart.
 *
 * @param {Object} params
 * @param {string} params.x - Abscissa column.
 * @param {string} [params.y] - Ordinate column. Defaults to the first measure for the
 *   kinds whose value axis is y.
 * @param {string} [params.z] - Third dimension (heatmap value, bubble size).
 * @param {string|string[]} [params.hue] - Series columns, as `<Chart hue>`.
 * @param {?Array<Object>} params.fields - Column metadata (`fields` of DatasetWithMetadata).
 * @param {'none'|'line'|'fill'} [params.fill='line'] - Fill mode of the chart.
 * @param {Array<string|{measure: string, aggregation?: string}>} [params.measures] -
 *   Measures to aggregate on the value axis; defaults to that axis' column. Two or more
 *   switch to the LONG format, plotted with hue = measure (heatmap: first measure only).
 * @param {string} [params.grain] - `TimeGrain` applied to the position column when it is
 *   a date (e.g. 'MONTH').
 * @param {boolean} [params.categoricalX=false] - Same as `<Chart categorical-x>`.
 * @param {boolean} [params.categoricalY=false] - Same as `<Chart categorical-y>`.
 * @param {'density'|'bubble'} [params.zMark='density'] - Same as `<Chart zMark>`. Bubbles
 *   on two categorical axes are grouped by x, y AND the hue columns (one bubble per cell
 *   and series), first measure only; the other bubbles plot raw rows (`null`).
 * @returns {?{chartKind: string, valueAxis: 'x'|'y'|'z', posCol: string,
 *   x: string, y: string, z: (string|undefined), groupBy: Array<Object>,
 *   aggregates: Array<Object>, format: 'OBJECTS'|'LONG', hue: (string[]|undefined)}}
 *   The getAggregates arguments plus what is needed to map the result back onto
 *   `<Chart>`; `null` when the chart plots raw rows (client mode).
 */
export const planAggregation = ({
  x, y, z, hue, fields, fill = 'line', measures, grain,
  categoricalX = false, categoricalY = false, zMark = 'density',
}) => {
  const measureList = (measures ?? []).filter(Boolean);
  const first = measureList.length ? toAggregateInput(measureList[0]).measure : undefined;

  // Le type de graphique se lit sur la mesure principale quand y n'est pas fourni
  const yCol = y ?? first;
  const { chartKind = null, xType, yType } = resolveKind({ x, y: yCol, z, fields, categoricalX, categoricalY, zMark }) ?? {};
  if (aggregationMode({ chartKind, fill, xType, yType }) === 'client') return null;

  const valueAxis = (chartKind === 'heatmap' || chartKind === 'bubble') ? 'z' : (chartKind === 'bar-h' ? 'x' : 'y');
  const columns = { x, y: yCol, z };
  const valueColumn = columns[valueAxis];
  const aggregates = (measureList.length ? measureList : [valueColumn]).map(toAggregateInput);

  // Une colonne de groupe date prend le grain demandé ; toute autre reste brute (l'API
  // refuse un grain hors DATE / TIMESTAMP).
  const groupOf = (column) => {
    const field = fieldOf(fields, column);
    const isDate = field && (field.typeFamily === 'DATE' || field.typeFamily === 'TIMESTAMP');
    return grain && isDate ? { field: column, grain } : { field: column };
  };

  // Heatmap : une cellule par (x, y), une seule mesure, pas de série.
  if (chartKind === 'heatmap') {
    return {
      chartKind, valueAxis, posCol: x, x, y: yCol, z,
      groupBy: [groupOf(x), groupOf(yCol)],
      aggregates: aggregates.slice(0, 1),
      format: 'OBJECTS',
      hue: undefined,
    };
  }

  const posCol = chartKind === 'bar-h' ? yCol : x;
  const hueCols = [...new Set(hue ? (Array.isArray(hue) ? hue : [hue]) : [])].filter((h) => h && h !== posCol);

  // Bulles (deux axes catégoriels) : une bulle par (x, y, série) — la heatmap, plus les
  // colonnes hue. Une seule mesure : plusieurs mesures sur une même échelle d'aire
  // seraient hétérogènes.
  if (chartKind === 'bubble') {
    const seriesCols = hueCols.filter((h) => h !== yCol).slice(0, MAX_HUE);
    return {
      chartKind, valueAxis, posCol, x, y: yCol, z,
      groupBy: [groupOf(x), groupOf(yCol), ...seriesCols.map((field) => ({ field }))],
      aggregates: aggregates.slice(0, 1),
      format: 'OBJECTS',
      hue: seriesCols.length ? seriesCols : undefined,
    };
  }
  const multi = aggregates.length > 1;
  // Plusieurs mesures : la mesure devient la 1re série. Les canaux hue étant limités à
  // trois, une colonne en trop n'est PAS regroupée (l'API l'agrège avec le reste) —
  // jamais regroupée puis fondue côté client, ce qui ferait une double agrégation.
  const seriesCols = multi ? hueCols.slice(0, MAX_HUE - 1) : hueCols.slice(0, MAX_HUE);
  const chartHue = multi ? [MEASURE_COLUMN, ...seriesCols] : seriesCols;

  return {
    chartKind, valueAxis, posCol, x, y: yCol, z,
    groupBy: [groupOf(posCol), ...seriesCols.map((field) => ({ field }))],
    aggregates,
    format: multi ? 'LONG' : 'OBJECTS',
    hue: chartHue.length ? chartHue : undefined,
  };
};

/**
 * Replaces, in each row, the code of a group column by its label when the API sent one.
 *
 * A code column (nc8, INSEE) grouped by getAggregates comes with a `<name>__label`
 * column (`GroupColumn.labelColumn`): the chart shows the label, under the column's own
 * name, so that axes, series and tooltips need no extra mapping. A NULL label keeps the
 * code. The metadata of such a column is retyped as categorical text, since it now holds
 * labels. Two codes sharing a label would share a category: labels are meant to be unique.
 *
 * @param {Array<Object>} rows - Rows of the result (OBJECTS or LONG).
 * @param {Array<Object>} groupBy - `AggregateResult.groupBy`.
 * @returns {{rows: Array<Object>, fields: Array<Object>}} Rows showing the labels, and the
 *   metadata of every group column.
 */
export const withGroupLabels = (rows, groupBy) => {
  const labelled = groupBy.filter((g) => g.labelColumn);
  const fields = groupBy.map((g) => (g.labelColumn
    ? { ...g.field, typeFamily: 'TEXT', isCategorical: true }
    : g.field));
  if (!labelled.length) return { rows, fields };

  return {
    rows: rows.map((row) => {
      const out = { ...row };
      for (const { name, labelColumn } of labelled) out[name] = row[labelColumn] ?? row[name];
      return out;
    }),
    fields,
  };
};

// Famille de type du RÉSULTAT d'une agrégation (un effectif est entier, une moyenne
// décimale, une somme garde la famille de sa mesure).
const resultFamily = (aggregation, field) => {
  if (aggregation === 'COUNT') return 'INTEGER';
  if (aggregation === 'AVG' || aggregation === 'MEDIAN') return 'NUMBER';
  return field?.typeFamily ?? 'NUMBER';
};

// Métadonnée synthétique d'une colonne de valeur : <Chart fields> la type (nombre) et la
// formate (unité et format de l'AggregateColumn : `,d` pour un effectif…) sans autre code.
const valueField = (aggregate, label) => ({
  name: aggregate.alias,
  label,
  typeFamily: resultFamily(aggregate.aggregation, aggregate.field),
  isCategorical: false,
  unit: aggregate.unit ?? null,
  displayFormat: aggregate.displayFormat ?? null,
  defaultAggregation: aggregate.aggregation,
});

/**
 * Maps a getAggregates result onto `<Chart>` props.
 *
 * @param {Object} result - `AggregateResult`, plus the `request` variables it was fetched
 *   with (attached by `useAggregates`), so that a result kept on screen while a new
 *   request resolves is always read with its own format.
 * @param {Object} plan - Output of `planAggregation`.
 * @param {Object} [labels] - Wording, merged over `DEFAULT_AGGREGATE_LABELS` by the caller.
 * @returns {?{data: Array<Object>, x: string, y: string, z: (string|undefined),
 *   hue: (string[]|undefined), fields: Array<Object>, labels: Object,
 *   aggregate: (Object|Array<Object>)}} Props for `<Chart>` (the caller adds `format`,
 *   `title`…); `null` when the result does not belong to this plan (stale result of
 *   another position column).
 */
export const toChartProps = (result, plan, labels = DEFAULT_AGGREGATE_LABELS) => {
  const groupNames = result.groupBy.map((g) => g.name);
  if (!groupNames.includes(plan.posCol)) return null;
  // Codes remplacés par leurs libellés (colonnes `<name>__label` de l'API)
  const { rows, fields: groupFields } = withGroupLabels(result.data, result.groupBy);

  const aggregationName = (a) => labels.aggregations?.[a] ?? a.toLowerCase();
  const axisLabel = (a) => interpolate(labels.aggregateAxis, {
    label: a.field?.label ?? a.measure,
    aggregation: aggregationName(a.aggregation),
  });
  const groupLabel = (name) => groupFields.find((f) => f.name === name)?.label ?? name;
  const long = (result.request?.format ?? 'OBJECTS') === 'LONG';
  const aggregates = result.aggregates;

  // Séries : les colonnes de groupe hors axes — hors position, et hors x ET y quand la
  // valeur est en z (heatmap : aucune ; bulles : les colonnes hue) —, la mesure en tête
  // au format LONG.
  const axisCols = plan.valueAxis === 'z' ? [plan.x, plan.y] : [plan.posCol];
  const seriesCols = groupNames.filter((n) => !axisCols.includes(n));
  const hue = long ? [MEASURE_COLUMN, ...seriesCols] : seriesCols;

  // Axes : la position et (heatmap) l'autre colonne de groupe gardent leur nom ; l'axe de
  // valeur prend l'alias (OBJECTS) ou `value` (LONG).
  const columns = { x: plan.x, y: plan.y, z: plan.z };
  const valueCol = long ? VALUE_COLUMN : aggregates[0].alias;
  columns[plan.valueAxis] = valueCol;

  let data = rows;
  let fields;
  let valueLabel;
  if (long) {
    // Une ligne par (groupe, mesure) : la mesure est rebaptisée de son alias vers son
    // libellé, qui nomme alors la série dans la légende et la tooltip.
    const labelByAlias = new Map(aggregates.map((a) => [a.alias, a.field?.label ?? a.measure]));
    data = rows.map((row) => ({ ...row, [MEASURE_COLUMN]: labelByAlias.get(row[MEASURE_COLUMN]) ?? row[MEASURE_COLUMN] }));
    // Un seul format pour l'axe : celui des mesures s'il leur est commun, sinon aucun
    // (une unité commune à des mesures hétérogènes serait fausse).
    const same = (key) => aggregates.every((a) => (a[key] ?? null) === (aggregates[0][key] ?? null));
    valueLabel = aggregates.map(axisLabel).join(', ');
    fields = [
      ...groupFields,
      { name: MEASURE_COLUMN, label: labels.measureSeries, typeFamily: 'TEXT', isCategorical: true },
      {
        name: VALUE_COLUMN,
        label: valueLabel,
        typeFamily: aggregates.every((a) => resultFamily(a.aggregation, a.field) === 'INTEGER') ? 'INTEGER' : 'NUMBER',
        isCategorical: false,
        unit: same('unit') && same('displayFormat') ? (aggregates[0].unit ?? null) : null,
        displayFormat: same('unit') && same('displayFormat') ? (aggregates[0].displayFormat ?? null) : null,
      },
    ];
  } else {
    valueLabel = axisLabel(aggregates[0]);
    fields = [...groupFields, valueField(aggregates[0], valueLabel)];
  }

  // Intitulés : axes de groupe d'après leur métadonnée, axe de valeur avec l'agrégation,
  // canaux hue d'après la colonne qu'ils portent.
  const chartLabels = {};
  for (const axis of ['x', 'y', 'z']) {
    if (columns[axis] == null) continue;
    chartLabels[axis] = axis === plan.valueAxis ? valueLabel : groupLabel(columns[axis]);
  }
  const hueLabel = (col) => (col === MEASURE_COLUMN && long ? labels.measureSeries : groupLabel(col));
  ['color', 'style', 'marker'].forEach((channel, i) => {
    if (hue[i]) chartLabels[channel] = hueLabel(hue[i]);
  });

  const declared = aggregates.map((a) => ({ measure: a.measure, aggregation: a.aggregation }));

  return {
    data,
    x: columns.x,
    y: columns.y,
    ...(columns.z ? { z: columns.z } : {}),
    hue: hue.length ? hue : undefined,
    fields,
    labels: chartLabels,
    aggregate: long ? declared : declared[0],
  };
};
