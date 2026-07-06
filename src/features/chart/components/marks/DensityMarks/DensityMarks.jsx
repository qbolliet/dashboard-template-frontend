// Importation des modules
import { useId } from 'react';
import { geoPath } from 'd3-geo';
import { interpolateRgbBasis } from 'd3-interpolate';
import { groupSeries, seriesKey, SEQUENTIAL } from '../../../utils/encoding';
import { densityContourGenerator } from '../../../utils/kde';
import HatchPatterns from '../shared/HatchPatterns';
import SeriesMarker from '../shared/SeriesMarker';
import './DensityMarks.scss';

/**
 * Returns the longest ring of a GeoJSON contour, used to lay markers along it.
 *
 * @param {object} contour - A `d3-contour` MultiPolygon contour.
 * @returns {?Array<Array<number>>} The ring with the most points, or null.
 */
function biggestRing(contour) {
  let best = null;
  let len = 0;
  for (const poly of contour.coordinates || []) {
    for (const ring of poly) {
      if (ring.length > len) { len = ring.length; best = ring; }
    }
  }
  return best;
}

/**
 * 2D density mark renderer: one Gaussian KDE (via `d3-contour` contourDensity,
 * z-weighted) per series group (color × style × marker), rendered with
 * `d3-geo` geoPath.
 *
 * The channel grammar mirrors the other marks (channel count inferred from the
 * active channels):
 *   - color  → one density per color value, its own hue/gradient;
 *   - style  → in 'fill' mode a differentiating hatch over the blob footprint,
 *              in 'line' mode a dashed contour;
 *   - marker → a symbol laid along a median contour to tell densities apart.
 * `fill`:
 *   - 'fill' → filled bands with an opacity gradient (+ hatch for the style channel);
 *   - 'line' → level curves, dashed per style channel.
 * Contour markers are counter-scaled by 1/zoom so they stay round under the SVG
 * zoom transform. `stack` is inoperative on this chart type (ignored).
 *
 * @param {object} props
 * @param {Array<object>} props.data - Data rows (long format).
 * @param {string} props.x - x (numeric) column.
 * @param {string} props.y - y (numeric) column.
 * @param {string} props.z - Weight column.
 * @param {{color: ?string, style: ?string, marker: ?string}} props.channels - Active channel columns.
 * @param {Function} props.xScale - x scale.
 * @param {Function} props.yScale - y scale.
 * @param {Function} props.colorScale - Categorical color scale (color channel).
 * @param {Function} props.styleScale - Dash-array scale (style channel).
 * @param {Function} props.hatchScale - Hatch-type scale (style channel, filled mode).
 * @param {Function} props.markerScale - Marker-type scale (marker channel).
 * @param {*} [props.hovered] - Hovered channel value, or null.
 * @param {number} props.innerWidth - Plot width (px).
 * @param {number} props.innerHeight - Plot height (px).
 * @param {'fill'|'line'} [props.fill='fill'] - Fill mode.
 * @param {{kx: number, ky: number}} [props.zoom] - Current zoom factors (marker counter-scale).
 * @returns {JSX.Element}
 */
