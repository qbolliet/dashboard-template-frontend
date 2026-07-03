// Importation des modules
import {
  GlyphCircle, GlyphSquare, GlyphTriangle, GlyphDiamond,
  GlyphStar, GlyphCross, GlyphWye,
} from '@visx/glyph';

// Correspondance type → glyphe @visx/glyph (mêmes symboles d3 que markerScale de
// utils/encoding.js). Le range de markerScale n'utilise que 5 formes, mais on
// expose le jeu complet (circle/square/triangle/diamond/star/cross/wye).
const GLYPHS = {
  circle: GlyphCircle,
  square: GlyphSquare,
  triangle: GlyphTriangle,
  diamond: GlyphDiamond,
  star: GlyphStar,
  cross: GlyphCross,
  wye: GlyphWye,
};

/**
 * Series marker glyph centered on (x, y), rendered with `@visx/glyph`.
 *
 * Solid variant fills with the series color and outlines with the surface color;
 * the `hollow` variant swaps them (surface fill, series-color outline) — used to
 * encode a secondary channel on scatter points, and for the concentric
 * real-vs-projection markers. Marker area follows the d3-symbol convention
 * (default 64 px²).
 *
 * @param {object} props
 * @param {string} props.type - Marker type (key of GLYPHS; falls back to circle).
 * @param {number} [props.x=0] - Center x (px).
 * @param {number} [props.y=0] - Center y (px).
 * @param {number} [props.size=64] - Marker area in px² (d3-symbol size).
 * @param {string} props.fill - Series color.
 * @param {string} [props.stroke='white'] - Surface color (outline in solid, fill in hollow).
 * @param {boolean} [props.hollow=false] - Hollow variant: fill surface, stroke series color.
 * @param {number} [props.strokeWidth] - Outline width (defaults: 1.3 hollow, 0.8 solid).
 * @param {?string} [props.dash] - Outline dash-array (hollow scatter style channel).
 * @returns {JSX.Element}
 */
const SeriesMarker = ({
  type, x = 0, y = 0, size = 64,
  fill, stroke = 'white', hollow = false, strokeWidth, dash,
}) => {
  const Glyph = GLYPHS[type] || GlyphCircle;
  // Variante creuse : intérieur = surface, contour = couleur de série.
  const resolvedFill = hollow ? stroke : fill;
  const resolvedStroke = hollow ? fill : stroke;
  const sw = strokeWidth != null ? strokeWidth : (hollow ? 1.3 : 0.8);

  return (
    <Glyph
      left={x}
      top={y}
      size={size}
      fill={resolvedFill}
      stroke={resolvedStroke}
      strokeWidth={sw}
      strokeDasharray={dash || undefined}
    />
  );
};

export default SeriesMarker;
