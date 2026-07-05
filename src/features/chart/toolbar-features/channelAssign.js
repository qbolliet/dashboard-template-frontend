// =================================================================
// CHANNEL ASSIGN — attribution du canal visuel libre aux features « encoder »
// =================================================================
// Une feature « encoder » (intervalle de confiance, projection avant/après)
// contribue des séries supplémentaires encodées comme un « hue de profondeur
// +1 » : le canal visuel LIBRE suivant les encode. Règle métier :
//   • la COULEUR n'est jamais réutilisée par une feature (porterait à confusion) ;
//   • on prend donc le 1er canal libre parmi [style, marker] après les canaux
//     déjà consommés par les hue de la série principale ET par les autres
//     features encoder (`usedExtra`). Porté du prototype (features.jsx).

// Importation des modules
import {
  LINE_STYLES, HATCH_TYPES, MARKER_TYPES,
} from '../utils/encoding';

/**
 * Picks the next free visual channel for an "encoder" feature, never the color
 * channel: 'style' then 'marker', skipping those already taken by the main
 * series' hues or by other encoder features.
 *
 * @param {{color: ?string, style: ?string, marker: ?string}} channels - Main series channels.
 * @param {Array<'style'|'marker'>} usedExtra - Channels already taken by other encoder features.
 * @returns {'style'|'marker'} The assigned channel.
 */
export function nextFreeChannel(channels, usedExtra) {
  const taken = new Set(usedExtra);
  if (channels.style) taken.add('style');
  if (channels.marker) taken.add('marker');
  for (const ch of ['style', 'marker']) {
    if (!taken.has(ch)) return ch;
  }
  return 'marker'; // dégradé : canaux épuisés (hue 2 + 2 features) → réutilise marker
}

// Échelles de variantes pour un canal, en SAUTANT l'index 0 (solide / cercle /
// pas-de-hachure), réservé à la série centrale d'origine.

/**
 * Dash-array variant for the i-th extra series (skips the solid index 0).
 * @param {number} i - Variant index.
 * @returns {?string} Dash-array.
 */
export function variantStyle(i) { return LINE_STYLES[(i % (LINE_STYLES.length - 1)) + 1]; }

/**
 * Hatch-type variant for the i-th extra series (skips the no-hatch index 0).
 * @param {number} i - Variant index.
 * @returns {?string} Hatch type.
 */
export function variantHatch(i) { return HATCH_TYPES[(i % (HATCH_TYPES.length - 1)) + 1]; }

/**
 * Marker variant for the i-th extra series (skips the circle index 0).
 * @param {number} i - Variant index.
 * @returns {string} Marker type.
 */
export function variantMarker(i) { return MARKER_TYPES[(i % (MARKER_TYPES.length - 1)) + 1]; }

/**
 * Resolves the visual attributes of the i-th extra series on the given channel.
 *
 * @param {'style'|'marker'} channel - Assigned channel.
 * @param {number} i - Variant index.
 * @param {'fill'|'bars'|'line'|'none'} fillMode - Fill mode (hatch for fill/bars, dash otherwise).
 * @returns {{marker?: string, hatch?: ?string, dash?: ?string}} Visual attributes.
 */
export function variantVisual(channel, i, fillMode) {
  if (channel === 'marker') return { marker: variantMarker(i) };
  return (fillMode === 'fill' || fillMode === 'bars')
    ? { hatch: variantHatch(i) }
    : { dash: variantStyle(i) };
}

// Marqueurs binaires « vraie série / projection » : un disque (vraie série) et
// une croix (projection). Canal de distinction quand hue=2 (marqueur unique) et
// SECOND marqueur concentrique au marqueur de hue quand hue=3.
export const REAL_DIST_MARKER = 'circle';
export const PROJ_DIST_MARKER = 'cross';
