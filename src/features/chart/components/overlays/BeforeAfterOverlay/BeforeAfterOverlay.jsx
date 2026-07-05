// =================================================================
// BEFORE / AFTER OVERLAY — projection d'un côté d'une barre repositionnable
// =================================================================
// Barre verticale (line/bar) ou horizontale (bar-h) à une position `value`. D'un
// côté (avant/après) on affiche des séries supplémentaires issues de `config.data`
// (mêmes colonnes x/y/hue), encodées par le canal libre suivant. Distinction de
// la vraie série selon le nombre de canaux hue actifs : 0→couleur, 1→dash,
// 2→marqueur croix, 3→2e marqueur concentrique. IC propre à la projection, et
// mode `replace` (la série principale est masquée côté <Chart> via `mainClip`).

// Importation des modules
import { useId } from 'react';
import {
  seriesKey, groupSeries, xKeyOf, subsample, markerPath, PALETTE,
} from '../../../utils/encoding';
import { PROJ_DIST_MARKER } from '../../../toolbar-features/channelAssign';
import HatchPatterns from '../../marks/shared/HatchPatterns';
import DragBar from '../DragBar/DragBar';
import { resolveData } from '../overlayData';
import './BeforeAfterOverlay.scss';

/**
 * Before/after projection overlay: a repositionable bar plus projected series on
 * one side, distinguished from the real series by the next free visual channel.
 *
 * @param {object} props
 * @param {object} props.ctx - Projection context (scales, channels, data, chartKind…).
 * @param {object} props.config - Feature config ({ data, side, draggable, replace, color, dash, label, ci, labels }).
 * @param {*} props.value - Current bar domain value.
 * @param {function(*): void} props.onValue - Commits a new bar value (drag release).
 * @returns {JSX.Element}
 */
