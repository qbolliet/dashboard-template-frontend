// =================================================================
// AGGREGATE — réduction des valeurs d'un même groupe (barre, cellule, pile)
// =================================================================
// Un graphique « qui regroupe » (barres, piles, heatmap) réduit à UNE valeur toutes les
// lignes qui tombent dans un même groupe (abscisse × série, ou cellule x × y). Ce module est
// le seul endroit qui réduit, pour <Chart> comme pour <MultiChart> (jeu par
// jeu), avec deux régimes :
//   - données BRUTES : l'agrégation par défaut de la colonne de valeur (repli : la
//     moyenne, quand aucune métadonnée ne la précise) ;
//   - données DÉJÀ AGRÉGÉES par l'API (getAggregates) : mode 'none', une ligne par
//     groupe, la valeur est rendue telle quelle — jamais ré-agrégée.
// Il ne dépend ni de React ni de l'API.

// Importation des modules
import { sum, mean, median, min, max, mode as mostFrequent } from 'd3-array';
import { fieldOf } from './fieldTypes';

// Réducteurs par valeur de l'enum `Aggregation` de l'API. Les anciens noms 'sum' / 'mean'
// ne sont plus acceptés : seules ces valeurs (et 'none') désignent une réduction.
const REDUCERS = {
  SUM: sum,
  AVG: mean,
  MEDIAN: median,
  MIN: min,
  MAX: max,
  COUNT: (vals) => vals.length,
  MODE: mostFrequent,
};

/**
 * Reduces the values of one group (bar, stack segment, heatmap cell) to a single value.
 *
 * @param {number[]} vals - Numeric values of the group, NaN already removed.
 * @param {string} [mode='AVG'] - `'none'` when the rows are already aggregated (one row
 *   per group: the single value is returned, never combined), or a value of the API
 *   `Aggregation` enum (`SUM`, `AVG`, `MEDIAN`, `MIN`, `MAX`, `COUNT`, `MODE`). Anything
 *   else falls back to the mean.
 * @returns {number|undefined} The reduced value; `undefined` for an empty group (except
 *   COUNT, which gives 0).
 */
export const reduceValues = (vals, mode = 'AVG') => {
  // Données déjà agrégées : une seule valeur par groupe. On ne combine JAMAIS — si un
  // groupe en portait plusieurs, ce serait une erreur de plan (colonne de groupe oubliée
  // dans le hue), et la moyenner la masquerait.
  if (mode === 'none') return vals[0];
  return (REDUCERS[mode] ?? mean)(vals);
};

/**
 * Picks the client-side aggregation of a value column from its metadata.
 *
 * @param {?Array<Object>} fields - Column metadata (`fields` of DatasetWithMetadata).
 * @param {?string} column - Value column (y, x for horizontal bars, z for a heatmap).
 * @returns {string} The column's `defaultAggregation`, or `'AVG'` — the historical mean —
 *   when the column is not described or declares none.
 */
export const clientAggregation = (fields, column) => fieldOf(fields, column)?.defaultAggregation ?? 'AVG';

/**
 * Tells whether an aggregation adds up across groups, so that projecting a grid of
 * aggregated cells onto one axis must sum them rather than average them.
 *
 * @param {?string} aggregation - `Aggregation` value.
 * @returns {boolean} True for SUM and COUNT.
 */
export const isAdditive = (aggregation) => aggregation === 'SUM' || aggregation === 'COUNT';
