// Importation des modules
import { range } from 'd3-array';
import { format as d3Format } from 'd3-format';
import './SequentialLegend.scss';

// Nombre de paliers du dégradé — identique au prototype (barre lisse par
// interpolation CSS entre 12 couleurs échantillonnées sur le domaine).
const GRADIENT_STOPS = 12;

/**
 * Continuous color-ramp legend for heatmap/density chart kinds: a gradient bar
 * sampled at 12 stops across the scale's domain, with the min/max formatted at
 * each end. Rendered as a `<dl>` (term = label, description = bar + readout)
 * rather than a `<div>` stack.
 *
 * @param {object} props
 * @param {function(number): string} props.scale - Sequential color scale
 *   (utils/encoding.js `sequentialScale`), exposing `.domain()` like a d3 scale —
 *   the caller is responsible for supplying a scale that carries its own domain.
 * @param {string} [props.label] - Legend title.
 * @param {string} [props.format='.2~s'] - d3-format spec applied to the min/max readout.
 * @param {'horizontal'|'vertical'} [props.orientation='horizontal'] - Bar orientation;
 *   vertical reads bottom (min) to top (max).
 * @returns {JSX.Element}
 */
const SequentialLegend = ({ scale, label, format = '.2~s', orientation = 'horizontal' }) => {
  const [lo, hi] = scale.domain();
  const fmt = d3Format(format);
  const stops = range(GRADIENT_STOPS).map((i) => {
    const t = i / (GRADIENT_STOPS - 1);
    return scale(lo + t * (hi - lo));
  });

  if (orientation === 'vertical') {
    // Barre verticale (haut = max) avec graduations à droite — mode par défaut
    // de la légende séquentielle en colonne (cf. .ca-legend-right du prototype).
    return (
      <dl className="chart-legend chart-seq-legend chart-seq-legend--v">
        {label && <dt className="chart-legend-label">{label}</dt>}
        <dd className="chart-seq-vrow">
          <div className="chart-seq-bar-v" style={{ background: `linear-gradient(to top, ${stops.join(',')})` }} />
          <div className="chart-seq-scale-v">
            <span>{fmt(hi)}</span>
            <span>{fmt(lo)}</span>
          </div>
        </dd>
      </dl>
    );
  }

  // Barre horizontale
  return (
    <dl className="chart-legend chart-seq-legend">
      {label && <dt className="chart-legend-label">{label}</dt>}
      <dd>
        <div className="chart-seq-bar" style={{ background: `linear-gradient(to right, ${stops.join(',')})` }} />
        <div className="chart-seq-scale">
          <span>{fmt(lo)}</span>
          <span>{fmt(hi)}</span>
        </div>
      </dd>
    </dl>
  );
};

export default SequentialLegend;
