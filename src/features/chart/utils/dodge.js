// =================================================================
// DODGE — répartition des séries côte à côte dans une bande catégorielle
// =================================================================
// Quand le canal couleur est actif, les violons et les bulles d'une même bande ne se
// superposent pas : chaque série reçoit un « slot » de la bande. La géométrie est
// partagée entre les marques et le calcul des cibles de survol de <Chart>, qui doivent
// tomber exactement au même endroit.

// Importation des modules
import { scaleBand } from '@visx/scale';

/**
 * Builds the sub-band scale that dodges series inside one band.
 *
 * @param {Array<string>} seriesKeys - Series keys, in drawing order.
 * @param {number} bandwidth - Width of the parent band (px).
 * @returns {object} A visx band scale over `seriesKeys`, ranging over [0, bandwidth].
 */
export const dodgeScale = (seriesKeys, bandwidth) => scaleBand({
  domain: seriesKeys,
  range: [0, bandwidth],
  // Padding plus lâche pour une série seule : la marque ne touche pas les bords
  padding: seriesKeys.length > 1 ? 0.12 : 0.25,
});

/**
 * Position of one series' slot inside a band.
 *
 * @param {object} params
 * @param {number} params.bandStart - Start of the band (px).
 * @param {number} params.bandwidth - Width of the band (px).
 * @param {?object} params.subScale - Output of `dodgeScale`, or null when not dodging.
 * @param {string} params.key - Series key.
 * @returns {{center: number, slotStart: number, slotW: number}} Center and extent of the
 *   slot — the whole band when `subScale` is null.
 */
export const dodgeSlot = ({ bandStart, bandwidth, subScale, key }) => {
  if (!subScale) return { center: bandStart + bandwidth / 2, slotStart: bandStart, slotW: bandwidth };
  const slotW = subScale.bandwidth();
  const slotStart = bandStart + (subScale(key) ?? 0);
  return { center: slotStart + slotW / 2, slotStart, slotW };
};
