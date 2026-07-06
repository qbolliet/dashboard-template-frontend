// =================================================================
// NORMALIZE OVERLAY — barre de normalisation (2D) / réticule (3D)
// =================================================================
// Le RESCALE (règle de trois → 100) est fait côté <Chart> (rôle transform) ; ici
// on ne dessine que la barre repositionnable + la ligne de base à 100 (line/bar),
// ou un réticule déplaçable (x + y + croix) pour les charts à z (heatmap,
// density), dont la valeur z au point sert de référence.

// Importation des modules
import DragBar from '../DragBar/DragBar';
import './NormalizeOverlay.scss';

/**
 * Normalization overlay: a repositionable bar (+ baseline at 100) for 2-D charts,
 * or a draggable x/y reticle for heatmap/density.
 *
 * @param {object} props
 * @param {object} props.ctx - Projection context (scales, inner dims, chartKind, x/y/z).
 * @param {object} props.config - Feature config ({ draggable, color, dash, label }).
 * @param {*} props.value - Current bar value (2-D) or reticle `{ x, y }` (3-D).
 * @param {function(*): void} props.onValue - Commits a new value (drag release).
 * @returns {JSX.Element}
 */
const NormalizeOverlay = ({ ctx, config, value, onValue }) => {
  const { chartKind, xScale, yScale, innerWidth, innerHeight } = ctx;
  const draggable = !!config.draggable;
  // Paramétrage (même grammaire que la projection) : couleur, trait, nom.
  // Défauts = comportement historique (violet, pointillé, « 100 »).
  const color = config.color || 'hsl(var(--chart-bar-normalize))';
  const label = config.label != null ? config.label : '100';
  const dash = config.dash || undefined;

  // Charts à x, y ET z (heatmap, density) : RÉTICULE déplaçable sur un point
  // (x, y). La valeur z à ce point sert de référence (rebase à 100).
  const is3D = chartKind === 'heatmap' || chartKind === 'density';
  if (is3D) {
    const v = value || {};
    const rx = xScale(v.x), ry = yScale(v.y);
    const cx = isNaN(rx) ? innerWidth / 2 : rx + (xScale.bandwidth ? xScale.bandwidth() / 2 : 0);
    const cy = isNaN(ry) ? innerHeight / 2 : ry + (yScale.bandwidth ? yScale.bandwidth() / 2 : 0);
    return (
      <g className="chart-norm-overlay chart-norm-reticle">
        <DragBar
          axis="x" scale={xScale} value={v.x} draggable={draggable}
          innerWidth={innerWidth} innerHeight={innerHeight}
          onCommit={(nx) => onValue({ ...v, x: nx })} color={color} dashed dash={dash}
        />
        <DragBar
          axis="y" scale={yScale} value={v.y} draggable={draggable}
          innerWidth={innerWidth} innerHeight={innerHeight}
          onCommit={(ny) => onValue({ ...v, y: ny })} color={color} dashed dash={dash}
        />
        <g pointerEvents="none">
          <circle cx={cx} cy={cy} r={6.5} fill="none" stroke={color} strokeWidth={1.6} />
          <circle cx={cx} cy={cy} r={1.8} fill={color} />
          <text
            x={cx + 9} y={cy - 8} fontSize="10.5" fontFamily="var(--font-mono)" fill={color}
            style={{ paintOrder: 'stroke', stroke: 'hsl(var(--color-surface))', strokeWidth: 3 }}
          >
            {label}
          </text>
        </g>
      </g>
    );
  }

  const horizontal = chartKind === 'bar-h';
  const posScale = horizontal ? yScale : xScale;
  const valScale = horizontal ? xScale : yScale;
  const axis = horizontal ? 'y' : 'x';

  // Ligne de base à 100 (sur l'axe valeur).
  const hundred = valScale(100);
  const baseLine = (!isNaN(hundred)) ? (horizontal
    ? <line x1={hundred} y1={0} x2={hundred} y2={innerHeight} stroke={color} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="2 3" />
    : <line x1={0} y1={hundred} x2={innerWidth} y2={hundred} stroke={color} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="2 3" />) : null;

  return (
    <g className="chart-norm-overlay">
      {baseLine}
      <DragBar
        axis={axis} scale={posScale} value={value} draggable={draggable}
        innerWidth={innerWidth} innerHeight={innerHeight} onCommit={onValue}
        color={color} dash={dash} label={label}
      />
    </g>
  );
};

export default NormalizeOverlay;
