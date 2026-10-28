// Importation des modules
import { markerPath } from '@/utils/encoding/markers';

/**
 * Builds the innerHTML of a badge marker: an optional pulse halo behind the dot,
 * and the dot itself with an optional icon.
 *
 * Neither the diameter, the colour nor the mark is handled here: the engine sets
 * the `--d` and `--c` custom properties and the `globe-marker--badge` /
 * `globe-marker--bubble` class on the marker element itself, and both children
 * inherit them. Going through the CSSOM rather than interpolating a `style="…"`
 * attribute makes attribute escaping structurally impossible to get wrong.
 *
 * @param {{icon: ?string, pulse: boolean}} spec - Resolved marker spec: `icon` is
 *   an inline SVG string (or null), TRUSTED HTML injected as-is, never escaped (the
 *   host owns whatever its `points.icon` accessor returns); `pulse` adds the
 *   animated halo.
 * @returns {string} HTML string consumed by the engine overlay.
 */
export const markerHtml = ({ icon, pulse }) =>
  // Deux calques : le halo pulsé derrière (s'il est demandé), la pastille pleine
  // devant ; tous deux teintés par la custom property --c héritée du marqueur
  // parent, pour rester pilotables en CSS.
  (pulse ? `<span class="globe-marker-pulse"></span>` : '') +
  `<span class="globe-marker-dot">${icon || ''}</span>`;

// Motifs de hachure des bulles pleines : MÊMES types que les marks du chart
// (HATCH_TYPES, src/utils/encoding/scales.js) et mêmes tuiles (6 px, 7 px pour la
// croix, cf. HatchPatterns.jsx). Chaque motif est une tuile à une ou deux lignes
// médianes (verticale `v`, horizontale `h`), tournée par patternTransform : une
// verticale tournée de 45° (sens horaire, axe y vers le bas) dessine « / ».
const HATCH = {
  vertical: { tile: 6, rotate: 0, lines: 'v' },
  horizontal: { tile: 6, rotate: 0, lines: 'h' },
  diag: { tile: 6, rotate: 45, lines: 'v' },
  'diag-rev': { tile: 6, rotate: -45, lines: 'v' },
  grid: { tile: 6, rotate: 0, lines: 'vh' },
  cross: { tile: 7, rotate: 45, lines: 'vh' },
};

// Dash-array SVG : nombres et séparateurs seulement. Les valeurs viennent de
// LINE_STYLES, constantes du repo ; le filtre garantit qu'aucune autre chaîne
// n'atteindra jamais l'attribut.
const DASH_RE = /^[\d.\s,]+$/;

/**
 * Builds the `<pattern>` of a hatch type, or an empty string for no / an unknown
 * hatch.
 *
 * @param {string} id - Document-unique pattern id (engine instance + point index).
 * @param {?string} type - Hatch type (HATCH_TYPES).
 * @returns {string} SVG markup.
 */
const hatchPattern = (id, type) => {
  const h = HATCH[type];
  if (!h) return '';
  const m = h.tile / 2;
  const d = (h.lines.includes('v') ? `M${m} 0V${h.tile}` : '') + (h.lines.includes('h') ? `M0 ${m}H${h.tile}` : '');
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${h.tile}" height="${h.tile}" patternTransform="rotate(${h.rotate})">` +
    `<path class="globe-marker-hatch" d="${d}"/></pattern>`;
};

/**
 * Builds the innerHTML of a bubble marker: an optional pulse halo, then an inline
 * SVG drawing the marker shape at the bubble's AREA, filled (optionally hatched) or
 * outlined (optionally dashed) — the grammar of the bubbles of `<Chart>`.
 *
 * Every interpolated value is a constant of the repo's scales (shape, hatch type,
 * dash-array) or a computed number (path, sizes, engine-generated id): no data
 * reaches this markup. The colour comes from the inherited `--c` property.
 *
 * @param {object} spec - Resolved bubble spec.
 * @param {string} spec.marker - Marker shape (MARKER_TYPES; unknown = disc).
 * @param {number} spec.diameter - Diameter of the equivalent disc, in px.
 * @param {boolean} spec.line - Outlined body (`fill: 'line'`) instead of filled.
 * @param {?string} spec.hatch - Hatch type of a filled body, or null.
 * @param {?string} spec.dash - SVG dash-array of an outlined body, or null.
 * @param {string} spec.patternId - Document-unique id of the hatch pattern.
 * @param {boolean} spec.pulse - Adds the animated halo.
 * @returns {string} HTML string consumed by the engine overlay.
 */
export const bubbleHtml = ({ marker, diameter, line, hatch, dash, patternId, pulse }) => {
  const size = Math.max(diameter, 1);
  // Forme d'AIRE égale à celle du disque de ce diamètre : un carré ou une étoile
  // pèse visuellement autant qu'un cercle de même valeur, comme dans <BubbleMarks>.
  const path = markerPath(marker, Math.PI * (size / 2) ** 2);
  const pattern = !line ? hatchPattern(patternId, hatch) : '';
  const dashAttr = line && typeof dash === 'string' && DASH_RE.test(dash) ? ` stroke-dasharray="${dash}"` : '';
  const body = `globe-marker-bubble-body globe-marker-bubble-body--${line ? 'line' : 'fill'}${pattern ? ' globe-marker-bubble-body--hatched' : ''}`;
  const half = (size / 2).toFixed(2);
  return (pulse ? `<span class="globe-marker-pulse"></span>` : '') +
    // viewBox centré sur la forme ; `overflow: visible` (GlobeMarkers.scss) laisse
    // dépasser les pointes d'une étoile ou d'un triangle, plus étendus qu'un disque.
    `<svg class="globe-marker-bubble" viewBox="-${half} -${half} ${size.toFixed(2)} ${size.toFixed(2)}" aria-hidden="true">` +
    (pattern ? `<defs>${pattern}</defs>` : '') +
    `<path class="${body}" d="${path}"${dashAttr}/>` +
    (pattern ? `<path class="globe-marker-bubble-hatch" d="${path}" fill="url(#${patternId})"/>` : '') +
    `</svg>`;
};
