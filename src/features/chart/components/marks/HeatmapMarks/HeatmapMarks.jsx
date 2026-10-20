// Importation des modules
import { reduceValues } from '@/features/chart/utils/aggregate';
import './HeatmapMarks.scss';

// Séparateur de clé de cellule : délimiteur ASCII peu susceptible d'apparaître
// dans une catégorie — évite toute collision entre (x, y) distincts (le prototype
// utilise un NUL, ici un caractère visible, cohérent avec les clés composites du
// repo, cf. stacking.js). Sans effet sur l'apparence rendue.
const CELL_SEP = '|';

/**
 * Heatmap mark renderer: reduces z over each (x, y) cell (`aggregate`, the mean by
 * default) and paints a cell colored by the sequential scale.
 *
 * `fill`:
 *   - 'fill' → solid cells with a thin translucent white gap stroke;
 *   - 'line' → outlined cells (no fill), the contour carrying the color, inset
 *     by a small padding to air out the grid.
 * Takes no `hovered` prop, unlike the other marks: the active-cell emphasis is
 * delegated to the higher-level ActiveMark overlay (cells are painted uniformly here).
 *
 * @param {object} props
 * @param {Array<object>} props.data - Data rows (long format).
 * @param {string} props.x - x (categorical) column.
 * @param {string} props.y - y (categorical) column.
 * @param {string} props.z - Aggregated value column (drives cell color).
 * @param {Function} props.xScale - x band scale.
 * @param {Function} props.yScale - y band scale.
 * @param {Function} props.colorScale - Sequential color scale over the reduced z.
 * @param {'fill'|'line'} [props.fill='fill'] - Fill mode.
 * @param {string} [props.aggregate='AVG'] - Reduction of the rows of a cell, as accepted
 *   by `reduceValues`: `'none'` when the rows are API aggregates (one row per cell), an
 *   `Aggregation` value (`SUM`, `AVG`…).
 * @returns {JSX.Element}
 */
const HeatmapMarks = ({
  data, x, y, z, xScale, yScale, colorScale,
  fill = 'fill', aggregate = 'AVG',
}) => {
  const cellW = xScale.bandwidth ? xScale.bandwidth() : 20;
  const cellH = yScale.bandwidth ? yScale.bandwidth() : 20;
  const lineMode = fill === 'line';

  // Réduction de z par cellule (x, y) selon `aggregate` — rien à réduire en 'none',
  // où l'API a déjà rendu une ligne par cellule.
  const groups = new Map();
  for (const row of data) {
    const xv = row[x], yv = row[y], zv = row[z];
    if (xv == null || yv == null || zv == null || isNaN(zv)) continue;
    const k = xv + CELL_SEP + yv;
    if (!groups.has(k)) groups.set(k, { x: xv, y: yv, vals: [] });
    groups.get(k).vals.push(+zv);
  }
  const cells = [...groups.values()].map((c) => ({ x: c.x, y: c.y, value: reduceValues(c.vals, aggregate) }));

  // Inset des contours en mode ligne pour aérer la grille (aucun en mode plein).
  const pad = lineMode ? 1.5 : 0;

  return (
    <g className="chart-marks-heatmap">
      {cells.map((c, i) => {
        // Coin haut-gauche : origine de bande directe (band scale) ou centrage
        // sur le point (échelle continue, cas résiduel).
        const cx = xScale.bandwidth ? xScale(c.x) : xScale(c.x) - cellW / 2;
        const cy = yScale.bandwidth ? yScale(c.y) : yScale(c.y) - cellH / 2;
        if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return null;
        const col = colorScale(c.value);
        return (
          <rect
            key={i}
            className={lineMode ? 'chart-marks-heatmap-cell chart-marks-heatmap-cell--line'
              : 'chart-marks-heatmap-cell chart-marks-heatmap-cell--fill'}
            x={cx + pad}
            y={cy + pad}
            width={Math.max(0, cellW - pad * 2)}
            height={Math.max(0, cellH - pad * 2)}
            fill={lineMode ? 'none' : col}
            stroke={lineMode ? col : 'white'}
          />
        );
      })}
    </g>
  );
};

export default HeatmapMarks;
