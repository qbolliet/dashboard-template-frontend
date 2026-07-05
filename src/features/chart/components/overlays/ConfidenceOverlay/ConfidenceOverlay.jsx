// =================================================================
// CONFIDENCE OVERLAY — intervalles de confiance par série
// =================================================================
// Pour chaque série principale, lit dans `config.data` (mêmes colonnes x/y/hue +
// colonnes de bornes) les valeurs des colonnes `below` (du + proche au + loin
// SOUS la série) et `above` (au-DESSUS). Index symétriques below[i]/above[i]
// partagent la même variante visuelle. Quatre modes de rendu (`config.fill`) :
//   'fill' → aire entre la série et chaque borne, opacité décroissant vers
//            l'extérieur (barres → rectangles hachurés) ;
//   'line' → lignes / rectangles d'intensité seule (barres) ;
//   'none' → moustaches autour du point d'origine.
// Gère le dodge (barres juxtaposées, sous-échelle), l'empilage (offsets), le
// facteur de normalisation et l'isolation d'un niveau au survol de légende
// (`ciHover`).

// Importation des modules
import { useId } from 'react';
import { scaleBand } from '@visx/scale';
import {
  seriesKey, groupSeries, xKeyOf, subsample, markerPath,
} from '../../../utils/encoding';
import HatchPatterns from '../../marks/shared/HatchPatterns';
import { resolveData } from '../overlayData';
import './ConfidenceOverlay.scss';

/**
 * Per-series confidence-interval overlay (area / bars / lines / whiskers).
 *
 * @param {object} props
 * @param {object} props.ctx - Projection context (scales, channels, data, chartKind…).
 * @param {object} props.config - Feature config ({ data, below, above, fill, labels }).
 * @param {boolean} [props.mini=false] - Minimap variant (simplified: no hatch/marker).
 * @param {*} [props.hovered] - Hovered series key (fades other series' CI).
 * @param {boolean} [props.voronoiActive] - Whether proximity hover is on.
 * @param {?object} [props.voronoiRow] - Row under the cursor (fades other series).
 * @param {?{value: *}} [props.ciHover] - Hovered CI level (isolates that band).
 * @returns {JSX.Element}
 */
