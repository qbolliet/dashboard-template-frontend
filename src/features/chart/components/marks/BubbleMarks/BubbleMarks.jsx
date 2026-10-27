// Importation des modules
import { useId } from 'react';
import { markerPath, PALETTE } from '@/features/chart/utils/encoding';
import { layoutBubbles } from '@/features/chart/utils/bubble';
import HatchPatterns from '../shared/HatchPatterns';
import './BubbleMarks.scss';

/**
 * Bubble mark renderer: one marker per observation (per cell × series on two
 * categorical axes), centered on (x, y), its area proportional to z.
 *
 * Positions come from the (zoomed) position scales; sizes come from `areaOf`, built
 * once on the full data and the base scales, so zooming moves the bubbles without
 * resizing them. Bubbles are drawn largest first. z ≤ 0 or null draws nothing.
 *
 * Channel grammar (identical to the other marks):
 *   - color  → fill (fill mode) or outline (line mode); dodged series on a band axis;
 *   - style  → hatch (fill mode) or dashed outline (line mode);
 *   - marker → shape, at constant area (the default disc is the 'circle' marker).
 *
 * @param {object} props
 * @param {Array<object>} props.data - Data rows (long format).
 * @param {string} props.x - x column.
 * @param {string} props.y - y column.
 * @param {string} props.z - Size column.
 * @param {{color: ?string, style: ?string, marker: ?string}} props.channels - Active channel columns.
 * @param {Function} props.xScale - x scale (zoomed).
 * @param {Function} props.yScale - y scale (zoomed).
 * @param {Function} props.colorScale - Categorical color scale.
 * @param {Function} props.styleScale - Dash-array scale (style channel, line mode).
 * @param {Function} props.hatchScale - Hatch-type scale (style channel, fill mode).
 * @param {Function} props.markerScale - Marker-type scale (marker channel).
 * @param {(z: number) => ?number} props.areaOf - z → area (px²), from `bubbleArea`.
 * @param {?Array<string>} [props.dodgeKeys=null] - Series keys dodged inside the bands
 *   (null: no dodge).
 * @param {boolean} [props.cells=false] - Reduce the rows per (x, y, series) — two
 *   categorical axes.
 * @param {string} [props.reduce='AVG'] - Reduction of a cell ('none': already aggregated).
 * @param {'fill'|'line'} [props.fill='fill'] - Fill mode.
 * @param {*} [props.hovered] - Hovered channel value, or null.
 * @returns {JSX.Element}
 */
const BubbleMarks = ({
  data, x, y, z, channels, xScale, yScale,
  colorScale, styleScale, hatchScale, markerScale,
  areaOf, dodgeKeys = null, cells = false, reduce = 'AVG',
  fill = 'fill', hovered,
}) => {
  // Initialisation des arguments
  const isFillMode = fill !== 'line';
  const defaultColor = PALETTE[0];
  const bubbles = layoutBubbles({
    data, x, y, z, channels, cells, reduce, xScale, yScale, areaOf, dodgeKeys,
  });

  // Patterns de hachures (mode plein + canal style) — un <pattern> par (type, couleur),
  // même schéma que ViolinMarks. Identité stable via useId.
  const uid = 'bh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const patternDefs = [];
  const patternIds = new Map();
  const hatchIdOf = (b, color) => {
    if (!channels.style || !isFillMode) return null;
    const type = hatchScale(b.styleVal);
    if (!type) return null;
    const pk = type + '|' + color;
    if (!patternIds.has(pk)) {
      const id = uid + '-p' + patternIds.size;
      patternIds.set(pk, id);
      patternDefs.push({ id, type, color });
    }
    return patternIds.get(pk);
  };

  // Bulles déjà triées de la plus grande à la plus petite : les petites restent visibles
  // par-dessus. Chaque bulle porte sa classe de série (estompage au survol de légende).
  const items = bubbles.map((b, i) => {
    const color = channels.color ? colorScale(b.colorVal) : defaultColor;
    const type = channels.marker ? markerScale(b.markerVal) : 'circle';
    const d = markerPath(type, b.area);
    const dash = (!isFillMode && channels.style) ? styleScale(b.styleVal) : null;
    const hatchId = hatchIdOf(b, color);
    const isFaded = hovered != null
      && hovered !== b.colorVal && hovered !== b.styleVal && hovered !== b.markerVal;
    return (
      <g
        key={i}
        className={isFaded ? 'chart-marks-series is-faded' : 'chart-marks-series'}
        transform={`translate(${b.px.toFixed(2)},${b.py.toFixed(2)})`}
      >
        <path
          className={'chart-marks-bubble-body chart-marks-bubble-body--' + (isFillMode ? 'fill' : 'line')}
          d={d}
          fill={isFillMode ? color : 'none'}
          stroke={color}
          strokeDasharray={dash || undefined}
          strokeLinejoin="round"
        />
        {hatchId && <path d={d} fill={`url(#${hatchId})`} stroke="none" pointerEvents="none" />}
      </g>
    );
  });

  return (
    <g className="chart-marks-bubble">
      <HatchPatterns combos={patternDefs.map((p) => ({ ...p, opacity: 0.8, strokeWidth: 1.4 }))} />
      {items}
    </g>
  );
};

export default BubbleMarks;
