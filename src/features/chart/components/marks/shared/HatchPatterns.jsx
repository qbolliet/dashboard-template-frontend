// Importation des modules
import { Fragment } from 'react';
import { PatternLines } from '@visx/pattern';
import { color as d3color } from 'd3-color';

// Taille de tuile (px) par type de hachure — reprises À L'IDENTIQUE du prototype
// (design-system/project/scripts/charts/marks.jsx, HatchPattern) : 6px pour les
// lignes simples et la grille, 7px pour la croix.
const TILE = { diag: 6, 'diag-rev': 6, horizontal: 6, vertical: 6, grid: 6, cross: 7 };

// Décomposition d'un type de hachure en orientations @visx/pattern (PatternLines).
// Un type SIMPLE (diag/diag-rev/horizontal/vertical) → une seule orientation, donc
// un seul pattern. Un type COMPOSITE (cross/grid) → deux orientations rendues en
// DEUX patterns superposés (cf. mapping demandé) :
//   • cross → deux diagonales opposées (« × ») ;
//   • grid  → horizontale + verticale (« # »).
// Correspondance des sens : diag = « / » (visx 'diagonal'), diag-rev = « \ »
// (visx 'diagonalRightToLeft'), identiques aux rotations ±45° du prototype.
const ORIENTATIONS = {
  diag: ['diagonal'],
  'diag-rev': ['diagonalRightToLeft'],
  horizontal: ['horizontal'],
  vertical: ['vertical'],
  cross: ['diagonal', 'diagonalRightToLeft'],
  grid: ['horizontal', 'vertical'],
};

/**
 * Bakes a stroke opacity directly into a color.
 *
 * `@visx/pattern` `PatternLines` does not forward `strokeOpacity` to its lines,
 * so the prototype's per-pattern opacity is folded into the stroke color instead
 * — an alpha-carrying color composites identically to `strokeOpacity` over an
 * opaque background, keeping the rendering strictly identical.
 *
 * @param {string} c - Base color (hsl legacy string or hex).
 * @param {number} [opacity] - Stroke opacity in [0, 1].
 * @returns {string} Color string carrying the opacity (rgba), or the input unchanged.
 */
function withOpacity(c, opacity) {
  if (opacity == null || opacity >= 1) return c;
  const parsed = d3color(c);
  if (!parsed) return c;
  parsed.opacity = opacity;
  return parsed.toString();
}

/**
 * SVG `<defs>` of hatch patterns, one referenceable `<pattern>` per requested
 * combination (hatch type × color × opacity), built with `@visx/pattern`
 * `PatternLines`.
 *
 * Each combo exposes a stable `id`; marks reference it via `url(#id)` — the id
 * scheme is left untouched (identical to the prototype). Composite types
 * (cross/grid) render two superposed `PatternLines` recombined under a single
 * wrapping `<pattern>` so they stay addressable by that same single `url(#id)`.
 *
 * @param {object} props
 * @param {Array<{id: string, type: string, color: string, opacity?: number, strokeWidth?: number}>} props.combos
 *   Requested pattern combinations.
 * @returns {?JSX.Element}
 */
const HatchPatterns = ({ combos }) => {
  if (!combos || combos.length === 0) return null;

  return (
    <>
      {combos.map(({ id, type, color, opacity = 0.6, strokeWidth = 1.5 }) => {
        const oris = ORIENTATIONS[type];
        if (!oris) return null;
        const size = TILE[type] || 6;
        // Opacité repliée dans la couleur (PatternLines ne relaie pas strokeOpacity).
        const stroke = withOpacity(color, opacity);

        // Type simple : un unique PatternLines directement adressable par url(#id).
        if (oris.length === 1) {
          return (
            <PatternLines
              key={id}
              id={id}
              width={size}
              height={size}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              shapeRendering="geometricPrecision"
              orientation={oris}
            />
          );
        }

        // Type composite (cross/grid) : DEUX PatternLines superposés, recombinés
        // dans un <pattern> englobant pour rester adressables par une seule
        // url(#id) — l'empilement de deux <rect> (chacun rempli par l'un des
        // sous-patterns en userSpaceOnUse) reste jointif entre les tuiles.
        return (
          <Fragment key={id}>
            <PatternLines
              id={`${id}__a`}
              width={size}
              height={size}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              shapeRendering="geometricPrecision"
              orientation={[oris[0]]}
            />
            <PatternLines
              id={`${id}__b`}
              width={size}
              height={size}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              shapeRendering="geometricPrecision"
              orientation={[oris[1]]}
            />
            <defs>
              <pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size}>
                <rect width={size} height={size} fill={`url(#${id}__a)`} />
                <rect width={size} height={size} fill={`url(#${id}__b)`} />
              </pattern>
            </defs>
          </Fragment>
        );
      })}
    </>
  );
};

export default HatchPatterns;
