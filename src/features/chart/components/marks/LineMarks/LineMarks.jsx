// Importation des modules
import { useId } from 'react';
import { LinePath, Area } from '@visx/shape';
import { curveCatmullRom } from '@visx/curve';
import { groupSeries, seriesKey, subsample, xKeyOf } from '../../../utils/encoding';
import HatchPatterns from '../shared/HatchPatterns';
import SeriesMarker from '../shared/SeriesMarker';
import './LineMarks.scss';

// Courbe partagée (Catmull-Rom, tension 0.5) — identique au prototype.
const CURVE = curveCatmullRom.alpha(0.5);

/**
 * Tells whether a series is highlighted by the current hover: any of its active
 * channel values matches the hovered value (null hover ⇒ every series matches).
 *
 * @param {{colorVal: *, styleVal: *, markerVal: *}} g - Series group.
 * @param {*} hovered - Hovered channel value, or null.
 * @returns {boolean}
 */
function seriesMatchesHover(g, hovered) {
  if (hovered == null) return true;
  return g.colorVal === hovered || g.styleVal === hovered || g.markerVal === hovered;
}

/**
 * Line / area / scatter mark renderer, over the 3-channel encoding
 * (color = series, style = dash, marker = symbol).
 *
 * `fill`:
 *   - 'none' → scatter: markers on every point, the style channel toggling the
 *     hollow/dashed marker variant (no connecting line);
 *   - 'line' → a `LinePath` per series;
 *   - 'fill' → an `Area` plus its crest line; when the style channel is active
 *     each area also gets a differentiating hatch (same grammar as bars/violins),
 *     the line keeping its own dash style.
 * Curve is Catmull-Rom (alpha 0.5). `stack` carries the buildStacks offsets
 * (y0/y1) for stacked areas/lines. `mini` renders a simplified minimap variant
 * (thin strokes, no markers). `baReal` overlays distinctive markers on every
 * point to tell a real series from its projection.
 *
 * @param {object} props
 * @param {Array<object>} props.data - Data rows (long format).
 * @param {string} props.x - Abscissa column.
 * @param {string} props.y - Ordinate column.
 * @param {{color: ?string, style: ?string, marker: ?string}} props.channels - Active channel columns.
 * @param {Function} props.xScale - x scale.
 * @param {Function} props.yScale - y scale.
 * @param {Function} props.colorScale - Categorical color scale (color channel).
 * @param {Function} props.styleScale - Dash-array scale (style channel).
 * @param {Function} props.markerScale - Marker-type scale (marker channel).
 * @param {Function} props.hatchScale - Hatch-type scale (style channel, filled areas).
 * @param {*} [props.hovered] - Hovered channel value, or null.
 * @param {boolean} [props.voronoiActive] - Whether a voronoi hover is active.
 * @param {?object} [props.voronoiActiveRow] - Row under the active voronoi hover.
 * @param {'none'|'line'|'fill'} [props.fill='line'] - Fill mode.
 * @param {?{offsets: Map}} [props.stack=null] - Stacking offsets, or null.
 * @param {boolean} [props.mini=false] - Minimap (simplified) rendering.
 * @param {?{marker: string, secondary?: boolean}} [props.baReal=null] - Real-series marker descriptor.
 * @param {?Array<object>} [props.groups=null] - Pre-computed `groupSeries(data, channels)`
 *   result (mutualisé côté appelant, cf. Chart.jsx) ; recalculé en interne si absent, pour
 *   ne pas casser un usage direct du composant.
 * @returns {JSX.Element}
 */
