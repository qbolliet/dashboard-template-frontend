// =================================================================
// HOVER OVERLAYS — couches de captation du survol + marque active
// =================================================================
//   • VoronoiOverlay     survol par PROXIMITÉ (mark le plus proche du curseur),
//                        via un diagramme de Voronoï sur des cibles déjà
//                        projetées en pixels — @visx/voronoi remplace le
//                        Delaunay.voronoi de d3 du prototype (PointHoverOverlay).
//   • DirectHoverOverlay survol DIRECT (mark réellement sous le curseur), zone
//                        de captation épousant la géométrie du mark (rect/disque).
//   • ActiveMark         glyphe surligné posé sur le mark actif.

// Importation des modules
import { voronoi, VoronoiPolygon } from '@visx/voronoi';
import { markerPath } from '../../../utils/encoding';

/**
 * Proximity-hover layer: builds a Voronoi diagram over pre-projected pixel
 * targets and reports the nearest one to the cursor. Works for every chart kind
 * because the centroids are computed upstream, per renderer.
 *
 * @param {object} props
 * @param {Array<{px:number, py:number, row:object}>} props.points - Pre-projected targets.
 * @param {number} props.innerWidth - Plot width (px).
 * @param {number} props.innerHeight - Plot height (px).
 * @param {function(?object): void} props.onHover - Called with the hovered target
 *   (the `{px, py, row}` object) on enter, null on leave.
 * @returns {?JSX.Element}
 */
export const VoronoiOverlay = ({ points, innerWidth, innerHeight, onHover }) => {
  const pts = (points || []).filter((p) => !isNaN(p.px) && !isNaN(p.py));
  if (pts.length === 0) return null;
  const layout = voronoi({
    x: (p) => p.px,
    y: (p) => p.py,
    width: Math.max(1, innerWidth),
    height: Math.max(1, innerHeight),
  })(pts);

  return (
    <g className="chart-voronoi">
      {layout.polygons().map((polygon, i) => (
        <VoronoiPolygon
          key={i}
          polygon={polygon}
          fill="transparent"
          stroke="none"
          pointerEvents="all"
          onMouseEnter={() => onHover(polygon.data)}
          onMouseLeave={() => onHover(null)}
        />
      ))}
    </g>
  );
};

/**
 * Direct-hover layer: one transparent capture zone per mark, shaped like the
 * mark itself (rectangle for bars/cells/violin bands, disc for points/scatter).
 * The tooltip only shows for the mark actually under the cursor.
 *
 * @param {object} props
 * @param {Array<{px?:number, py?:number, row:object,
 *   hit:{type:'rect'|'circle', x?:number, y?:number, w?:number, h?:number, r?:number}}>} props.targets
 *   Hover targets with their hit geometry.
 * @param {function(?object): void} props.onHover - Called with the target on enter, null on leave.
 * @returns {JSX.Element}
 */
export const DirectHoverOverlay = ({ targets, onHover }) => (
  <g className="chart-hover-direct">
    {(targets || []).map((t, i) => {
      const handlers = {
        fill: 'transparent',
        stroke: 'none',
        pointerEvents: 'all',
        onMouseEnter: () => onHover(t),
        onMouseLeave: () => onHover(null),
      };
      if (t.hit && t.hit.type === 'rect') {
        return (
          <rect
            key={i}
            x={Math.min(t.hit.x, t.hit.x + t.hit.w)}
            y={Math.min(t.hit.y, t.hit.y + t.hit.h)}
            width={Math.abs(t.hit.w)}
            height={Math.abs(t.hit.h)}
            {...handlers}
          />
        );
      }
      if (isNaN(t.px) || isNaN(t.py)) return null;
      const r = (t.hit && t.hit.r) || 12;
      return <circle key={i} cx={t.px} cy={t.py} r={r} {...handlers} />;
    })}
  </g>
);

/**
 * Highlighted marker drawn over the active mark, at a pre-computed pixel
 * position. Size 96 (d3-symbol area), filled with the series color and outlined
 * in white.
 *
 * @param {object} props
 * @param {?{x:number, y:number}} props.pos - Pixel centroid (inner coords), or null.
 * @param {string} props.color - Series color.
 * @param {string} [props.marker='circle'] - Marker type.
 * @returns {?JSX.Element}
 */
export const ActiveMark = ({ pos, color, marker = 'circle' }) => {
  if (!pos || isNaN(pos.x) || isNaN(pos.y)) return null;
  return (
    <g className="chart-active-mark" transform={`translate(${pos.x}, ${pos.y})`}>
      <path d={markerPath(marker, 96)} fill={color} stroke="white" strokeWidth={2} />
    </g>
  );
};
