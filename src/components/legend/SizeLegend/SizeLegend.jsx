// Importation des modules
import { measureText } from '@/utils/text/measureText';
import { sizeLegendValues } from './sizeLegendValues';
import './SizeLegend.scss';

// Taille (px) à laquelle les valeurs sont MESURÉES : celle des graduations du chart,
// un peu au-dessus de la taille réelle (--legend-value-font-size, 10.5px) pour que
// la largeur réservée ne soit jamais trop courte.
const MEASURE_FONT_SIZE = 11;
// Écart (px) entre le bord droit du plus grand cercle et le début des valeurs : géométrie
// interne du glyphe SVG, comme les tracés de LegendGlyph.
const LEADER_GAP = 8;
// Marge haute (px) : la valeur du plus grand cercle est centrée sur son sommet.
const PAD_Y = 7;
// Écart vertical minimal (px) entre deux valeurs : de petits cercles ont des sommets
// trop proches pour y aligner chacune leur valeur sans chevauchement.
const LABEL_GAP = 12;
// Famille des valeurs (`--font-mono` de SizeLegend.scss) : la mesure doit porter sur la
// même police, une chasse fixe étant plus large que la police d'interface.
const VALUE_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/**
 * Size legend: three nested reference circles, bottom-aligned, each with a leader
 * line to its formatted value. A circle's area is that of a mark of the same value
 * (radius = rMax · √(v / zMax)). Shared by the bubbles of `<Chart>` and the points
 * of `<Globe>` sized by value.
 *
 * @param {object} props
 * @param {number} props.zMax - Largest positive value (the one drawn with radius `rMax`).
 * @param {number} props.rMax - Radius (px) of the largest mark.
 * @param {function(number): string} props.formatValue - Formatter of the values.
 * @param {string} [props.label] - Legend title (the data title, else the column name).
 * @returns {?JSX.Element} Null when there is nothing to draw.
 */
const SizeLegend = ({ zMax, rMax, formatValue, label }) => {
  const values = sizeLegendValues(zMax);
  if (!values.length || !(rMax > 0)) return null;

  // Cercles posés sur la même ligne de base (bas du plus grand cercle)
  const radiusOf = (v) => rMax * Math.sqrt(v / zMax);
  const rLargest = radiusOf(values[0]);
  const cx = rLargest + 1;
  const baseY = PAD_Y + 2 * rLargest;
  const texts = values.map((v) => String(formatValue(v)));
  // Largeur réservée aux valeurs : mesurée à MEASURE_FONT_SIZE, dans la police des valeurs
  const textW = Math.ceil(Math.max(...texts.map((t) => measureText(t, MEASURE_FONT_SIZE, VALUE_FONT))));
  const lineEnd = 2 * rLargest + 1 + LEADER_GAP;
  const width = lineEnd + 4 + textW;
  // Sommet de chaque cercle, et ordonnée de sa valeur (repoussée vers le bas si besoin)
  const tops = values.map((v) => baseY - 2 * radiusOf(v));
  const labelYs = [];
  tops.forEach((top, i) => labelYs.push(i === 0 ? top : Math.max(top, labelYs[i - 1] + LABEL_GAP)));
  const height = Math.max(baseY, labelYs[labelYs.length - 1] + PAD_Y) + 1;

  return (
    <dl className="legend legend-size">
      {label && <dt className="legend-label">{label}</dt>}
      <dd>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible" aria-hidden="true">
          {values.map((v, i) => {
            const r = radiusOf(v);
            return (
              <g key={v}>
                <circle className="legend-size-circle" cx={cx} cy={baseY - r} r={r} />
                {/* Repère : du sommet du cercle à sa valeur (oblique si elle a été décalée) */}
                <polyline
                  className="legend-size-leader"
                  points={`${cx},${tops[i]} ${lineEnd - LEADER_GAP / 2},${tops[i]} ${lineEnd},${labelYs[i]}`}
                />
                <text className="legend-size-value" x={lineEnd + 4} y={labelYs[i]} dominantBaseline="middle">
                  {texts[i]}
                </text>
              </g>
            );
          })}
        </svg>
        {/* Lecture accessible : les valeurs de référence, sans le dessin */}
        <ul className="sr-only">
          {texts.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </dd>
    </dl>
  );
};

export default SizeLegend;
