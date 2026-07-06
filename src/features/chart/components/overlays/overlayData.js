// =================================================================
// OVERLAY DATA — résolution des données d'une feature overlay
// =================================================================
// Partagé par les overlays (CI, avant/après). Les données d'une feature peuvent
// être un tableau OU une fonction (ctx) => tableau — c'est ce qui permet aux
// données de « dépendre de l'abscisse » (barre avant/après) ou d'un appel
// externe : la fonction est ré-évaluée quand le ctx pertinent change.

/**
 * Resolves a feature's `data` config, which may be an array or a `(ctx) => rows`
 * function, into a plain array of rows.
 *
 * @param {Array<object>|function(object): Array<object>} data - Feature data or resolver.
 * @param {object} ctx - Projection context passed to the resolver.
 * @returns {Array<object>} Resolved rows (empty array on error or nullish).
 */
export function resolveData(data, ctx) {
  if (typeof data === 'function') {
    try { return data(ctx) || []; } catch { return []; }
  }
  return data || [];
}