const DensityMarks = ({
  data, x, y, z, channels, xScale, yScale,
  colorScale, styleScale, hatchScale, markerScale, hovered,
  innerWidth, innerHeight, fill = 'fill', zoom = { kx: 1, ky: 1 },
}) => {
  // Initialisation des arguments
  const hueActive = !!channels.color;
  const styleActive = !!channels.style;
  const markerActive = !!channels.marker;
  const lineMode = fill === 'line';
  // Interpolateur séquentiel brut (t ∈ [0, 1]) pour le cas sans canal couleur —
  // même rampe que sequentialScale mais non bornée à un domaine de valeurs.
  const seqInterp = interpolateRgbBasis(SEQUENTIAL);

  // Densité par groupe de série (couleur × style × marqueur).
  const layers = (() => {
    if (!(innerWidth > 0) || !(innerHeight > 0)) return [];
    const bw = Math.max(10, Math.min(innerWidth, innerHeight) / 22);
    const px = (d) => xScale(+d[x]);
    const py = (d) => yScale(+d[y]);
    const wt = (d) => { const v = +d[z]; return isNaN(v) ? 1 : Math.max(0.01, v); };

    const gen = densityContourGenerator({
      x: px, y: py, weight: wt, size: [innerWidth, innerHeight], bandwidth: bw, thresholds: 9,
    });
    const makeContours = (rows) => gen(rows.filter((d) => !isNaN(px(d)) && !isNaN(py(d))));

    const seriesList = groupSeries(data, channels);
    const out = [];
    if (!hueActive && !styleActive && !markerActive) {
      out.push({
        key: '__all__', colorVal: '__all__', styleVal: '__all__', markerVal: '__all__',
        contours: makeContours(data),
      });
    } else {
      const byKey = new Map();
      for (const row of data) {
        const sk = seriesKey(row, channels);
        if (!byKey.has(sk)) byKey.set(sk, []);
        byKey.get(sk).push(row);
      }
      for (const g of seriesList) {
        const rows = byKey.get(g.key) || [];
        if (rows.length < 5) continue;
        out.push({
          key: g.key, colorVal: g.colorVal, styleVal: g.styleVal, markerVal: g.markerVal,
          contours: makeContours(rows),
        });
      }
    }
    return out;
  })();

  const path = geoPath();

  // Hachures (canal style, mode plein) : un <pattern> par (type, couleur) — même
  // grammaire que BarMarks/ViolinMarks. hue 1 = couleurs distinctes ; hue 2 = 1re
  // modalité en aplat plein, 2e en aplat hachuré (HATCH_TYPES[0]=null ⇒ la 1re
  // modalité n'a pas de hachure). Identité stable via useId.
  const uid = 'dh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const patternDefs = [];
  const hatchById = new Map();
  if (styleActive && hatchScale && !lineMode) {
    const seen = new Map();
    for (const layer of layers) {
      const type = hatchScale(layer.styleVal);
      if (!type) { hatchById.set(layer.key, null); continue; }
      const patColor = hueActive ? colorScale(layer.colorVal) : seqInterp(0.7);
      const pk = type + '|' + patColor;
      let id = seen.get(pk);
      if (!id) { id = uid + '-p' + seen.size; seen.set(pk, id); patternDefs.push({ id, type, color: patColor }); }
      hatchById.set(layer.key, id);
    }
  }

  return (
    <g className="chart-marks-density">
      <HatchPatterns combos={patternDefs.map((d) => ({ ...d, opacity: 0.85, strokeWidth: 1.4 }))} />
      {layers.map((layer) => {
        const cs = layer.contours.filter((c) => (c.coordinates || []).length);
        if (!cs.length) return null;
        const vMin = cs[0].value, vMax = cs[cs.length - 1].value;
        const span = vMax - vMin || 1;
        const baseColor = hueActive ? colorScale(layer.colorVal) : null;
        // Style : en mode ligne, trait plein vs pointillé ; en mode plein,
        // aplat plein vs hachuré (overlay ci-dessous).
        const dash = (lineMode && styleActive) ? styleScale(layer.styleVal) : null;
        const hatchId = hatchById.get(layer.key);
        const isFaded = hovered != null && (hueActive || styleActive || markerActive)
          && hovered !== layer.colorVal && hovered !== layer.styleVal && hovered !== layer.markerVal;
        // Dernier contour (le plus externe) : porte la bordure de définition.
        const outerIdx = cs.length - 1;
        // Plus grand contour (seuil le plus bas) = empreinte complète du blob, sur
        // laquelle on pose l'aplat hachuré différenciant en mode plein.
        const footprint = path(cs[0]);

        return (
          <g key={layer.key} className={isFaded ? 'chart-marks-series is-faded' : 'chart-marks-series'}>
            {cs.map((c, i) => {
              const t = (c.value - vMin) / span;
              const d = path(c);
              if (!d) return null;
              if (lineMode) {
                // Courbes de niveau : couleur + style (plein / pointillé).
                const stroke = hueActive ? baseColor : seqInterp(0.55);
                return (
                  <path
                    key={i}
                    className="chart-marks-density-contour"
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={0.55 + 0.4 * t}
                    strokeDasharray={dash || undefined}
                    strokeLinejoin="round"
                  />
                );
              }
              // Bandes pleines + bordure de définition (pleine) sur le contour le
              // plus externe quand le canal style est actif ; la distinction plein
              // vs hachuré est portée par l'aplat hachuré (overlay ci-dessous).
              const fillCol = hueActive ? baseColor : seqInterp(0.12 + 0.88 * t);
              const fillOp = hueActive ? (0.10 + 0.6 * t) : 1;
              const drawBorder = styleActive && i === outerIdx;
              return (
                <path
                  key={i}
                  className={drawBorder ? 'chart-marks-density-band chart-marks-density-band--border'
                    : 'chart-marks-density-band'}
                  d={d}
                  fill={fillCol}
                  fillOpacity={fillOp}
                  fillRule="evenodd"
                  stroke={drawBorder ? (hueActive ? baseColor : seqInterp(0.7)) : 'none'}
                />
              );
            })}
            {/* Aplat hachuré différenciant (canal style, mode plein) sur l'empreinte. */}
            {!lineMode && hatchId && footprint && (
              <path d={footprint} fill={`url(#${hatchId})`} stroke="none" pointerEvents="none" />
            )}
            {/* Marques le long d'un contour médian pour distinguer les densités. */}
            {markerActive && (() => {
              const mid = cs[Math.floor(cs.length * 0.5)] || cs[cs.length - 1];
              const ring = biggestRing(mid);
              if (!ring || ring.length < 6) return null;
              const n = 6;
              const pts = Array.from({ length: n }, (_, k) => ring[Math.floor((k / n) * ring.length)]);
              const mType = markerScale(layer.markerVal);
              const mCol = hueActive ? baseColor : seqInterp(0.7);
              // Contre-échelle : la couche density est zoomée par transform ; on
              // annule le scale sur les symboles pour qu'ils restent ronds.
              const inv = `scale(${(1 / (zoom.kx || 1)).toFixed(5)},${(1 / (zoom.ky || 1)).toFixed(5)})`;
              return pts.map((p, k) => (
                <g key={'m' + k} transform={`translate(${p[0]},${p[1]}) ${inv}`}>
                  <SeriesMarker type={mType} size={44} fill={mCol} strokeWidth={0.9} />
                </g>
              ));
            })()}
          </g>
        );
      })}
    </g>
  );
};

export default DensityMarks;