const LineMarks = ({
  data, x, y, channels, xScale, yScale,
  colorScale, styleScale, markerScale, hatchScale,
  hovered, voronoiActive, voronoiActiveRow,
  fill = 'line', stack = null, mini = false, baReal = null, groups = null,
}) => {
  // Séries triées par abscisse (comparaison Date-aware) — ordre stable de tracé.
  // Le tri porte sur une COPIE : `groups` est partagé entre plusieurs marks (ce
  // LineMarks principal + sa mini-vue, BarMarks) et potentiellement retenu dans un
  // cache du React Compiler côté <ChartCanvas> — aucune mark ne doit muter les
  // objets qu'elle reçoit. Coût : O(n) de copie devant un O(n log n) de tri déjà
  // payé, et une seule fois par rendu de mark (pendant un geste de brush le
  // repositionnement est impératif, cf. previewTargets dans Chart.jsx : aucun
  // rendu React par frame).
  const series = (groups || groupSeries(data, channels)).map((g) => ({
    ...g,
    rows: [...g.rows].sort((a, b) => {
      const ax = a[x], bx = b[x];
      return ax instanceof Date ? ax - bx : (ax < bx ? -1 : ax > bx ? 1 : 0);
    }),
  }));

  const y0px = yScale.range()[0]; // bas de l'aire de tracé (baseline)

  // Ordonnée haute (sommet cumulé si empilé) et basse (offset cumulé, sinon baseline).
  const topY = (row, sk) => {
    if (stack) {
      const o = stack.offsets.get(sk + '|' + xKeyOf(row[x]));
      return o ? yScale(o.y1) : yScale(row[y]);
    }
    return yScale(row[y]);
  };
  const botY = (row, sk) => {
    if (stack) {
      const o = stack.offsets.get(sk + '|' + xKeyOf(row[x]));
      return o ? yScale(o.y0) : y0px;
    }
    return y0px;
  };

  // En mode nuage (fill === 'none') le graphe principal ET la mini-vue du brush
  // restent de vrais nuages de points : pas de ligne de liaison.
  const showLine = fill === 'line' || fill === 'fill';
  const showArea = fill === 'fill';

  // Hachures d'aire (mode plein + canal style) : un <pattern> par (type, couleur).
  // Permet de distinguer les séries même quand les aires se chevauchent — en
  // complément du style de trait de la ligne. Identité stable via useId (aucun
  // compteur de module : impureté de rendu proscrite par react-compiler).
  const uid = 'lh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const hatchByKey = new Map();
  if (showArea && channels.style && hatchScale && !mini) {
    for (const g of series) {
      const type = hatchScale(g.styleVal);
      hatchByKey.set(
        g.key,
        type
          ? { id: uid + '-' + g.key.replace(/[^a-z0-9]/gi, ''), type, color: colorScale(g.colorVal) }
          : null,
      );
    }
  }
  const patternDefs = [...hatchByKey.values()].filter(Boolean);

  return (
    <g className="chart-marks-line">
      <HatchPatterns combos={patternDefs.map((d) => ({ ...d, opacity: 0.6, strokeWidth: 1.4 }))} />
      {series.map((g) => {
        const k = g.key;
        const color = colorScale(g.colorVal);
        const dash = channels.style ? styleScale(g.styleVal) : null;
        const isFaded = !mini && (
          (hovered != null && !seriesMatchesHover(g, hovered)) ||
          (voronoiActive && voronoiActiveRow && seriesKey(voronoiActiveRow, channels) !== k)
        );

        const defined = (d) => d[x] != null && d[y] != null && !isNaN(topY(d, k));

        const showMarkers = fill === 'none' ? true : (!mini && !!channels.marker);
        const markerType = channels.marker ? markerScale(g.markerVal) : 'circle';
        const mSize = mini ? 22 : (fill === 'none' ? 42 : 34);
        const markerRows = fill === 'none'
          ? (mini ? subsample(g.rows, 30) : g.rows)
          : subsample(g.rows, 13);
        // Nuage : le canal « style » code le marqueur plein (dash nul) vs pointillé
        // (contour tireté, intérieur évidé) — 3e niveau d'encodage après couleur/forme.
        const scatterHollow = !mini && fill === 'none' && channels.style && !!dash;

        // Marqueurs de distinction « vraie série vs projection » : posés sur TOUS
        // les points (sous-échantillonnés comme les marqueurs de hue). hue 2 →
        // marqueur unique ; hue 3 → marqueur de hue (extérieur) + marqueur de
        // distinction concentrique (intérieur).
        const baRealActive = !mini && baReal && fill !== 'none';
        const baRealRows = baRealActive ? subsample(g.rows, 13) : [];
        const baRealNodes = baRealActive ? baRealRows.map((r, i) => {
          const px = xScale(r[x]), py = topY(r, k);
          if (isNaN(px) || isNaN(py)) return null;
          if (baReal.secondary) {
            const hm = channels.marker ? markerScale(g.markerVal) : 'circle';
            return (
              <g key={'br' + i}>
                <SeriesMarker type={hm} x={px} y={py} size={38} fill={color} strokeWidth={0.9} />
                <SeriesMarker type={baReal.marker} x={px} y={py} size={14} fill={color} hollow strokeWidth={1.1} />
              </g>
            );
          }
          return (
            <SeriesMarker key={'br' + i} type={baReal.marker} x={px} y={py} size={30} fill={color} strokeWidth={0.9} />
          );
        }) : null;

        return (
          <g key={k} className={isFaded ? 'chart-marks-series is-faded' : 'chart-marks-series'}>
            {showArea && (
              <Area
                className={mini ? 'chart-marks-area chart-marks-area--mini' : 'chart-marks-area'}
                data={g.rows}
                x={(d) => xScale(d[x])}
                y0={(d) => botY(d, k)}
                y1={(d) => topY(d, k)}
                defined={defined}
                curve={CURVE}
                fill={color}
                stroke="none"
              />
            )}
            {showArea && hatchByKey.get(k) && (
              <Area
                data={g.rows}
                x={(d) => xScale(d[x])}
                y0={(d) => botY(d, k)}
                y1={(d) => topY(d, k)}
                defined={defined}
                curve={CURVE}
                fill={`url(#${hatchByKey.get(k).id})`}
                stroke="none"
                pointerEvents="none"
              />
            )}
            {showLine && (
              <LinePath
                className={mini ? 'chart-marks-line-path chart-marks-line-path--mini' : 'chart-marks-line-path'}
                data={g.rows}
                x={(d) => xScale(d[x])}
                y={(d) => topY(d, k)}
                defined={defined}
                curve={CURVE}
                fill="none"
                stroke={color}
                strokeDasharray={dash || undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {!baRealActive && showMarkers && markerRows.map((r, i) => {
              const px = xScale(r[x]), py = topY(r, k);
              if (isNaN(px) || isNaN(py)) return null;
              return (
                <SeriesMarker
                  key={i}
                  type={markerType}
                  x={px}
                  y={py}
                  size={mSize}
                  fill={color}
                  hollow={scatterHollow}
                  strokeWidth={scatterHollow ? 1.3 : (mini ? 0.5 : 0.8)}
                  dash={scatterHollow ? dash : undefined}
                />
              );
            })}
            {baRealNodes}
          </g>
        );
      })}
    </g>
  );
};

export default LineMarks;
