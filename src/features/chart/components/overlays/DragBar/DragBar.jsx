// =================================================================
// DRAG BAR — barre repositionnable le long d'un axe
// =================================================================
// Barre (ligne) déplaçable à la souris. Pendant le drag elle se déplace EN LOCAL
// (état `drag` en pixels, aucun recalcul lourd côté <Chart>) ; au relâchement du
// pointeur elle « commit » la nouvelle valeur de domaine via `onCommit` — c'est
// LÀ, et là seulement, que les recalculs coûteux (normalisation, projection) ont
// lieu. axis='x' → barre verticale glissant horizontalement ; axis='y' → barre
// horizontale glissant verticalement.

// Importation des modules
import { useRef, useState } from 'react';
import './DragBar.scss';

/**
 * Repositionable bar along one axis, with local-only drag and commit-on-release.
 *
 * During the drag the bar tracks the pointer in pixel space (no heavy re-render);
 * on pointer-up it converts the pixel position to a domain value (`invert` for
 * continuous scales, nearest band for categorical) and reports it via `onCommit`.
 *
 * @param {object} props
 * @param {'x'|'y'} props.axis - 'x' → vertical bar (moves horizontally); 'y' → horizontal bar.
 * @param {object} props.scale - visx/d3 scale of the position axis.
 * @param {*} props.value - Current domain value of the bar.
 * @param {boolean} props.draggable - Whether the bar can be dragged.
 * @param {number} props.innerWidth - Plot width (px).
 * @param {number} props.innerHeight - Plot height (px).
 * @param {function(*): void} props.onCommit - Called with the committed domain value on release.
 * @param {string} [props.color='var(--chart-bar)'] - Stroke/label color.
 * @param {string} [props.label] - Optional label drawn at the bar's head.
 * @param {boolean} [props.dashed=true] - Whether to dash the stroke when no explicit dash.
 * @param {string} [props.dash] - Explicit dash-array (overrides `dashed`).
 * @returns {?JSX.Element}
 */
const DragBar = ({
  axis, scale, value, draggable, innerWidth, innerHeight,
  onCommit, color = 'hsl(var(--chart-bar))', label, dashed = true, dash,
}) => {
  const gRef = useRef(null);
  const [drag, setDrag] = useState(null); // px courant pendant le drag (null hors drag)
  const isX = axis === 'x';
  const length = isX ? innerWidth : innerHeight;

  // Position pixel de repos : centre de bande pour les échelles catégorielles.
  const p = scale(value);
  const px = isNaN(p) ? null : (scale.bandwidth ? p + scale.bandwidth() / 2 : p);
  const cur = drag != null ? drag : px;
  if (cur == null) return null;

  // Pixel → valeur de domaine : invert (continu) ; bande la plus proche (catégoriel).
  const pxToValue = (pos) => {
    if (scale.invert) return scale.invert(Math.max(0, Math.min(length, pos)));
    const dom = scale.domain();
    const step = scale.step ? scale.step() : length / dom.length;
    return dom[Math.max(0, Math.min(dom.length - 1, Math.round(pos / step - 0.5)))];
  };

  const onPointerDown = (e) => {
    if (!draggable) return;
    e.stopPropagation();
    const svg = gRef.current.ownerSVGElement;
    const origin = gRef.current.getCTM();
    const move = (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
      // Position locale dans le <g> du tracé : on retire la translation du parent.
      const local = isX ? loc.x - origin.e : loc.y - origin.f;
      setDrag(Math.max(0, Math.min(length, local)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag((d) => {
        if (d != null && onCommit) onCommit(pxToValue(d));
        return null;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const x1 = isX ? cur : 0;
  const x2 = isX ? cur : innerWidth;
  const y1 = isX ? 0 : cur;
  const y2 = isX ? innerHeight : cur;
  const cursor = isX ? 'ew-resize' : 'ns-resize';

  return (
    <g ref={gRef} className={`chart-dragbar${draggable ? ' chart-dragbar--draggable' : ''}`}>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.6}
        strokeDasharray={dash || (dashed ? '5 4' : undefined)}
      />
      {label != null && (
        <g transform={`translate(${isX ? cur : 4}, ${isX ? 11 : cur - 5})`}>
          <text
            className="chart-dragbar-label" textAnchor={isX ? 'middle' : 'start'}
            fontSize="10.5" fontFamily="var(--font-mono)" fill={color}
            style={{ paintOrder: 'stroke', stroke: 'hsl(var(--color-surface))', strokeWidth: 3 }}
          >
            {label}
          </text>
        </g>
      )}
      {draggable && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12}
          style={{ cursor }} onPointerDown={onPointerDown}
        />
      )}
      {draggable && (
        <circle
          cx={isX ? cur : 0} cy={isX ? 0 : cur} r={3.5} fill={color}
          style={{ cursor }} onPointerDown={onPointerDown}
        />
      )}
    </g>
  );
};

export default DragBar;