const BeforeAfterOverlay = ({ ctx, config, value, onValue }) => {
  // Déconstruction des paramètres
  const {
    chartKind, x, y, channels, xScale, yScale, colorScale, styleScale, markerScale, hatchScale,
    innerWidth, innerHeight, ciActive, ciFill, normFactor,
  } = ctx;
  const data = resolveData(config.data, { ...ctx, beforeAfter: value });
  const side = config.side || 'after';
  const draggable = !!config.draggable;
  const replace = !!config.replace;

  const horizontal = chartKind === 'bar-h';
  const posKey = horizontal ? y : x;
  const valKey = horizontal ? x : y;
  const posScale = horizontal ? yScale : xScale;
  const valScale = horizontal ? xScale : yScale;
  const axis = horizontal ? 'y' : 'x';
  const isLine = chartKind === 'line';

  // Nombre de canaux hue actifs → COMMENT la projection se distingue de la vraie série.
  const nHue = (channels.color ? 1 : 0) + (channels.style ? 1 : 0) + (channels.marker ? 1 : 0);
  const projColorParam = config.color || PALETTE[1];
  const projDashParam = config.dash || '6 4';

  const bp = posScale(value);
  const barPx = isNaN(bp) ? null : (posScale.bandwidth ? bp + posScale.bandwidth() / 2 : bp);

  // Filtre les rows du côté demandé de la barre.
  const onSide = (pos) => {
    const pp = posScale(pos) + (posScale.bandwidth ? posScale.bandwidth() / 2 : 0);
    if (barPx == null) return true;
    return side === 'after' ? pp >= barPx : pp <= barPx;
  };

  const ptOf = (pos, val) => (horizontal
    ? [valScale(val), posScale(pos) + (posScale.bandwidth ? posScale.bandwidth() / 2 : 0)]
    : [posScale(pos) + (posScale.bandwidth ? posScale.bandwidth() / 2 : 0), valScale(val)]);

  const series = groupSeries(data.filter((r) => onSide(r[posKey])), channels);
  for (const g of series) {
    g.rows.sort((a, b) => {
      const av = a[posKey], bv = b[posKey];
      return av instanceof Date ? av - bv : (av < bv ? -1 : av > bv ? 1 : 0);
    });
  }

  const label = config.label || (side === 'after' ? 'après' : 'avant');

  // Apparence de la projection pour une série donnée.
  //   • replace → IDENTIQUE à la série remplacée (couleur, trait, marque) ;
  //   • sinon, distinction par le canal LIBRE suivant :
  //       hue 0 → couleur ; hue 1 → trait ; hue 2 → marqueur (visible partout) ;
  //       hue 3 → 2e marqueur concentrique (le 1er = marqueur de hue).
  const projVisual = (g) => {
    const sDash = (channels.style && styleScale) ? styleScale(g.styleVal) : null;
    const sMarker = (channels.marker && markerScale) ? markerScale(g.markerVal) : null;
    if (replace) return { color: colorScale(g.colorVal), dash: sDash, hueMarker: sMarker, distMarker: null };
    if (nHue === 0) return { color: projColorParam, dash: null, hueMarker: null, distMarker: null };
    if (nHue === 1) return { color: colorScale(g.colorVal), dash: projDashParam, hueMarker: null, distMarker: null };
    if (nHue === 2) return { color: colorScale(g.colorVal), dash: sDash, hueMarker: null, distMarker: PROJ_DIST_MARKER };
    return { color: colorScale(g.colorVal), dash: sDash, hueMarker: sMarker, distMarker: PROJ_DIST_MARKER };
  };

  // Intervalles de confiance PROPRES à la projection — uniquement quand l'IC de
  // la barre d'outils est lui aussi actif (composition demandée).
  const ciCfg = config.ci;
  const showFcCI = isLine && ciActive && ciCfg && ciCfg.data;
  const fcArr = showFcCI ? resolveData(ciCfg.data, ctx) : [];
  const fcLookup = new Map();
  for (const r of fcArr) fcLookup.set(xKeyOf(r[posKey]) + '|' + seriesKey(r, channels), r);
  const fcBelow = (ciCfg && ciCfg.below) || [];
  const fcAbove = (ciCfg && ciCfg.above) || [];
  const nFcB = Math.max(fcBelow.length, fcAbove.length, 1);
  const fcFillOp = (i) => 0.26 * (nFcB - i) / nFcB + 0.05;
  const fcStrokeOp = (i) => 0.70 * (nFcB - i) / nFcB + 0.15;
  const fcMode = ciFill || 'fill';
  const uid = 'ba' + useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <g className="chart-ba-overlay">
      <g pointerEvents="none">
        {series.map((g) => {
          const color = colorScale(g.colorVal);
          const factor = normFactor ? normFactor(g.key) : 1;
          if (isLine) {
            const vis = projVisual(g);
            const dash = vis.dash;
            // L'IC de la projection est HACHURÉ quand la projection est une ligne
            // brisée (pointillée) et plein sinon — comme la vraie série.
            const ciHatch = dash ? ((channels.style && hatchScale && nHue >= 2) ? (hatchScale(g.styleVal) || 'diag') : 'diag') : null;
            const patId = uid + '-' + g.key.replace(/[^a-z0-9]/gi, '');

            let ciNodes = null, ciHatchNode = null;
            if (showFcCI) {
              const withCI = g.rows.map((r) => ({ pos: r[posKey], val: factor * +r[valKey], ci: fcLookup.get(xKeyOf(r[posKey]) + '|' + seriesKey(r, channels)) })).filter((p) => p.ci);
              if (withCI.length >= 2) {
                if (fcMode === 'fill') {
                  const hiOuter = fcAbove[nFcB - 1] != null ? fcAbove[nFcB - 1] : fcBelow[nFcB - 1];
                  const loOuter = fcBelow[nFcB - 1] != null ? fcBelow[nFcB - 1] : fcAbove[nFcB - 1];
                  ciNodes = Array.from({ length: nFcB }, (_, i) => {
                    const hiC = fcAbove[i], loC = fcBelow[i];
                    if (hiC == null || loC == null) return null;
                    const hiSeg = withCI.map((p) => ({ pos: p.pos, v: factor * +p.ci[hiC] })).filter((p) => !isNaN(p.v));
                    const loSeg = withCI.map((p) => ({ pos: p.pos, v: factor * +p.ci[loC] })).filter((p) => !isNaN(p.v));
                    if (hiSeg.length < 2 || loSeg.length < 2) return null;
                    let d = '';
                    hiSeg.forEach((p, k) => { const [px, py] = ptOf(p.pos, p.v); d += (k ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1) + ' '; });
                    for (let k = loSeg.length - 1; k >= 0; k--) { const [px, py] = ptOf(loSeg[k].pos, loSeg[k].v); d += 'L' + px.toFixed(1) + ',' + py.toFixed(1) + ' '; }
                    d += 'Z';
                    return <path key={'fc' + i} d={d} fill={color} fillOpacity={fcFillOp(i)} stroke="none" />;
                  });
                  if (ciHatch && hiOuter != null && loOuter != null) {
                    const hiSeg = withCI.map((p) => ({ pos: p.pos, v: factor * +p.ci[hiOuter] })).filter((p) => !isNaN(p.v));
                    const loSeg = withCI.map((p) => ({ pos: p.pos, v: factor * +p.ci[loOuter] })).filter((p) => !isNaN(p.v));
                    if (hiSeg.length >= 2 && loSeg.length >= 2) {
                      let d = '';
                      hiSeg.forEach((p, k) => { const [px, py] = ptOf(p.pos, p.v); d += (k ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1) + ' '; });
                      for (let k = loSeg.length - 1; k >= 0; k--) { const [px, py] = ptOf(loSeg[k].pos, loSeg[k].v); d += 'L' + px.toFixed(1) + ',' + py.toFixed(1) + ' '; }
                      d += 'Z';
                      ciHatchNode = <path d={d} fill={`url(#${patId})`} stroke="none" />;
                    }
                  }
                } else if (fcMode === 'line') {
                  const cols = [...fcBelow.map((c, i) => ({ c, i })), ...fcAbove.map((c, i) => ({ c, i }))];
                  ciNodes = cols.map(({ c, i }, k) => {
                    const seg = withCI.map((p) => ({ pos: p.pos, v: factor * +p.ci[c] })).filter((p) => !isNaN(p.v));
                    if (seg.length < 2) return null;
                    let d = '';
                    seg.forEach((p, j) => { const [px, py] = ptOf(p.pos, p.v); d += (j ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1) + ' '; });
                    return <path key={'fcl' + k} d={d} fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={fcStrokeOp(i)} strokeDasharray={dash || '3 3'} />;
                  });
                } else {
                  // Moustaches POINTILLÉES (mode 'none') : cohérentes avec la vraie
                  // série (moustaches), en pointillé pour signaler la projection.
                  const sel = subsample(withCI, 8);
                  const cols = [...fcBelow.map((c, i) => ({ c, i })), ...fcAbove.map((c, i) => ({ c, i }))];
                  ciNodes = sel.map((p, k) => {
                    const [cx, cy] = ptOf(p.pos, p.val);
                    return (
                      <g key={'fw' + k}>
                        {cols.map(({ c, i }, j) => {
                          const v = factor * +p.ci[c]; if (isNaN(v)) return null;
                          const [mx, my] = ptOf(p.pos, v);
                          const op = fcStrokeOp(i);
                          return (
                            <g key={j}>
                              <line x1={cx} y1={cy} x2={mx} y2={my} stroke={color} strokeWidth={1.2} strokeOpacity={op} strokeDasharray="3 3" />
                              {horizontal
                                ? <line x1={mx} y1={my - 4} x2={mx} y2={my + 4} stroke={color} strokeWidth={1.4} strokeOpacity={op} strokeDasharray="2 2" />
                                : <line x1={mx - 4} y1={my} x2={mx + 4} y2={my} stroke={color} strokeWidth={1.4} strokeOpacity={op} strokeDasharray="2 2" />}
                            </g>
                          );
                        })}
                      </g>
                    );
                  });
                }
              }
            }

            let dPath = '';
            g.rows.forEach((r) => { const [px, py] = ptOf(r[posKey], factor * +r[valKey]); if (isNaN(px) || isNaN(py)) return; dPath += (dPath ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1) + ' '; });
            // Marqueurs de distinction : sous-échantillonnés (comme la vraie série).
            const markerRows = (vis.hueMarker || vis.distMarker) ? subsample(g.rows, 13) : [];
            const markerNodes = (vis.hueMarker || vis.distMarker)
              ? markerRows.map((r, k) => {
                const [mx, my] = ptOf(r[posKey], factor * +r[valKey]);
                if (isNaN(mx) || isNaN(my)) return null;
                return (
                  <g key={k} transform={`translate(${mx},${my})`}>
                    {vis.hueMarker && <path d={markerPath(vis.hueMarker, 40)} fill={color} stroke="white" strokeWidth={0.9} />}
                    {vis.distMarker && (
                      <path
                        d={markerPath(vis.distMarker, vis.hueMarker ? 16 : 34)}
                        fill={vis.hueMarker ? 'white' : color} stroke={vis.hueMarker ? color : 'white'} strokeWidth={vis.hueMarker ? 1.1 : 0.9}
                      />
                    )}
                  </g>
                );
              })
              : null;
            return (
              <g key={g.key}>
                {ciHatch && <defs><HatchPatterns combos={[{ id: patId, type: ciHatch, color, opacity: 0.7, strokeWidth: 1.3 }]} /></defs>}
                {ciNodes}
                {ciHatchNode}
                <path d={dPath} fill="none" stroke={vis.color} strokeWidth={2} strokeDasharray={dash || undefined} strokeLinejoin="round" strokeLinecap="round" />
                {markerNodes}
              </g>
            );
          }
          // bar : marque à la pointe de chaque valeur ajoutée
          const bw = posScale.bandwidth ? posScale.bandwidth() : 18;
          const barVis = projVisual(g);
          const barMk = replace ? (barVis.hueMarker || 'diamond') : (nHue >= 2 ? PROJ_DIST_MARKER : 'diamond');
          return g.rows.map((r, k) => {
            const basePos = posScale(r[posKey]); if (basePos == null) return null;
            const cc = basePos + bw / 2;
            const [mx, my] = horizontal ? [valScale(factor * +r[valKey]), cc] : [cc, valScale(factor * +r[valKey])];
            return <path key={g.key + k} transform={`translate(${mx},${my})`} d={markerPath(barMk, 42)} fill={barVis.color} stroke="white" strokeWidth={0.9} />;
          });
        })}
      </g>
      <DragBar
        axis={axis} scale={posScale} value={value} draggable={draggable}
        innerWidth={innerWidth} innerHeight={innerHeight} onCommit={onValue}
        color="hsl(var(--chart-bar-projection))" label={label}
      />
    </g>
  );
};

export default BeforeAfterOverlay;
