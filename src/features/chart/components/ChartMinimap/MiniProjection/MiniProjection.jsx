// Importation des modules
import { Bar, Area } from '@visx/shape';
import { curveMonotoneX, curveMonotoneY } from '@visx/curve';
import { mean, max, extent } from 'd3-array';

/**
 * 1D projection of a 3D chart onto one axis, for the brush minimaps: a bar chart
 * (categorical axis) or a binned area plot (continuous axis, 24 bins,
 * curveMonotone) of the value aggregated along the brushed axis.
 *
 * @param {object} props
 * @param {Array<object>} props.data - Data rows (long format).
 * @param {string} props.posCol - Position column (the brushed axis).
 * @param {'categorical'|string} props.posType - Position column type.
 * @param {string} props.valCol - Value column being aggregated.
 * @param {Function} props.posScale - Scale mapping position → pixels along the axis.
 * @param {number} props.width - Minimap width (px).
 * @param {number} props.height - Minimap height (px).
 * @param {'x'|'y'} [props.direction='x'] - Brushed axis direction.
 * @param {string} [props.color='currentColor'] - Fill color.
 * @param {'mean'|'count'} [props.mode='mean'] - Aggregation mode.
 * @returns {JSX.Element}
 */
const MiniProjection = ({
  data, posCol, posType, valCol, posScale,
  width, height, direction = 'x', color = 'currentColor', mode = 'mean',
}) => {
  // Initialisation de la direction
  const isX = direction === 'x';
  // Déduction du sens
  const thick = isX ? height : width;

  // Agrégation le long de l'axe : par catégorie (band) ou par classe (binning
  // continu en 24 intervalles). `mode` : moyenne de la valeur ou effectif.
  const agg = (() => {
    if (posType === 'categorical') {
      const m = new Map();
      for (const r of data) {
        const p = r[posCol], v = +r[valCol];
        if (p == null || isNaN(v)) continue;
        if (!m.has(p)) m.set(p, []);
        m.get(p).push(v);
      }
      return [...m.entries()].map(([k, vs]) => ({ pos: k, value: mode === 'count' ? vs.length : mean(vs) }));
    }
    const vals = data.map((r) => ({ p: +r[posCol], v: +r[valCol] })).filter((d) => !isNaN(d.p) && !isNaN(d.v));
    if (!vals.length) return [];
    const ext = extent(vals, (d) => d.p);
    const span = ext[1] - ext[0] || 1;
    const bins = 24;
    const acc = Array.from({ length: bins }, () => []);
    for (const d of vals) {
      let i = Math.floor(((d.p - ext[0]) / span) * bins);
      i = Math.max(0, Math.min(bins - 1, i));
      acc[i].push(d.v);
    }
    return acc.map((vs, i) => ({
      pos: ext[0] + ((i + 0.5) / bins) * span,
      value: vs.length ? (mode === 'count' ? vs.length : mean(vs)) : 0,
    }));
  })();

  const maxV = max(agg, (d) => Math.abs(d.value)) || 1;
  const vLen = (v) => (Math.abs(v) / maxV) * (thick - 2);

  // Axe catégoriel : barres depuis le bord opposé (bas pour x, gauche pour y).
  if (posType === 'categorical') {
    const bw = posScale.bandwidth ? posScale.bandwidth() : (isX ? width : height) / Math.max(1, agg.length);
    return (
      <g>
        {agg.map((d, i) => {
          const p = posScale(d.pos) ?? 0;
          const L = vLen(d.value);
          return isX
            ? <Bar key={i} x={p + 0.5} y={height - L} width={Math.max(0, bw - 1)} height={L} fill={color} opacity={0.4} />
            : <Bar key={i} x={0} y={p + 0.5} width={L} height={Math.max(0, bw - 1)} fill={color} opacity={0.4} />;
        })}
      </g>
    );
  }

  // Axe continu : aire monotone binned, ancrée sur le bord opposé.
  const sorted = [...agg].sort((a, b) => a.pos - b.pos);
  if (isX) {
    return (
      <Area
        data={sorted}
        x={(d) => posScale(d.pos)}
        y0={height}
        y1={(d) => height - vLen(d.value)}
        curve={curveMonotoneX}
        fill={color}
        opacity={0.32}
      />
    );
  }
  return (
    <Area
      data={sorted}
      y={(d) => posScale(d.pos)}
      // Accessor fonction (et non `0`) : @visx/shape ignore `x0` quand il est
      // falsy (`if (x0)`), retombant sur l'accessor x par défaut → NaN.
      x0={() => 0}
      x1={(d) => vLen(d.value)}
      curve={curveMonotoneY}
      fill={color}
      opacity={0.32}
    />
  );
};

export default MiniProjection;
