// Importation des modules
import { AxisBottom as VisxAxisBottom } from '@visx/axis';
import { GridColumns } from '@visx/grid';
import { resolveFormatter } from '../../../utils/formatters';
import { measureText, tickCountFor } from '../../../utils/measureText';
import { ellipsize, wrapLines, ticksFor, TICK_FONT_SIZE } from '../tickHelpers';
import './ChartAxisBottom.scss';

// Séparateur de canal utilisé pour faire transiter le mode de rendu ('R'otate /
// 'M'ultiline / 'P'lain) et son contenu à travers `tickFormat` → `formattedValue`
// → `tickComponent` (seul canal par graduation que visx transmet). 
// Le caractère de contrôle « unit separator » (0x1F) n'apparaît dans aucun libellé 
// affichable, contrairement à l'espace — d'où l'usage de `String.fromCharCode` 
// plutôt qu'un séparateur imprimable.
const SEP = String.fromCharCode(31);

/**
 * Bottom (x) axis: wraps `@visx/axis` `AxisBottom` and `@visx/grid` `GridColumns`,
 * reproducing the tick derivation and overlap-avoidance strategies of the design
 * prototype (design-system/project/scripts/charts/axis.jsx) — 'auto' measures the
 * widest label against the per-tick pixel budget and picks between no treatment
 * and a -45° end-anchored rotation; 'rotate' forces the rotation; 'skip' drops
 * intermediate ticks; 'multiline' wraps categorical labels onto `maxLines` lines.
 *
 * @param {object} props
 * @param {object} props.scale - visx/d3 scale (band for categorical, linear/time otherwise).
 * @param {'date'|'number'|'categorical'} props.type - Column type driving tick derivation.
 * @param {number} props.length - Horizontal extent of the axis (innerWidth).
 * @param {number} props.height - Vertical position of the axis, and vertical span of
 *   the grid lines (innerHeight).
 * @param {string|Function} [props.format] - d3-format/d3-time-format spec, or a formatter function.
 * @param {string} [props.label] - Axis label text.
 * @param {number} [props.maxLabelLength] - Categorical ellipsis length (non-multiline).
 * @param {number} [props.maxLines=2] - Categorical multiline max line count.
 * @param {'auto'|'rotate'|'multiline'|'skip'} [props.overlap='auto'] - Anti-overlap strategy.
 * @param {'sparse'|'normal'|'dense'} [props.tickDensity='normal'] - Tick count preset.
 * @param {boolean} [props.showGrid=true] - Renders the vertical grid lines.
 * @returns {JSX.Element}
 */
const ChartAxisBottom = ({
  scale, type, length, height, format, label,
  maxLabelLength, maxLines = 2, overlap = 'auto', tickDensity = 'normal', showGrid = true,
}) => {
  // Résolution du format
  const fmt = resolveFormatter(format, type, type === 'date' ? scale.domain() : null);
  // Initialisation des ticks
  const desired = tickCountFor(length, tickDensity);
  let ticks = ticksFor(scale, type, desired);
  // Initialisation des labels
  let labels = ticks.map((t) => fmt(t));
  let formatted = labels.slice();

  // Budget de pixels disponible par graduation (largeur de bande catégorielle, ou
  // pas fixe pour les échelles continues).
  const tickPx = type === 'categorical'
    ? (scale.bandwidth ? scale.bandwidth() : length / Math.max(1, ticks.length))
    : length / Math.max(1, ticks.length);

  // Choix de la stratégie : 'auto' compare le libellé le plus large au budget.
  let strategy = overlap;
  if (strategy === 'auto') {
    const widest = labels.reduce((m, l) => Math.max(m, measureText(l, TICK_FONT_SIZE)), 0);
    strategy = widest > tickPx - 6 ? 'rotate' : 'none';
  }

  // Stratégie 'skip' : on retire des graduations intermédiaires selon la largeur
  // du libellé le plus large (marge de 8px continu / 6px catégoriel).
  if (strategy === 'skip' && type !== 'categorical') {
    const widest = labels.reduce((m, l) => Math.max(m, measureText(l, TICK_FONT_SIZE)), 0);
    const step = Math.max(1, Math.ceil((widest + 8) / tickPx));
    ticks = ticks.filter((_, i) => i % step === 0);
    labels = ticks.map((t) => fmt(t));
  } else if (strategy === 'skip' && type === 'categorical') {
    const widest = labels.reduce((m, l) => Math.max(m, measureText(l, TICK_FONT_SIZE)), 0);
    const step = Math.max(1, Math.ceil((widest + 6) / tickPx));
    ticks = ticks.filter((_, i) => i % step === 0);
    labels = ticks.map((t) => fmt(t));
  }

  // Ellipsis / retour à la ligne — catégoriel uniquement.
  let multiline = false;
  if (type === 'categorical') {
    if (strategy === 'multiline') {
      const charsPerLine = Math.max(3, Math.floor((tickPx - 4) / 6.2));
      formatted = labels.map((l) => wrapLines(l, charsPerLine, maxLines));
      multiline = true;
    } else if (maxLabelLength) {
      formatted = labels.map((l) => ellipsize(l, maxLabelLength));
    } else {
      formatted = labels;
    }
  } else {
    formatted = labels;
  }

  const rotate = strategy === 'rotate';

  // Hauteur réservée aux libellés, pour placer le label d'axe sous les graduations.
  const labelHeight = rotate
    ? Math.max(...labels.map((l) => measureText(l, TICK_FONT_SIZE))) * 0.75 + 8
    : multiline ? (maxLines * 13) + 6 : 18;

  const tickFormat = (_value, index) => {
    if (rotate) return `R${SEP}${labels[index]}`;
    if (multiline) return `M${SEP}${formatted[index].join(SEP)}`;
    return `P${SEP}${formatted[index]}`;
  };

  const tickComponent = ({ x, formattedValue }) => {
    const [mode, ...rest] = (formattedValue ?? '').split(SEP);
    if (mode === 'R') {
      return (
        <g transform={`translate(${x}, 0)`}>
          <text className="chart-axis-tick-label" transform="translate(-3, 8) rotate(-45)"
            textAnchor="end" dominantBaseline="middle">{rest[0]}</text>
        </g>
      );
    }
    if (mode === 'M') {
      return (
        <g transform={`translate(${x}, 0)`}>
          <text className="chart-axis-tick-label" textAnchor="middle" y={14}>
            {rest.map((line, j) => <tspan key={j} x={0} dy={j === 0 ? 0 : 13}>{line}</tspan>)}
          </text>
        </g>
      );
    }
    return (
      <g transform={`translate(${x}, 0)`}>
        <text className="chart-axis-tick-label" textAnchor="middle" y={14}>{rest[0]}</text>
      </g>
    );
  };

  return (
    <>
      {showGrid && (
        <GridColumns
          className="chart-axis-grid"
          scale={scale}
          height={height}
          tickValues={ticks}
        />
      )}
      <VisxAxisBottom
        top={height}
        scale={scale}
        tickValues={ticks}
        tickFormat={tickFormat}
        tickComponent={tickComponent}
        tickLength={4}
        axisLineClassName="chart-axis-line"
        tickClassName="chart-axis-tick"
      />
      {label && (
        <text
          className="chart-axis-label"
          x={length / 2}
          y={height + labelHeight + 18}
          textAnchor="middle">
          {label}
        </text>
      )}
    </>
  );
};

export default ChartAxisBottom;