const ConfidenceOverlay = ({ ctx, config, mini = false, hovered, voronoiActive, voronoiRow, ciHover }) => {
  // Déconstruction des paramètres
  const {
    chartKind, x, y, channels, xScale, yScale,
    colorScale, hatchScale, styleScale, markerScale, filteredData, stackOffsets, normFactor,
  } = ctx;
  const { below = [], above = [], fill = 'fill' } = config;
  const data = resolveData(config.data, ctx);

  const horizontal = chartKind === 'bar-h';
  const isLine = chartKind === 'line';
  const isBar = chartKind === 'bar' || chartKind === 'bar-h';
  const posKey = horizontal ? y : x;
  const valKey = horizontal ? x : y;
  const posScale = horizontal ? yScale : xScale;
  const valScale = horizontal ? xScale : yScale;

  // Mode de rendu de l'IC sur les BARRES : 'fill' (Aire) → rectangles hachurés ;
  // 'line' → rectangles distingués par la seule INTENSITÉ ; 'none' → moustaches.
  const barHatch = isBar && fill === 'fill';

  // Index de bornes ordonnés : below (1 = plus proche) + above.
  const bands = [];
  below.forEach((col, i) => bands.push({ col, side: 'below', i, key: `b${i}` }));
  above.forEach((col, i) => bands.push({ col, side: 'above', i, key: `a${i}` }));

  // Lookup CI par clé pos+hue.
  const lookup = new Map();
  for (const r of data) lookup.set(xKeyOf(r[posKey]) + '|' + seriesKey(r, channels), r);

  // Séries principales, triées par position.
  const series = groupSeries(filteredData, channels);
  for (const g of series) {
    g.rows.sort((a, b) => {
      const av = a[posKey], bv = b[posKey];
      return av instanceof Date ? av - bv : (av < bv ? -1 : av > bv ? 1 : 0);
    });
  }

  const ptOf = (pos, val) => (horizontal
    ? [valScale(val), posScale(pos) + (posScale.bandwidth ? posScale.bandwidth() / 2 : 0)]
    : [posScale(pos) + (posScale.bandwidth ? posScale.bandwidth() / 2 : 0), valScale(val)]);

  const uid = 'ci' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const seriesPatId = (gkey) => `${uid}-${gkey.replace(/[^a-z0-9]/gi, '')}-s`;

  // Barres juxtaposées (hue) NON empilées : chaque IC se positionne sur sa barre
  // (même sous-échelle que BarMarks) plutôt que centré entre toutes les barres.
  const seriesKeys = series.map((g) => g.key);
  const barBandwidth = (posScale && posScale.bandwidth) ? posScale.bandwidth() : 18;
  const dodgeBar = isBar && !stackOffsets;
  const subScale = scaleBand({
    domain: seriesKeys, range: [0, barBandwidth], padding: seriesKeys.length > 1 ? 0.12 : 0.2,
  });

  // Empilage : l'IC entoure la série EMPILÉE — on additionne le cumul des séries
  // en dessous à chaque borne (l'IC reste collé au bord supérieur de sa série).
  const stackTopOf = (g, pos) => {
    if (!stackOffsets) return null;
    const o = stackOffsets.get(g.key + '|' + xKeyOf(pos));
    return o ? o.y1 : null;
  };
  const PV = (g, p, raw) => {
    const top = stackTopOf(g, p.pos);
    return top == null ? raw : top + (raw - p.vc);
  };

  // L'IC reprend l'APPARENCE de la série à laquelle il se rapporte ; seule
  // l'opacité distingue les niveaux (hachure, pointillé, marqueur hérités).
  const seriesHatch = (g) => ((!mini && channels.style && hatchScale) ? hatchScale(g.styleVal) : null);
  const seriesDash = (g) => ((channels.style && styleScale) ? styleScale(g.styleVal) : null);
  const seriesMarker = (g) => ((!mini && channels.marker && markerScale) ? markerScale(g.markerVal) : null);

  // Patterns : une hachure par série — mode AIRE (lignes) ou Aire-barres.
  const wantHatch = !mini && ((isLine && fill === 'fill') || barHatch);
  const patterns = [];
  if (wantHatch && channels.style && hatchScale) {
    for (const g of series) {
      const h = hatchScale(g.styleVal);
      if (h) patterns.push({ id: seriesPatId(g.key), type: h, color: colorScale(g.colorVal), opacity: 0.85, strokeWidth: 1.3 });
    }
  }

  // Opacités : bande la + proche du centre = la + intense ; extérieures atténuées.
  const nBands = Math.max(below.length, above.length, 1);
  const fillOpacityFor = (i) => 0.30 * (nBands - i) / nBands + 0.06;
  const strokeOpacityFor = (i) => 0.85 * (nBands - i) / nBands + 0.15;

  // Survol d'un niveau dans la légende → on n'affiche QUE ce niveau.
  const bandLabel = (i) => (config.labels && config.labels.bands && config.labels.bands[i]) || ('±' + (i + 1));
  let isoIndex = null;
  if (ciHover && ciHover.value != null) {
    for (let i = 0; i < nBands; i++) if (bandLabel(i) === ciHover.value) { isoIndex = i; break; }
  }
  const bandHidden = (i) => isoIndex != null && i !== isoIndex;

  // Survol d'une série (légende) ou voronoï actif → les IC des AUTRES séries
  // s'estompent aussi, cohérent avec les marks.
  const seriesFaded = (g) => {
    if (mini) return false;
    if (hovered != null) return !(g.colorVal === hovered || g.styleVal === hovered || g.markerVal === hovered);
    if (voronoiActive && voronoiRow) return seriesKey(voronoiRow, channels) !== g.key;
    return false;
  };

  const rowVals = (row) => lookup.get(xKeyOf(row[posKey]) + '|' + seriesKey(row, channels));

  // Marqueurs (hue = 3) posés le long d'une borne, identiques à ceux de la série.
  const markersAlong = (seg, mType, color, op) => {
    const sel = subsample(seg, 7);
    return sel.map((p, i) => {
      const [mx, my] = ptOf(p.pos, p.vb);
      if (isNaN(mx) || isNaN(my)) return null;
      return (
        <path
          key={'m' + i} transform={`translate(${mx},${my})`} d={markerPath(mType, mini ? 16 : 28)}
          fill={color} fillOpacity={op} stroke="white" strokeWidth={0.6}
        />
      );
    });
  };

  return (
    <g className="chart-ci-overlay" pointerEvents="none">
      {patterns.length > 0 && <defs><HatchPatterns combos={patterns} /></defs>}
      {series.map((g) => {
        const color = colorScale(g.colorVal);
        // Mise à l'échelle de normalisation : quand la barre est active, les
        // bornes d'IC (jeu de données séparé, brut) reçoivent le MÊME coefficient
        // que la série (sa valeur à la barre → 100).
        const factor = normFactor ? normFactor(g.key) : 1;
        // Centre transversal : pour les barres juxtaposées, chaque IC se place SUR
        // sa barre (et non au centre de la bande) — comme en mode aire/ligne.
        const crossCenterOf = (pos) => {
          const basePos = posScale(pos);
          if (basePos == null || isNaN(basePos)) return posScale(pos);
          if (dodgeBar) return basePos + (subScale(g.key) ?? 0) + subScale.bandwidth() / 2;
          return basePos + (posScale.bandwidth ? posScale.bandwidth() / 2 : 0);
        };
        const ptOfW = (pos, val) => (horizontal
          ? [valScale(val), crossCenterOf(pos)]
          : [crossCenterOf(pos), valScale(val)]);
        const faded = seriesFaded(g);
        const dash = seriesDash(g);
        const mType = seriesMarker(g);
        const pts = g.rows.map((r) => {
          const ci = rowVals(r);
          return { pos: r[posKey], vc: +r[valKey], ci };
        }).filter((p) => p.ci);
        if (!pts.length) return null;

        const visBands = bands.filter((b) => !bandHidden(b.i));

        // ── BARRES : un rectangle par borne, du sommet de barre vers la borne.
        //    Juxtaposées → SUR sa barre (dodge) ; empilées → autour du sommet
        //    cumulé (PV). 'fill' = hachuré ; 'line' = intensité seule. ──
        if (isBar && fill !== 'none') {
          const hatch = barHatch ? seriesHatch(g) : null;
          return (
            <g key={g.key} opacity={faded ? 0.12 : 1} style={{ transition: 'opacity 0.18s' }}>
              {pts.map((p, pi) => {
                const basePos = posScale(p.pos); if (basePos == null) return null;
                const cc = dodgeBar
                  ? basePos + (subScale(g.key) ?? 0) + subScale.bandwidth() / 2
                  : basePos + barBandwidth / 2;
                const halfw = (dodgeBar ? subScale.bandwidth() : barBandwidth) * 0.34;
                const a = valScale(PV(g, p, p.vc));
                return (
                  <g key={pi}>
                    {visBands.map((b) => {
                      const vb = valScale(PV(g, p, factor * +p.ci[b.col])); if (isNaN(vb)) return null;
                      const lo = Math.min(a, vb), hi = Math.max(a, vb);
                      const rect = horizontal
                        ? { x: lo, y: cc - halfw, width: hi - lo, height: halfw * 2 }
                        : { x: cc - halfw, y: lo, width: halfw * 2, height: hi - lo };
                      if (barHatch) {
                        return (
                          <g key={b.key}>
                            <rect {...rect} fill={color} fillOpacity={fillOpacityFor(b.i)} stroke="none" />
                            {hatch && <rect {...rect} fill={`url(#${seriesPatId(g.key)})`} stroke="none" />}
                          </g>
                        );
                      }
                      return (
                        <rect
                          key={b.key} {...rect} fill={color} fillOpacity={fillOpacityFor(b.i)}
                          stroke={color} strokeOpacity={strokeOpacityFor(b.i) * 0.5} strokeWidth={0.75}
                        />
                      );
                    })}
                    {mType && (() => {
                      const outer = visBands[visBands.length - 1]; if (!outer) return null;
                      const vb = PV(g, p, factor * +p.ci[outer.col]); if (isNaN(vb)) return null;
                      const [mx, my] = horizontal ? [valScale(vb), cc] : [cc, valScale(vb)];
                      return <path transform={`translate(${mx},${my})`} d={markerPath(mType, 26)} fill={color} stroke="white" strokeWidth={0.6} />;
                    })()}
                  </g>
                );
              })}
            </g>
          );
        }

        // ── AIRE (linechart, fill='fill') ──────────────────────────────────────
        if (isLine && fill === 'fill') {
          const hatch = seriesHatch(g);
          const visBelow = visBands.filter((b) => b.side === 'below').sort((a, b2) => a.i - b2.i);
          const visAbove = visBands.filter((b) => b.side === 'above').sort((a, b2) => a.i - b2.i);
          const outerBelowCol = visBelow.length ? visBelow[visBelow.length - 1].col : (visAbove.length ? visAbove[visAbove.length - 1].col : null);
          const outerAboveCol = visAbove.length ? visAbove[visAbove.length - 1].col : (visBelow.length ? visBelow[visBelow.length - 1].col : null);
          let envD = '', topSeg = [], botSeg = [];
          if (outerAboveCol != null && outerBelowCol != null) {
            topSeg = pts.map((p) => ({ pos: p.pos, vb: PV(g, p, factor * +p.ci[outerAboveCol]) })).filter((p) => !isNaN(p.vb));
            botSeg = pts.map((p) => ({ pos: p.pos, vb: PV(g, p, factor * +p.ci[outerBelowCol]) })).filter((p) => !isNaN(p.vb));
            if (topSeg.length >= 2 && botSeg.length >= 2) {
              topSeg.forEach((p, k) => { const [px, py] = ptOf(p.pos, p.vb); envD += (k ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1) + ' '; });
              for (let k = botSeg.length - 1; k >= 0; k--) { const [px, py] = ptOf(botSeg[k].pos, botSeg[k].vb); envD += 'L' + px.toFixed(1) + ',' + py.toFixed(1) + ' '; }
              envD += 'Z';
            }
          }
          return (
            <g key={g.key} opacity={faded ? 0.12 : 1} style={{ transition: 'opacity 0.18s' }}>
              {visBands.map((b) => {
                const seg = pts.map((p) => ({ pos: p.pos, vc: PV(g, p, p.vc), vb: PV(g, p, factor * +p.ci[b.col]) })).filter((p) => !isNaN(p.vb));
                if (seg.length < 2) return null;
                let d = '';
                seg.forEach((p, k) => { const [px, py] = ptOf(p.pos, p.vb); d += (k ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1) + ' '; });
                for (let k = seg.length - 1; k >= 0; k--) { const [px, py] = ptOf(seg[k].pos, seg[k].vc); d += 'L' + px.toFixed(1) + ',' + py.toFixed(1) + ' '; }
                d += 'Z';
                return <path key={b.key} d={d} fill={color} fillOpacity={fillOpacityFor(b.i)} stroke="none" />;
              })}
              {hatch && envD && <path d={envD} fill={`url(#${seriesPatId(g.key)})`} stroke="none" />}
              {mType && topSeg.length >= 2 && markersAlong(topSeg, mType, color, 0.9)}
              {mType && botSeg.length >= 2 && markersAlong(botSeg, mType, color, 0.9)}
            </g>
          );
        }

        // ── LIGNE (linechart, fill='line') : une ligne par borne, même style que
        //    la série, seule l'opacité varie (extérieur plus pâle). ──
        if (isLine && fill === 'line') {
          return (
            <g key={g.key} opacity={faded ? 0.12 : 1} style={{ transition: 'opacity 0.18s' }}>
              {visBands.map((b) => {
                const seg = pts.map((p) => ({ pos: p.pos, vb: PV(g, p, factor * +p.ci[b.col]) })).filter((p) => !isNaN(p.vb));
                if (seg.length < 2) return null;
                let d = '';
                seg.forEach((p, k) => { const [px, py] = ptOf(p.pos, p.vb); d += (k ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1) + ' '; });
                const op = strokeOpacityFor(b.i);
                return (
                  <g key={b.key}>
                    <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={op} strokeDasharray={dash || undefined} strokeLinejoin="round" />
                    {mType && markersAlong(seg, mType, color, op)}
                  </g>
                );
              })}
            </g>
          );
        }

        // ── MOUSTACHES (fill='none') : une moustache par niveau, héritant
        //    l'apparence de la série (pointillé, marqueur), extérieur plus pâle. ──
        return (
          <g key={g.key} opacity={faded ? 0.12 : 1} style={{ transition: 'opacity 0.18s' }}>
            {pts.map((p, pi) => (
              <g key={pi}>
                {visBands.map((b) => {
                  const vbRaw = PV(g, p, factor * +p.ci[b.col]); if (isNaN(vbRaw)) return null;
                  const [cx, cy] = ptOfW(p.pos, PV(g, p, p.vc));
                  const [mx, my] = ptOfW(p.pos, vbRaw);
                  const op = strokeOpacityFor(b.i);
                  return (
                    <g key={b.key}>
                      <line x1={cx} y1={cy} x2={mx} y2={my} stroke={color} strokeWidth={1.3} strokeOpacity={op} strokeDasharray={dash || undefined} />
                      {mType
                        ? <path transform={`translate(${mx},${my})`} d={markerPath(mType, 30)} fill={color} fillOpacity={op} stroke="white" strokeWidth={0.6} />
                        : (horizontal
                          ? <line x1={mx} y1={my - 4} x2={mx} y2={my + 4} stroke={color} strokeWidth={1.5} strokeOpacity={op} />
                          : <line x1={mx - 4} y1={my} x2={mx + 4} y2={my} stroke={color} strokeWidth={1.5} strokeOpacity={op} />)}
                    </g>
                  );
                })}
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
};

export default ConfidenceOverlay;
