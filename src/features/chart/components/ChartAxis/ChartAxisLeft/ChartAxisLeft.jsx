// Importation des modules
import { AxisLeft as VisxAxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { resolveFormatter } from '../../../utils/formatters';
import { tickCountFor } from '../../../utils/measureText';
import { ellipsize, wrapLines, ticksFor } from '../tickHelpers';
import './ChartAxisLeft.scss';

// Séparateur de canal utilisé pour faire transiter le mode de rendu ('R'otate /
// 'M'ultiline / 'P'lain) et son contenu à travers `tickFormat` → `formattedValue`
// → `tickComponent` (seul canal par graduation que visx transmet). 
// Le caractère de contrôle « unit separator » (0x1F) n'apparaît dans aucun libellé 
// affichable, contrairement à l'espace — d'où l'usage de `String.fromCharCode` 
// plutôt qu'un séparateur imprimable.
// Similaire à ChartAxisBottom.jsx
const SEP = String.fromCharCode(31);

/**
 * Left (y) axis: wraps `@visx/axis` `AxisLeft` and `@visx/grid` `GridRows`,
 * reproducing the tick derivation and overlap-avoidance strategies of the design
 * prototype (design-system/project/scripts/charts/axis.jsx). Unlike the bottom
 * axis, categorical overlap only chooses between ellipsis and multiline wrap (no
 * rotation), plus an independent density-based skip when the tick pitch is tight.
 * The tick stub and label are rendered entirely by hand (visx's own tick line is
 * hidden) so they can be shifted left by `tickPadX`, leaving room for an overlay
 * drawn between the ticks and the chart edge (e.g. the y-minimap).
 *
 * @param {object} props
 * @param {object} props.scale - visx/d3 scale (band for categorical, linear/time otherwise).
 * @param {'date'|'number'|'categorical'} props.type - Column type driving tick derivation.
 * @param {number} props.length - Vertical extent of the axis (innerHeight).
 * @param {number} props.width - Horizontal grid span (innerWidth).
 * @param {string|Function} [props.format] - d3-format/d3-time-format spec, or a formatter function.
 * @param {string} [props.label] - Axis label text.
 * @param {number} [props.maxLabelLength] - Categorical ellipsis/wrap character budget.
 * @param {number} [props.maxLines=2] - Categorical multiline max line count.
 * @param {'auto'|'multiline'|'skip'} [props.overlap='auto'] - Anti-overlap strategy.
 * @param {'sparse'|'normal'|'dense'} [props.tickDensity='normal'] - Tick count preset.
 * @param {boolean} [props.showGrid=true] - Renders the horizontal grid lines.
 * @param {number} [props.tickPadX=0] - Left offset applied to the tick stub and label.
 * @param {number} [props.labelOffset=50] - Distance between the tick labels and the
 *   rotated axis label.
 * @returns {JSX.Element}
 */
const ChartAxisLeft = ({
  scale, type, length, width, format, label,
  maxLabelLength, maxLines = 2, overlap = 'auto', tickDensity = 'normal', showGrid = true,
  tickPadX = 0, labelOffset = 50,
}) => {
  // Résolution du format
  const fmt = resolveFormatter(format, type, type === 'date' ? scale.domain() : null);
  // Initialisation des ticks
  const desired = tickCountFor(length, tickDensity);
  let ticks = ticksFor(scale, type, desired);
  // Initialisation des labels
  let labels = ticks.map((t) => fmt(t));

  // Pour le catégoriel : largeur de bande réelle. Pour le continu : budget fixe
  // (les libellés numériques/date sont généralement courts) — reproduit tel quel.
  const tickPx = type === 'categorical'
    ? (scale.bandwidth ? scale.bandwidth() : length / Math.max(1, ticks.length))
    : 18;

  let formatted = labels;
  let multiline = false;
  if (type === 'categorical') {
    if (overlap === 'multiline' || (overlap === 'auto' && maxLabelLength)) {
      const charsPerLine = maxLabelLength || 14;
      formatted = labels.map((l) => wrapLines(l, charsPerLine, maxLines));
      multiline = true;
    } else {
      formatted = labels.map((l) => ellipsize(l, maxLabelLength || 18));
    }
    // Repli densité : trop de graduations pour la place disponible → on saute.
    if (overlap === 'skip' || (overlap === 'auto' && tickPx < 14)) {
      const step = Math.max(1, Math.ceil(14 / tickPx));
      ticks = ticks.filter((_, i) => i % step === 0);
      labels = ticks.map((t) => fmt(t));
      formatted = labels.map((l) => ellipsize(l, maxLabelLength || 18));
      multiline = false;
    }
  }

  // Timbre + texte décalés de tickPadX vers la gauche (place réservée à un
  // élément superposé entre eux et le bord du graphique, ex. la minimap y).
  const tickTextX = -tickPadX - 6;
  const stubFar = -tickPadX - 4;
  const stubNear = -tickPadX;

  // Encodage du mode de rendu (multi-lignes / à plat) et du contenu du tick
  // dans la chaîne unique transmise par visx (cf. SEP ci-dessus).
  const tickFormat = (_value, index) => (multiline
    ? `M${SEP}${formatted[index].join(SEP)}`
    : `P${SEP}${formatted[index]}`);

  // Décodage du mode et rendu du talon + libellé (simple ou réparti en tspans),
  // décalés de tickPadX vers la gauche.
  const tickComponent = ({ y, formattedValue }) => {
    const [mode, ...rest] = (formattedValue ?? '').split(SEP);
    return (
      <g transform={`translate(0, ${y})`}>
        <line className="chart-axis-tick-stub" x1={stubFar} x2={stubNear} y1={0} y2={0} />
        {mode === 'M' ? (
          <text className="chart-axis-tick-label" textAnchor="end" x={tickTextX} dominantBaseline="middle">
            {rest.map((line, j, arr) => (
              <tspan key={j} x={tickTextX} dy={j === 0 ? -((arr.length - 1) * 6) : 12}>{line}</tspan>
            ))}
          </text>
        ) : (
          <text className="chart-axis-tick-label" textAnchor="end" x={tickTextX} dominantBaseline="middle">
            {rest[0]}
          </text>
        )}
      </g>
    );
  };

  return (
    <>
      {showGrid && (
        <GridRows
          className="chart-axis-grid"
          scale={scale}
          width={width}
          tickValues={ticks}
        />
      )}
      <VisxAxisLeft
        scale={scale}
        tickValues={ticks}
        tickFormat={tickFormat}
        tickComponent={tickComponent}
        hideTicks
        axisLineClassName="chart-axis-line"
        tickClassName="chart-axis-tick"
      />
      {label && (
        <text
          className="chart-axis-label"
          transform={`translate(${-(tickPadX + labelOffset)}, ${length / 2}) rotate(-90)`}
          textAnchor="middle">
          {label}
        </text>
      )}
    </>
  );
};

export default ChartAxisLeft;
