// =================================================================
// MARKERS — formes de marqueurs d3-symbol
// =================================================================
// Promu depuis src/features/chart/utils/encoding.js avec la légende par canaux
// (src/components/legend/) : son glyphe de canal « marqueur » dessine ces formes,
// et la légende sert désormais aussi au globe. L'échelle ordinale des marqueurs
// (markerScale, MARKER_TYPES) reste dans le chart, seul à encoder ce canal.

// Importation des modules
import { symbol, symbolCircle, symbolSquare, symbolTriangle, symbolDiamond, symbolCross, symbolStar, symbolWye } from 'd3-shape';

export const D3_SYMBOL = {
  circle: symbolCircle,
  square: symbolSquare,
  triangle: symbolTriangle,
  diamond: symbolDiamond,
  cross: symbolCross,
  star: symbolStar,
  wye: symbolWye,
};

/**
 * Builds the SVG path of a marker centered on (0, 0).
 *
 * @param {string} type - Marker type (key of D3_SYMBOL).
 * @param {number} [size=64] - Marker area in px².
 * @returns {string} SVG path `d` attribute.
 */
export function markerPath(type, size = 64) {
  const sym = D3_SYMBOL[type] || symbolCircle;
  return symbol().type(sym).size(size)();
}
