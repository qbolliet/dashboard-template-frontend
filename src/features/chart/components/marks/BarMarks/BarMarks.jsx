// Importation des modules
import { useId } from 'react';
import { scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { mean } from 'd3-array';
import { color as d3color } from 'd3-color';
import { groupSeries, seriesKey, xKeyOf } from '../../../utils/encoding';
import HatchPatterns from '../shared/HatchPatterns';
import SeriesMarker from '../shared/SeriesMarker';
import './BarMarks.scss';

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
 * Vertical / horizontal bar mark renderer, over the 3-channel encoding
 * (color = series, style = hatch, marker = symbol).
 *
 * Series are dodged with a secondary `scaleBand` over the series keys; stacking
 * uses the buildStacks offsets. `fill`:
 *   - 'fill' → solid bars, overlaid with white hatches when the style channel is active;
 *   - 'line' → hatched colored outlines;
 *   - 'none' → markers at the bar tip (cumulated tip when stacked).
 * Solid bars get a darkened outline (`d3-color` `.darker(0.7)`). `mini` renders a
 * simplified minimap variant.
 *
 * @param {object} props
 * @param {Array<object>} props.data - Data rows (long format).
 * @param {string} props.x - x column.
 * @param {string} props.y - y column.
 * @param {{color: ?string, style: ?string, marker: ?string}} props.channels - Active channel columns.
 * @param {Function} props.xScale - x scale.
 * @param {Function} props.yScale - y scale.
 * @param {Function} props.colorScale - Categorical color scale (color channel).
 * @param {Function} props.styleScale - Dash-array scale (style channel).
 * @param {Function} props.markerScale - Marker-type scale (marker channel).
 * @param {Function} props.hatchScale - Hatch-type scale (style channel).
 * @param {*} [props.hovered] - Hovered channel value, or null.
 * @param {'v'|'h'} [props.orient='v'] - Bar orientation.
 * @param {'none'|'line'|'fill'} [props.fill='fill'] - Fill mode.
 * @param {?{offsets: Map}} [props.stack=null] - Stacking offsets, or null.
 * @param {boolean} [props.mini=false] - Minimap (simplified) rendering.
 * @param {?Array<object>} [props.groups=null] - Pre-computed `groupSeries(data, channels)`
 *   result (mutualisé côté appelant, cf. Chart.jsx) ; recalculé en interne si absent, pour
 *   ne pas casser un usage direct du composant.
 * @returns {JSX.Element}
 */
const BarMarks = ({
  data, x, y, channels, xScale, yScale,
  colorScale, styleScale, markerScale, hatchScale,
  hovered, orient = 'v', fill = 'fill', stack = null, mini = false, groups = null,
}) => {
  // Initialisation des valeurs
  const horizontal = orient === 'h';
  const bandKey = horizontal ? y : x;
  const valKey = horizontal ? x : y;
  const bandScale = horizontal ? yScale : xScale;
  const valScale = horizontal ? xScale : yScale;

  // Initialisation des Séries
  const seriesList = groups || groupSeries(data, channels);
  const seriesKeys = seriesList.map((s) => s.key);
  // Ordre de PEINTURE inversé : la 1re série est dessinée en dernier (donc AU-DESSUS),
  // pour qu'en empilage le sommet de chaque barre l'emporte sur le socle de la suivante.
  // Sans effet sur le dodge (positions issues de `seriesKeys`/`subScale`, ordre d'origine).
  const paintSeries = [...seriesList].reverse();

  // band → seriesKey → rows
  const grouped = new Map();
  for (const row of data) {
    const bv = row[bandKey];
    if (bv == null) continue;
    const sk = seriesKey(row, channels);
    if (!grouped.has(bv)) grouped.set(bv, new Map());
    const m = grouped.get(bv);
    if (!m.has(sk)) m.set(sk, []);
    m.get(sk).push(row);
  }

  const bandwidth = bandScale.bandwidth ? bandScale.bandwidth() : 24;
  const zero = valScale(0);
  // Sous-échelle pour le dodge : un slot par série dans la bande.
  const subScale = scaleBand({
    domain: seriesKeys,
    range: [0, bandwidth],
    padding: seriesKeys.length > 1 ? 0.12 : 0.2,
  });

  // ── Hachures (canal style) : un <pattern> par (type, couleur de trait).
  //    Reste visible même en remplissage plein (lignes blanches par-dessus).
  //    Identité stable via useId (aucun compteur de module).
  const uid = 'bh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const patternDefs = [];
  const hatchByKey = new Map();
  if (channels.style && hatchScale && fill !== 'none') {
    const seen = new Map();
    const lineOpacity = fill === 'fill' ? 0.62 : 0.9;
    for (const g of seriesList) {
      const type = hatchScale(g.styleVal);
      if (!type) { hatchByKey.set(g.key, null); continue; }
      const patColor = fill === 'fill' ? '#ffffff' : colorScale(g.colorVal);
      const pk = type + '|' + patColor;
      let id = seen.get(pk);
      if (!id) {
        id = uid + '-p' + seen.size;
        seen.set(pk, id);
        patternDefs.push({ id, type, color: patColor, opacity: lineOpacity, strokeWidth: mini ? 1.1 : 1.5 });
      }
      hatchByKey.set(g.key, id);
    }
  }

  return (
    <g className="chart-marks-bar">
      <HatchPatterns combos={patternDefs} />
      {[...grouped].map(([bv, sMap]) => {
        const bandPos = bandScale(bv) ?? 0;
        return (
          <g key={bv} transform={horizontal ? `translate(0, ${bandPos})` : `translate(${bandPos}, 0)`}>
            {paintSeries.map((g) => {
              const rows = sMap.get(g.key);
              if (!rows || !rows.length) return null;
              const value = mean(rows, (r) => +r[valKey]);
              if (value == null || isNaN(value)) return null;
              const color = colorScale(g.colorVal);
              const dash = channels.style ? styleScale(g.styleVal) : null;
              const isFaded = !mini && hovered != null && !seriesMatchesHover(g, hovered);

              // Étendue le long de la valeur + position transversale dans la bande.
              let vStart, vEnd, cross0, crossW, tipVal;
              if (stack) {
                const o = stack.offsets.get(g.key + '|' + xKeyOf(bv));
                const v0 = o ? valScale(o.y0) : zero;
                const v1 = o ? valScale(o.y1) : valScale(value);
                vStart = Math.min(v0, v1); vEnd = Math.max(v0, v1);
                cross0 = 0; crossW = bandwidth;
                tipVal = v1;                      // sommet cumulé (empilage)
              } else {
                const vv = valScale(value);
                vStart = Math.min(vv, zero); vEnd = Math.max(vv, zero);
                cross0 = subScale(g.key); crossW = subScale.bandwidth();
                tipVal = vv;
              }
              const len = vEnd - vStart;
              const rect = horizontal
                ? { x: vStart, y: cross0, width: len, height: crossW }
                : { x: cross0, y: vStart, width: crossW, height: len };

              // Position du marqueur : sommet en mode nuage (sommet cumulé si
              // empilé, pour que l'empilage fonctionne sans barre dessinée),
              // milieu de barre sinon.
              let mx, my;
              if (fill === 'none') {
                if (horizontal) { mx = tipVal; my = cross0 + crossW / 2; }
                else { mx = cross0 + crossW / 2; my = tipVal; }
              } else {
                mx = horizontal ? vStart + len / 2 : cross0 + crossW / 2;
                my = horizontal ? cross0 + crossW / 2 : vStart + len / 2;
              }
              const showMarker = fill === 'none' ? true : (!mini && !!channels.marker);
              const markerType = channels.marker ? markerScale(g.markerVal) : 'circle';
              const hatchId = hatchByKey.get(g.key);
              // Nuage : marqueur plein (dash nul) vs pointillé (contour tireté, évidé).
              const scatterHollow = !mini && fill === 'none' && channels.style && !!dash;

              // Contour de barre pleine assombri (d3-color .darker), sinon la couleur.
              const barStroke = fill === 'fill'
                ? (d3color(color) ? d3color(color).darker(0.7).formatHex() : color)
                : color;
              const rectClass = 'chart-marks-bar-rect'
                + (fill === 'fill' ? ' chart-marks-bar-rect--fill' : ' chart-marks-bar-rect--line')
                + (mini ? ' chart-marks-bar-rect--mini' : '');

              return (
                <g key={g.key} className={isFaded ? 'chart-marks-series is-faded' : 'chart-marks-series'}>
                  {fill !== 'none' && (
                    <Bar
                      {...rect}
                      className={rectClass}
                      fill={fill === 'fill' ? color : 'none'}
                      stroke={barStroke}
                      strokeDasharray={(!mini && channels.style && dash) ? dash : undefined}
                    />
                  )}
                  {fill !== 'none' && hatchId && (
                    <rect {...rect} fill={`url(#${hatchId})`} stroke="none" pointerEvents="none" />
                  )}
                  {showMarker && (
                    <SeriesMarker
                      type={markerType}
                      x={mx}
                      y={my}
                      size={mini ? 20 : 40}
                      fill={color}
                      hollow={scatterHollow}
                      strokeWidth={scatterHollow ? 1.3 : (mini ? 0.5 : 0.8)}
                      dash={scatterHollow ? dash : undefined}
                    />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

export default BarMarks;
