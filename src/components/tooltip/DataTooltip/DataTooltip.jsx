// =================================================================
// DATA TOOLTIP — bulle de survol (glyphe de série + sections hue / valeurs)
// =================================================================
// Promue depuis src/features/chart/components/ChartTooltip/ (second consommateur :
// le globe). Deux modes de placement :
//   • ANCRÉ (`position` fourni, chart) — la bulle s'ancre du côté OPPOSÉ au point
//     (flip adaptatif) pour rester lisible quelle que soit la zone du graphe ;
//   • HÉBERGÉ (`position` absent, globe) — la bulle ne pose aucune coordonnée et
//     suit son parent, qu'un code impératif déplace (le moteur du globe réécrit le
//     `transform` de l'hôte à chaque frame, sans rendu React).
// Le contenu est un MODÈLE de données rendu en JSX : aucun HTML brut, donc aucune
// frontière de confiance à gérer côté hôte.

// Importation des modules
import { markerPath } from '@/utils/encoding/markers';
import './DataTooltip.scss';

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
 * @param {string} props.kind - Mark kind ('line', 'density', 'bar', 'bubble'…).
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
 * Hover tooltip bubble shared by `<Chart>`, `<MultiChart>` and `<Globe>`. Title =
 * measured variable or hovered item, an optional subtitle, an appearance glyph, an
 * optional hue section, then the value rows.
 *
 * With `position`, the bubble anchors on the side opposite the point
 * (`position.flipX/flipY`) so it never covers the cursor or the mark. Without it,
 * the bubble sets no coordinate and follows its parent, which the host positions.
 *
 * @param {object} props
 * @param {?{title: string, subtitle?: ?string, glyphSpec: ?object,
 *   hueRows: Array<{label:string,value:*}>, valueRows: Array<{label:string,value:*}>}} props.model
 *   Tooltip content model.
 * @param {?{x:number, y:number, flipX:boolean, flipY:boolean}} [props.position] - Anchor;
 *   omitted when the host positions the bubble itself.
 * @returns {?JSX.Element}
 */
const DataTooltip = ({ model, position }) => {
  if (!model) return null;
  const { title, subtitle, glyphSpec, hueRows = [], valueRows = [] } = model;
  // Mode ancré : coordonnées et flip en style inline. Mode hébergé : rien, la bulle
  // se place dans le flux de son parent (cf. .data-tooltip--hosted).
  const style = position
    ? {
        left: position.x,
        top: position.y,
        transform: `translate(${position.flipX ? '-100%' : '0'}, ${position.flipY ? '-100%' : '0'})`,
      }
    : undefined;
  const hasRows = hueRows.length > 0 || valueRows.length > 0;

  return (
    <div className={`data-tooltip${position ? '' : ' data-tooltip--hosted'}`} style={style}>
      <header className={`data-tooltip-header${hasRows ? '' : ' data-tooltip-header--alone'}`}>
        {glyphSpec && <span className="data-tooltip-glyph"><TooltipGlyph {...glyphSpec} /></span>}
        <span className="data-tooltip-heading">
          <span className="data-tooltip-title">{title}</span>
          {subtitle != null && subtitle !== '' && <span className="data-tooltip-subtitle">{subtitle}</span>}
        </span>
      </header>
      {hasRows && (
        <dl className="data-tooltip-body">
          {hueRows.map((h, i) => (
            <div
              // Séparateur sous le dernier rang hue, seulement s'il reste des valeurs à séparer.
              className={`data-tooltip-row data-tooltip-row--hue${i === hueRows.length - 1 && valueRows.length > 0 ? ' data-tooltip-row--hue-last' : ''}`}
              key={`hue-${i}`}>
              <dt className="data-tooltip-label">{h.label}</dt>
              <dd className="data-tooltip-value">{String(h.value)}</dd>
            </div>
          ))}
          {valueRows.map((r, i) => (
            <div className="data-tooltip-row" key={i}>
              <dt className="data-tooltip-label">{r.label}</dt>
              <dd className="data-tooltip-value">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

export default DataTooltip;
