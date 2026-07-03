// =================================================================
// KDE — estimation de densité par noyau
// =================================================================
// Deux estimateurs de densité, sans équivalent visx, conservés en dépendances
// d3 directes (calculs purs, aucun rendu) :
//   • epanechnikovKDE : KDE 1D (noyau d'Epanechnikov) pour les VIOLONS ;
//   • densityContourGenerator : wrapper de `d3-contour` contourDensity pour la
//     DENSITÉ 2D.
// Les valeurs par défaut (48 échantillons, bande passante 8 % de l'étendue,
// 9 seuils) sont reprises À L'IDENTIQUE du prototype (design-system/project/
// scripts/charts/marks.jsx) — l'apparence rendue doit rester strictement
// identique.

// Importation des modules
import { contourDensity } from 'd3-contour';

/**
 * Builds a 1D Epanechnikov kernel-density estimator over a fixed sample grid.
 *
 * The grid and bandwidth are derived once from the value domain (never from the
 * observations), so the density is stable under zoom: zooming only repositions
 * points via the zoomed value scale, it never recomputes the KDE on the
 * sub-domain — the caller passes the BASE (unzoomed) domain here.
 *
 * @param {[number, number]} domain - Value extent [lo, hi] (BASE scale domain).
 * @param {object} [options]
 * @param {number} [options.sampleCount=48] - Number of evenly-spaced samples on the domain.
 * @param {number} [options.bandwidthFactor=0.08] - Bandwidth as a fraction of the domain span.
 * @returns {{samples: Array<number>, bandwidth: number, range: number,
 *   estimate: (values: Array<number>) => Array<{t: number, d: number}>}}
 *   The sample abscissas, the bandwidth, the domain span, and an estimator
 *   turning a value list into a density curve (empty for a degenerate domain
 *   or fewer than two values).
 */
export function epanechnikovKDE(domain, { sampleCount = 48, bandwidthFactor = 0.08 } = {}) {
  const [lo, hi] = domain;
  const vLo = +lo;
  const vHi = +hi;
  const range = vHi - vLo;
  const bandwidth = range * bandwidthFactor;

  // Grille d'échantillonnage régulière sur le domaine (vide si domaine dégénéré).
  const samples = range > 0
    ? Array.from({ length: sampleCount }, (_, i) => vLo + (i / (sampleCount - 1)) * range)
    : [];

  const estimate = (values) => {
    if (!(range > 0) || !values || values.length < 2) return [];
    return samples.map((t) => {
      // Noyau d'Epanechnikov : 0.75·(1 − u²) pour |u| ≤ 1, nul au-delà.
      let s = 0;
      for (let i = 0; i < values.length; i++) {
        const u = (t - values[i]) / bandwidth;
        if (Math.abs(u) <= 1) s += 0.75 * (1 - u * u);
      }
      return { t, d: s / (values.length * bandwidth) };
    });
  };

  return { samples, bandwidth, range, estimate };
}

/**
 * Builds a configured `d3-contour` density-contour generator (no visx
 * equivalent), matching the prototype's parameters.
 *
 * @param {object} params
 * @param {(d: object) => number} params.x - x accessor (pixels).
 * @param {(d: object) => number} params.y - y accessor (pixels).
 * @param {(d: object) => number} params.weight - Per-point weight accessor.
 * @param {[number, number]} params.size - Estimation grid size [width, height] (pixels).
 * @param {number} params.bandwidth - Gaussian kernel bandwidth (pixels).
 * @param {number} [params.thresholds=9] - Number of contour thresholds.
 * @returns {Function} A contour-density generator; call it with the rows array.
 */
export function densityContourGenerator({ x, y, weight, size, bandwidth, thresholds = 9 }) {
  return contourDensity()
    .x(x)
    .y(y)
    .weight(weight)
    .size(size)
    .bandwidth(bandwidth)
    .thresholds(thresholds);
}
