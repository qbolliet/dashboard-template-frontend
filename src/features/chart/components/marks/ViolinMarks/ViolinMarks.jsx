// Importation des modules
import { useId } from 'react';
import { scaleBand } from '@visx/scale';
import { mean } from 'd3-array';
import { groupSeries, seriesKey, PALETTE } from '../../../utils/encoding';
import { epanechnikovKDE } from '../../../utils/kde';
import HatchPatterns from '../shared/HatchPatterns';
import SeriesMarker from '../shared/SeriesMarker';
import './ViolinMarks.scss';

/**
 * Boxplot / quartile statistics of a value list (Tukey 1.5·IQR whiskers clamped
 * to the observed range).
 *
 * @param {Array<number>} vals - Numeric values.
 * @returns {{q1: number, med: number, q3: number, lo: number, hi: number}} Stats.
 */
function statsOf(vals) {
  const sorted = [...vals].sort((a, b) => a - b);
  const q = (p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)))];
  const q1 = q(0.25), med = q(0.5), q3 = q(0.75);
  const iqr = q3 - q1;
  let lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  lo = Math.max(lo, sorted[0]);
  hi = Math.min(hi, sorted[sorted.length - 1]);
  return { q1, med, q3, lo, hi };
}

/**
 * Violin mark renderer: per-category KDE (Epanechnikov) of a continuous
 * variable, with an inner boxplot.
 *
 * The KDE is computed on the BASE scales (xScaleBase/yScaleBase) so it is never
 * recomputed on zoom — the zoomed value scale only repositions the sampled
 * points. `orient` = 'v' (x categorical, y continuous) | 'h' (transposed).
 *
 * Channel grammar (channel count inferred from the active channels):
 *   - color  → dodged violins, one color per value;
 *   - style  → hatch (fill mode) / dashed contour (line mode);
 *   - marker → a symbol at each violin's median.
 * `stack` ≠ 'none' stacks the densities perpendicular to the axis; a binary
 * stacked column splits its two modalities on either side of the axis (split
 * mode), the remaining hues stacking inside each half.
 *
 * @param {object} props
 * @param {Array<object>} props.data - Data rows (long format).
 * @param {string} props.x - x column.
 * @param {string} props.y - y column.
 * @param {?string} props.z - Optional tint column (mean(z) when no color channel).
 * @param {{color: ?string, style: ?string, marker: ?string}} props.channels - Active channel columns.
 * @param {Function} props.xScale - x scale (zoomed).
 * @param {Function} props.yScale - y scale (zoomed).
 * @param {Function} props.xScaleBase - x scale (base/unzoomed, for the KDE).
 * @param {Function} props.yScaleBase - y scale (base/unzoomed, for the KDE).
 * @param {Function} props.colorScale - Color/sequential scale.
 * @param {Function} props.styleScale - Dash-array scale (style channel).
 * @param {Function} props.hatchScale - Hatch-type scale (style channel, fill mode).
 * @param {Function} props.markerScale - Marker-type scale (marker channel).
 * @param {'v'|'h'} [props.orient='v'] - Orientation.
 * @param {'fill'|'line'} [props.fill='fill'] - Fill mode.
 * @param {'none'|'all'|'color'|'style'|'marker'} [props.stack='none'] - Stacking mode.
 * @param {*} [props.hovered] - Hovered channel value, or null.
 * @param {?Array<object>} [props.groups=null] - Pre-computed `groupSeries(data, channels)`
 *   result (mutualisé côté appelant, cf. Chart.jsx) ; recalculé en interne si absent, pour
 *   ne pas casser un usage direct du composant.
 * @returns {JSX.Element}
 */
