// =================================================================
// MEASURE TEXT — mesure de texte et densité des graduations
// =================================================================
// measureText a été promu dans src/utils/text/measureText.js (second
// consommateur : la légende de taille, partagée avec le globe). Il est réexporté
// ici pour que les axes du chart, et les tests qui moquent ce module, restent
// inchangés. tickCountFor, propre aux axes, reste dans la feature.

// Importation des modules
import { measureText } from '@/utils/text/measureText';

export { measureText };

/**
 * Decides the tick count for an axis given a density preset and the pixels
 * available along that axis.
 *
 * @param {number} pixels - Available pixel length along the axis.
 * @param {'sparse'|'normal'|'dense'} [density='normal'] - Density preset.
 * @returns {number} Tick count (minimum 2).
 */
export function tickCountFor(pixels, density = 'normal') {
  const per = { sparse: 110, normal: 70, dense: 45 }[density] || 70;
  return Math.max(2, Math.round(pixels / per));
}
