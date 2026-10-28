// =================================================================
// SIZE LEGEND VALUES — valeurs de référence de la légende de taille
// =================================================================
// Promu depuis src/features/chart/utils/bubble.js (bubbleLegendValues) avec la
// légende de taille, partagée par les bulles du chart et les points du globe.

// Arrondi « vers le bas » à un chiffre significatif : la valeur de référence reste ≤ max
// et proche de lui (4,9 → 4 ; 830 → 800).
const niceDown = (v) => {
  const p = 10 ** Math.floor(Math.log10(v));
  return Number((Math.floor(v / p) * p).toPrecision(12));
};

/**
 * Three rounded reference values for the size legend: about max, max / 4 and
 * max / 16 (each circle twice the radius of the next one).
 *
 * @param {number} max - Largest positive value (drawn with the largest radius).
 * @returns {Array<number>} Distinct positive values, largest first (empty if max ≤ 0).
 */
export const sizeLegendValues = (max) => {
  if (!(max > 0)) return [];
  return [...new Set([max, max / 4, max / 16].map(niceDown))].filter((v) => v > 0);
};