const ViolinMarks = ({
  data, x, y, z, channels, xScale, yScale, xScaleBase, yScaleBase,
  colorScale, styleScale, hatchScale, markerScale,
  orient = 'v', fill = 'fill', stack = 'none', hovered, groups = null,
}) => {
  // Initialisation des arguments
  const horizontal = orient === 'h';
  const bandKey = horizontal ? y : x;
  const valKey = horizontal ? x : y;
  const bandScale = horizontal ? yScale : xScale;
  const valScale = horizontal ? xScale : yScale;
  // Échelle de valeur PLEINE (domaine non zoomé) : sert au calcul du KDE et à sa
  // normalisation. Le zoom ne fait que REPOSITIONNER les points via `valScale`
  // (zoomée) → la densité n'est jamais recalculée sur le sous-domaine.
  const valScaleBase = (horizontal ? xScaleBase : yScaleBase) || valScale;

  const hueActive = !!channels.color;
  const markerActive = !!channels.marker;
  const isFillMode = fill !== 'line';

  // Colonnes empilées (sélection utilisateur). 'all' → tous les canaux actifs,
  // sinon le seul canal nommé. Ordre canonique : color → style → marker.
  const stackCols = (() => {
    if (!stack || stack === 'none') return [];
    if (stack === 'all') return ['color', 'style', 'marker'].map((c) => channels[c]).filter(Boolean);
    return channels[stack] ? [channels[stack]] : [];
  })();
  const stackActive = stackCols.length > 0;

  // Colonne de SPLIT : la 1re colonne BINAIRE de la liste empilée. Ses deux
  // modalités se répartissent de part et d'autre de l'axe ; toutes les autres
  // séries s'EMPILENT à l'intérieur de chaque côté (cumul perpendiculaire).
  const splitCol = (() => {
    for (const col of stackCols) {
      const seen = new Set();
      for (const r of data) { const v = r[col]; if (v != null) seen.add(String(v)); if (seen.size > 2) break; }
      if (seen.size === 2) return col;
    }
    return null;
  })();
  const splitMode = !!splitCol;

  // Canal (color/style/marker) porteur de la colonne de split → lecture de la
  // modalité directement sur les métadonnées de série.
  const splitChannel = splitCol == null ? null
    : splitCol === channels.color ? 'color'
      : splitCol === channels.style ? 'style'
        : splitCol === channels.marker ? 'marker' : null;
  const seriesSideVal = (g) => (splitChannel ? String(g[splitChannel + 'Val']) : null);

  // Modalités du split (ordre de rencontre) : [0] → gauche, [1] → droite.
  const splitVals = (() => {
    if (!splitCol) return [];
    const seen = new Set(), out = [];
    for (const r of data) {
      const v = r[splitCol];
      if (v == null) continue;
      const s = String(v);
      if (!seen.has(s)) { seen.add(s); out.push(s); }
    }
    return out;
  })();

  // Séries (combinaisons des canaux actifs) — ordre stable.
  const seriesList = groups || groupSeries(data, channels);
  const seriesKeys = seriesList.map((s) => s.key);

  // band → seriesKey → { vals, zs, colorVal, styleVal }
  const grouped = new Map();
  for (const row of data) {
    const bv = row[bandKey];
    if (bv == null) continue;
    const v = +row[valKey];
    if (isNaN(v)) continue;
    const sk = seriesKey(row, channels);
    if (!grouped.has(bv)) grouped.set(bv, new Map());
    const m = grouped.get(bv);
    if (!m.has(sk)) {
      m.set(sk, {
        key: sk, vals: [], zs: [],
        colorVal: channels.color ? row[channels.color] : '__all__',
        styleVal: channels.style ? row[channels.style] : '__all__',
      });
    }
    const g = m.get(sk);
    g.vals.push(v);
    if (z != null && row[z] != null && !isNaN(+row[z])) g.zs.push(+row[z]);
  }

  const bandwidth = bandScale.bandwidth ? bandScale.bandwidth() : 40;

  // Sous-échelle pour le dodge (un slot par série), inactive en split/overlay.
  const dodge = hueActive && !stackActive;
  const subScale = scaleBand({
    domain: seriesKeys,
    range: [0, bandwidth],
    padding: seriesKeys.length > 1 ? 0.12 : 0.25,
  });

  // KDE — epanechnikov, échantillonné sur le domaine PLEIN de la valeur. La
  // grille de 48 échantillons et la bande passante (8 % de l'étendue) sont fixées
  // une fois pour toutes (utils/kde.js), stables au zoom.
  const kde = epanechnikovKDE(valScaleBase.domain());
  const curves = new Map();
  let globalMax = 0;
  for (const [bv, sMap] of grouped) {
    const cm = new Map();
    for (const [sk, g] of sMap) {
      const curve = kde.estimate(g.vals);
      cm.set(sk, curve);
      for (const p of curve) if (p.d > globalMax) globalMax = p.d;
    }
    curves.set(bv, cm);
  }

  // Empilage : densité cumulée maximale par CÔTÉ (somme des KDE des séries
  // présentes d'un même côté à une position de valeur donnée), tous bandeaux
  // confondus — normalise la largeur pour que le côté le plus dense tienne dans
  // la demi-bande. En split, gauche et droite partagent l'échelle ⇒ l'asymétrie
  // des effectifs reste lisible.
  const stackMax = (() => {
    if (!stackActive) return 0;
    let smax = 0;
    for (const [, cm] of curves) {
      const pres = seriesList.filter((g) => (cm.get(g.key) || []).length >= 2);
      if (!pres.length) continue;
      const n = (cm.get(pres[0].key) || []).length;
      const groups = splitMode
        ? splitVals.map((mod) => pres.filter((g) => seriesSideVal(g) === mod))
        : [pres];
      for (const grp of groups) {
        for (let i = 0; i < n; i++) {
          let sum = 0;
          for (const g of grp) { const c = cm.get(g.key); sum += (c && c[i]) ? c[i].d : 0; }
          if (sum > smax) smax = sum;
        }
      }
    }
    return smax;
  })();

  const defaultFill = (PALETTE && PALETTE[0]) || 'hsl(207, 74.4%, 22.9%)';

  // Patterns de hachures (mode plein + canal style) — un <pattern> par
  // (type, couleur). Identité stable via useId.
  const uid = 'vh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const patternDefs = [];
  const hatchById = new Map();
  if (channels.style && hatchScale && isFillMode) {
    const seen = new Map();
    for (const g of seriesList) {
      const type = hatchScale(g.styleVal);
      if (!type) { hatchById.set(g.key, null); continue; }
      const patColor = hueActive ? colorScale(g.colorVal) : defaultFill;
      const pk = type + '|' + patColor;
      let id = seen.get(pk);
      if (!id) { id = uid + '-p' + seen.size; seen.set(pk, id); patternDefs.push({ id, type, color: patColor }); }
      hatchById.set(g.key, id);
    }
  }

  const widthOf = (d, half) => (globalMax > 0 ? (d / globalMax) * half : 0);

  // Géométrie : point (t le long de la valeur, offset perpendiculaire au centre).
  const ptOf = (center, t, off) => (horizontal
    ? [valScale(t), center + off]
    : [center + off, valScale(t)]);

  // Contour d'un violon (symétrique 'both' ou demi-violon 'left'/'right').
  const violinPath = (curve, center, half, side) => {
    if (!curve || curve.length < 2) return '';
    let d = '';
    const sign = side === 'left' ? -1 : 1;
    curve.forEach((p, i) => {
      const w = widthOf(p.d, half);
      const [px, py] = ptOf(center, p.t, side === 'both' ? w : sign * w);
      d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
    });
    if (side === 'both') {
      for (let i = curve.length - 1; i >= 0; i--) {
        const w = widthOf(curve[i].d, half);
        const [px, py] = ptOf(center, curve[i].t, -w);
        d += 'L' + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
      }
    } else {
      for (let i = curve.length - 1; i >= 0; i--) {
        const [px, py] = ptOf(center, curve[i].t, 0);
        d += 'L' + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
      }
    }
    return d + 'Z';
  };

  // Bande d'un violon EMPILÉ : aire comprise entre deux frontières cumulées
  // (innerOff → outerOff, offsets pixels ≥ 0 par rapport au centre). side='both'
  // miroir des deux côtés ; 'left'/'right' un seul côté (demi-violon empilé, split).
  const stackBandPath = (curve, center, innerOff, outerOff, side = 'both') => {
    if (!curve || curve.length < 2) return '';
    const sidePath = (sign) => {
      let d = '';
      curve.forEach((p, i) => {
        const [px, py] = ptOf(center, p.t, sign * outerOff[i]);
        d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
      });
      for (let i = curve.length - 1; i >= 0; i--) {
        const [px, py] = ptOf(center, curve[i].t, sign * innerOff[i]);
        d += 'L' + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
      }
      return d + 'Z ';
    };
    if (side === 'left') return sidePath(-1);
    if (side === 'right') return sidePath(1);
    return sidePath(1) + sidePath(-1);
  };

  // Ligne perpendiculaire (quartile) traversant le violon à la valeur t.
  // side='both' → -half..half ; 'left' → -half..0 ; 'right' → 0..half.
  const crossLine = (center, t, half, color, key, side = 'both') => {
    const o1 = side === 'right' ? 0 : -half;
    const o2 = side === 'left' ? 0 : half;
    const [x1, y1] = ptOf(center, t, o1);
    const [x2, y2] = ptOf(center, t, o2);
    return (
      <line
        key={key}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={1.1}
        strokeDasharray="3 3"
        strokeOpacity={0.75}
      />
    );
  };

  // Boxplot compact (whisker + IQR + médiane), orienté selon l'axe valeur.
  // `markerType` (canal marqueur) remplace l'indicateur de médiane par un symbole.
  const boxInner = (center, st, half, color, key, markerType) => {
    const boxHalf = Math.min(half * 0.16, 7);
    const wLo = ptOf(center, st.lo, 0), wHi = ptOf(center, st.hi, 0);
    const boxFill = isFillMode ? 'white' : color;
    const boxFillOp = isFillMode ? 0.9 : 1;
    const [medX, medY] = ptOf(center, st.med, 0);
    let boxRect, medMark;
    if (horizontal) {
      boxRect = (
        <rect
          x={Math.min(valScale(st.q1), valScale(st.q3))} y={center - boxHalf}
          width={Math.abs(valScale(st.q3) - valScale(st.q1))} height={boxHalf * 2}
          fill={boxFill} fillOpacity={boxFillOp} stroke={color} strokeWidth={1}
        />
      );
    } else {
      boxRect = (
        <rect
          x={center - boxHalf} y={Math.min(valScale(st.q1), valScale(st.q3))}
          width={boxHalf * 2} height={Math.abs(valScale(st.q3) - valScale(st.q1))}
          fill={boxFill} fillOpacity={boxFillOp} stroke={color} strokeWidth={1}
        />
      );
    }
    // Indicateur de médiane : symbole différenciant (canal marqueur) ou trait.
    if (markerType) {
      medMark = <SeriesMarker type={markerType} x={medX} y={medY} size={70} fill={color} strokeWidth={1.4} />;
    } else if (horizontal) {
      medMark = (
        <line
          x1={valScale(st.med)} x2={valScale(st.med)} y1={center - boxHalf} y2={center + boxHalf}
          stroke={isFillMode ? color : 'white'} strokeWidth={1.8} strokeLinecap="round"
        />
      );
    } else {
      medMark = (
        <line
          x1={center - boxHalf} x2={center + boxHalf} y1={valScale(st.med)} y2={valScale(st.med)}
          stroke={isFillMode ? color : 'white'} strokeWidth={1.8} strokeLinecap="round"
        />
      );
    }
    return (
      <g key={key}>
        <line
          x1={wLo[0]} y1={wLo[1]} x2={wHi[0]} y2={wHi[1]}
          stroke={isFillMode ? 'white' : color} strokeWidth={1.4} strokeOpacity={isFillMode ? 0.85 : 0.9}
        />
        {boxRect}
        {medMark}
      </g>
    );
  };

  // Classe du GROUPE de série (estompage au survol) — le modificateur d'épaisseur
  // de trait vit sur le <path> du corps, PAS ici : appliqué au <g>, il serait
  // hérité par les traits du boxplot et écraserait leurs largeurs (attribut de
  // présentation < CSS).
  const seriesClass = (faded) => (faded ? 'chart-marks-series is-faded' : 'chart-marks-series');
  const bodyClass = 'chart-marks-violin-body'
    + (isFillMode ? ' chart-marks-violin-body--fill' : ' chart-marks-violin-body--line');

  return (
    <g className="chart-marks-violin">
      <HatchPatterns combos={patternDefs.map((d) => ({ ...d, opacity: 0.7, strokeWidth: 1.4 }))} />
      {[...grouped].map(([bv, sMap]) => {
        const bandPosRaw = bandScale(bv);
        // Bande hors du domaine zoomé (zoom catégoriel) → non dessinée.
        if (bandPosRaw == null || isNaN(bandPosRaw)) return null;
        const bandStart = bandPosRaw;
        const bandCenter = bandStart + bandwidth / 2;
        const cm = curves.get(bv) || new Map();
        const present = seriesList.filter((g) => sMap.has(g.key) && (cm.get(g.key) || []).length >= 2);

        return (
          <g key={bv}>
            {stackActive ? (() => {
              // EMPILAGE. Chaque côté (gauche/droite en split, sinon un seul côté
              // miroir) empile ses séries : chacune occupe la tranche [cumul
              // précédent, cumul + sa densité], normalisée sur stackMax (commun
              // aux deux côtés). Un seul violon sur un côté ⇒ on dessine en plus
              // ses quartiles ; sinon l'aire empilée parle d'elle-même.
              const half = bandwidth * 0.46;
              const smax = stackMax || 1;
              const sides = splitMode
                ? [{ name: 'left', mod: splitVals[0] }, { name: 'right', mod: splitVals[1] }]
                : [{ name: 'both', mod: null }];
              return sides.map(({ name, mod }) => {
                const sideSeries = present.filter((g) => mod == null || seriesSideVal(g) === mod);
                if (!sideSeries.length) return null;
                const n = (cm.get(sideSeries[0].key) || []).length;
                let running = new Array(n).fill(0);
                const singleOnSide = sideSeries.length === 1;
                return (
                  <g key={name}>
                    {sideSeries.map((gMeta) => {
                      const g = sMap.get(gMeta.key);
                      const curve = cm.get(gMeta.key) || [];
                      const innerVals = running.slice();
                      const outerVals = running.map((v, i) => v + ((curve[i]) ? curve[i].d : 0));
                      running = outerVals;
                      const innerOff = innerVals.map((v) => (v / smax) * half);
                      const outerOff = outerVals.map((v) => (v / smax) * half);
                      const color = hueActive
                        ? colorScale(gMeta.colorVal)
                        : (z != null && g.zs.length ? colorScale(mean(g.zs)) : defaultFill);
                      const dash = (!isFillMode && channels.style) ? styleScale(gMeta.styleVal) : null;
                      const hatchId = hatchById.get(gMeta.key);
                      const isFaded = hovered != null && hovered !== gMeta.colorVal && hovered !== gMeta.styleVal;
                      const dPath = stackBandPath(curve, bandCenter, innerOff, outerOff, name);
                      const st = singleOnSide ? statsOf(g.vals) : null;
                      const markerType = markerActive ? markerScale(gMeta.markerVal) : null;
                      const qColor = isFillMode ? 'rgba(20,20,20,.7)' : color;
                      // Marque de série (canal marqueur) — TOUJOURS visible, posée
                      // à la médiane au milieu de la tranche empilée, pour distinguer
                      // les séries même empilées (3 canaux hue) sans survol.
                      const markerEl = markerType ? (() => {
                        const sortedV = [...g.vals].sort((a, b) => a - b);
                        const med = sortedV[Math.floor(sortedV.length / 2)];
                        let bi = 0, bd = Infinity;
                        for (let i = 0; i < curve.length; i++) {
                          const dd = Math.abs(curve[i].t - med);
                          if (dd < bd) { bd = dd; bi = i; }
                        }
                        const midMag = ((innerOff[bi] || 0) + (outerOff[bi] || 0)) / 2;
                        const sign = name === 'left' ? -1 : 1;
                        const [mx, my] = ptOf(bandCenter, med, sign * midMag);
                        return <SeriesMarker type={markerType} x={mx} y={my} size={70} fill={color} strokeWidth={1.4} />;
                      })() : null;
                      return (
                        <g key={gMeta.key} className={seriesClass(isFaded)}>
                          <path
                            className={bodyClass}
                            d={dPath}
                            fill={isFillMode ? color : 'none'}
                            fillOpacity={isFillMode ? 0.72 : 0}
                            stroke={color}
                            strokeDasharray={dash || undefined}
                            strokeLinejoin="round"
                          />
                          {isFillMode && hatchId && (
                            <path d={dPath} fill={`url(#${hatchId})`} stroke="none" pointerEvents="none" />
                          )}
                          {st && [
                            crossLine(bandCenter, st.q1, half, qColor, 'q1', name),
                            crossLine(bandCenter, st.med, half, isFillMode ? 'rgba(20,20,20,.9)' : color, 'md', name),
                            crossLine(bandCenter, st.q3, half, qColor, 'q3', name),
                          ]}
                          {markerEl}
                        </g>
                      );
                    })}
                  </g>
                );
              });
            })() : present.map((gMeta) => {
              const g = sMap.get(gMeta.key);
              const curve = cm.get(gMeta.key) || [];
              const isFaded = hovered != null && hovered !== gMeta.colorVal && hovered !== gMeta.styleVal;
              const color = hueActive
                ? colorScale(gMeta.colorVal)
                : (z != null && g.zs.length ? colorScale(mean(g.zs)) : defaultFill);

              // Pas d'empilage : dodge côte à côte si canal couleur actif, sinon un
              // violon symétrique centré sur la bande.
              let center, half;
              if (dodge) {
                const slot = subScale.bandwidth();
                center = bandStart + (subScale(gMeta.key) ?? 0) + slot / 2;
                half = slot * 0.46;
              } else {
                center = bandCenter; half = bandwidth * 0.46;
              }

              const st = statsOf(g.vals);
              const dash = (!isFillMode && channels.style) ? styleScale(gMeta.styleVal) : null;
              const markerType = markerActive ? markerScale(gMeta.markerVal) : null;
              const hatchId = hatchById.get(gMeta.key);
              const fOpacity = isFillMode ? 0.7 : 0;

              return (
                <g key={gMeta.key} className={seriesClass(isFaded)}>
                  <path
                    className={bodyClass}
                    d={violinPath(curve, center, half, 'both')}
                    fill={isFillMode ? color : 'none'}
                    fillOpacity={fOpacity}
                    stroke={color}
                    strokeDasharray={dash || undefined}
                    strokeLinejoin="round"
                  />
                  {isFillMode && hatchId && (
                    <path d={violinPath(curve, center, half, 'both')} fill={`url(#${hatchId})`} stroke="none" pointerEvents="none" />
                  )}
                  {boxInner(center, st, half, color, 'box', markerType)}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

export default ViolinMarks;
