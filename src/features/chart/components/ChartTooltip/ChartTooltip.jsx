// =================================================================
// CHART TOOLTIP — bulle de survol (glyphe de série + sections hue / valeurs)
// =================================================================
// La bulle s'ancre du côté OPPOSÉ au point
// (flip adaptatif) pour rester lisible quelle que soit la zone du graphe.

// Importation des modules
import { markerPath } from '../../utils/encoding';
import './ChartTooltip.scss';

// Lignes de hachure pour le glyphe d'une tuile (barchart / violon / heatmap).
// Géométrie SVG (coordonnées d'un motif 16×12) — reste en JSX comme les tracés
// d'icônes ; seules la couleur/opacité proviennent des données.
function tipHatchLines(type, color) {
  if (!type) return null;
  const lines = [];
  const add = (x1, y1, x2, y2) => lines.push(
    <line key={lines.length} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" strokeOpacity="0.9" />,
  );
  if (type === 'diag') for (let o = -16; o <= 16; o += 4) add(o, 12, o + 12, 0);
  else if (type === 'diag-rev') for (let o = -16; o <= 16; o += 4) add(o, 0, o + 12, 12);
  else if (type === 'cross') { for (let o = -16; o <= 16; o += 5) { add(o, 12, o + 12, 0); add(o, 0, o + 12, 12); } }
  else if (type === 'horizontal') for (let yy = 2; yy <= 10; yy += 3) add(0, yy, 16, yy);
  else if (type === 'vertical') for (let xx = 2; xx <= 14; xx += 3) add(xx, 0, xx, 12);
  else if (type === 'grid') { for (let yy = 2; yy <= 10; yy += 3) add(0, yy, 16, yy); for (let xx = 2; xx <= 14; xx += 3) add(xx, 0, xx, 12); }
  return lines;
}

/**
 * Glyph mirroring the hovered series' appearance: a dashed line segment with an
 * optional marker (line/density), a lone marker, or a solid/hatched tile (bar,
 * violin, heatmap).
 *
 * @param {object} props
 * @param {string} props.kind - Detected chart kind.
 * @param {string} props.color - Series color.
 * @param {?string} [props.dash] - Dash-array (style channel).
 * @param {?string} [props.hatch] - Hatch type (style channel, tiles).
 * @param {?string} [props.marker] - Marker type (marker channel).
 * @returns {JSX.Element}
 */
function TooltipGlyph({ kind, color, dash, hatch, marker }) {
  if (kind === 'line' || kind === 'density') {
    return (
      <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true">
        <line x1="1" y1="7" x2="25" y2="7" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeDasharray={dash || undefined} />
        {marker && <path transform="translate(13,7)" d={markerPath(marker, 58)} fill={color} stroke="white" strokeWidth="0.9" />}
      </svg>
    );
  }
  if (marker) {
    return <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true"><path d={markerPath(marker, 64)} fill={color} stroke="white" strokeWidth="0.8" /></svg>;
  }
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
      <rect x="0.5" y="0.5" width="15" height="11" rx="2" fill={color} fillOpacity={hatch ? 0.45 : 0.92} stroke={color} strokeOpacity="0.6" strokeWidth="0.75" />
      {tipHatchLines(hatch, color)}
    </svg>
  );
}

/**
 * Hover tooltip bubble. Title = measured variable (Y in 2D, Z in 3D), an
 * appearance glyph, an optional hue section, then the x/value rows. Anchors on
 * the side opposite the point (`position.flipX/flipY`) so it never covers the
 * cursor or the mark.
 *
 * @param {object} props
 * @param {?{title: string, glyphSpec: ?object, hueRows: Array<{label:string,value:*}>,
 *   valueRows: Array<{label:string,value:*}>}} props.model - Tooltip content model.
 * @param {?{x:number, y:number, flipX:boolean, flipY:boolean}} props.position - Anchor.
 * @returns {?JSX.Element}
 */
const ChartTooltip = ({ model, position }) => {
  if (!model || !position) return null;
  const { title, glyphSpec, hueRows, valueRows } = model;
  const tx = position.flipX ? '-100%' : '0';
  const ty = position.flipY ? '-100%' : '0';

  return (
    <div className="chart-tooltip" style={{ left: position.x, top: position.y, transform: `translate(${tx}, ${ty})` }}>
      <header className="chart-tooltip-header">
        {glyphSpec && <span className="chart-tooltip-glyph"><TooltipGlyph {...glyphSpec} /></span>}
        <span className="chart-tooltip-title">{title}</span>
      </header>
      <dl className="chart-tooltip-body">
        {hueRows && hueRows.map((h, i) => (
          <div
            className={`chart-tooltip-row chart-tooltip-row--hue${i === hueRows.length - 1 ? ' chart-tooltip-row--hue-last' : ''}`}
            key={`hue-${i}`}>
            <dt className="chart-tooltip-label">{h.label}</dt>
            <dd className="chart-tooltip-value">{String(h.value)}</dd>
          </div>
        ))}
        {(valueRows || []).map((r, i) => (
          <div className="chart-tooltip-row" key={i}>
            <dt className="chart-tooltip-label">{r.label}</dt>
            <dd className="chart-tooltip-value">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default ChartTooltip;
