'use client';
/* ═══════════════════════════════════════════════════════════════════════════
   MultiChart.jsx — <MultiChart>
   Branche « data = liste de jeux » du composant <Chart>. Activée quand `data`
   n'est PAS un Array<Row> mais un Array<Dataset> (cf. isDatasetList) :
     Dataset = { label, data, hue?, fill?, stack?, 'categorical-x'?, 'categorical-y'? }
   Les arguments hue / fill / stack de <Chart> servent de DÉFAUT (resolveDatasets).

   COORDINATION DES CANAUX (couleur / trait / marqueur) ENTRE JEUX
   ───────────────────────────────────────────────────────────────
   Une échelle GLOBALE par canal, indexée par (colonne · valeur). Deux jeux qui
   partagent la même COLONNE de hue au même niveau partagent le rendu (« France »
   = même couleur dans les deux). Colonnes disjointes ⇒ plages disjointes de la
   palette. Un jeu SANS canal couleur reçoit malgré tout une couleur de base
   distincte (clé synthétique #ds{i}).

   ORDRE DE TRACÉ : le 1er jeu de la liste est DEVANT (peint en dernier). Les
   axes, la légende (sections par jeu) et le survol composent tous les jeux sur
   un repère commun.

   Découpage largeur-indépendant / largeur-dépendant, sur le modèle du pivot
   <Chart> : <MultiChart> résout les jeux, les échelles de canaux coordonnées et
   la légende ; <MultiChartCanvas> (dans <ParentSize>) gère la géométrie, les
   échelles de position, les marks, le survol, les mini-vues et le zoom.
═══════════════════════════════════════════════════════════════════════════ */

// Importation des modules
import { useEffect, useId, useRef, useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { scaleTime, scaleLinear, scaleBand, scaleOrdinal } from '@visx/scale';
import { extent, mean } from 'd3-array';
import { color as d3color } from 'd3-color';

import { resolveDatasets, channelsFor } from '../../utils/datasetList';
import { detectType, coerce } from '../../utils/typeDetection';
import {
  PALETTE, LINE_STYLES, HATCH_TYPES, MARKER_TYPES,
  distinctVals, groupSeries, seriesKey, xKeyOf,
} from '../../utils/encoding';
import { buildStacks } from '../../utils/stacking';
import { resolveFormatter } from '../../utils/formatters';
import { measureText, tickCountFor } from '../../utils/measureText';
import { exportSvg, exportPng } from '../../utils/exportImage';
import { restrictScale, axisZoomFactors, zoomTransformOf } from '../../hooks/useBrushZoom';

import ChartAxisBottom from '../ChartAxis/ChartAxisBottom/ChartAxisBottom';
import ChartAxisLeft from '../ChartAxis/ChartAxisLeft/ChartAxisLeft';
import LineMarks from '../marks/LineMarks/LineMarks';
import HatchPatterns from '../marks/shared/HatchPatterns';
import SeriesMarker from '../marks/shared/SeriesMarker';
import { VoronoiOverlay, DirectHoverOverlay, ActiveMark } from '../overlays/HoverOverlays/HoverOverlays';
import ChartTooltip from '../ChartTooltip/ChartTooltip';
import ChartToolbar from '../ChartToolbar/ChartToolbar';
import BrushMinimap from '../ChartMinimap/BrushMinimap/BrushMinimap';
import MinimapToggle from '../ChartMinimap/MinimapToggle/MinimapToggle';
import MultiLegend from './MultiLegend/MultiLegend';
import '../Chart/Chart.scss';
import './MultiChart.scss';

// Séparateur synthétique des clés d'échelle de canal (colonne · valeur) : le
// caractère de contrôle NUL (0x00), absent de tout libellé affichable — évite
// toute collision entre « colA + valB » et « colAB + valeur ».
const NUL = String.fromCharCode(0);

// Un jeu se dessine en barres si on force x discret (categorical-x) ou si l'axe
// x est NATURELLEMENT catégoriel.
function isBarLike(ds, xTypeAxis) {
  return ds.catX || xTypeAxis === 'categorical';
}

// Centre pixel d'une valeur x (milieu de bande en catégoriel, projection directe
// sinon).
function centerX(scale, v) {
  if (scale.bandwidth) {
    const p = scale(v);
    return p == null ? NaN : p + scale.bandwidth() / 2;
  }
  return scale(v);
}

/* ───────────────────────── Géométrie des barres continues ─────────────
   Barres positionnées à leur x (axe continu ou catégoriel) avec une largeur
   calculée à partir du plus petit écart pixel entre x distincts. Dodge par
   série (scaleBand), empilage optionnel. Renvoie la liste de rectangles + le
   centre/sommet de chaque barre (réutilisée pour le survol). ─────────────── */
function barGeometry(rows, x, y, channels, xScale, yScale, stack) {
  const seriesList = groupSeries(rows, channels);
  const seriesKeys = seriesList.map((s) => s.key);

  // Regroupement des lignes par x puis par série.
  const byX = new Map();
  for (const r of rows) {
    const xv = r[x];
    if (xv == null) continue;
    const k = xKeyOf(xv);
    if (!byX.has(k)) byX.set(k, { xv, m: new Map() });
    const slot = byX.get(k).m;
    const sk = seriesKey(r, channels);
    if (!slot.has(sk)) slot.set(sk, []);
    slot.get(sk).push(r);
  }

  // Largeur de groupe : plus petit écart pixel entre centres de bandes/points.
  const centers = [...byX.values()].map((o) => centerX(xScale, o.xv)).filter((p) => !isNaN(p)).sort((a, b) => a - b);
  let minGap = Infinity;
  for (let i = 1; i < centers.length; i++) minGap = Math.min(minGap, centers[i] - centers[i - 1]);
  if (!isFinite(minGap)) {
    const rng = xScale.range ? xScale.range() : [0, 200];
    minGap = Math.abs(rng[1] - rng[0]) / Math.max(1, centers.length || 1);
  }
  const bw = xScale.bandwidth ? xScale.bandwidth() : Math.max(4, minGap * 0.72);
  const sub = scaleBand({
    domain: seriesKeys,
    range: [-bw / 2, bw / 2],
    padding: seriesKeys.length > 1 ? 0.12 : 0.08,
  });
  const zero = yScale(0);

  const stk = (stack && stack !== 'none')
    ? buildStacks({ data: rows, posKey: x, valKey: y, channels, stackBy: stack, seriesOrder: seriesKeys, aggregate: 'mean' })
    : null;

  // Ordre de PEINTURE inversé : la 1re série est empilée/rendue en dernier (donc
  // AU-DESSUS), pour que le sommet de chaque barre l'emporte sur le socle de la
  // suivante. Positions inchangées (dodge issu de `seriesKeys`/`sub`, ordre d'origine).
  const paintSeries = [...seriesList].reverse();
  const bars = [];
  for (const { xv, m } of byX.values()) {
    const cx = centerX(xScale, xv);
    if (isNaN(cx)) continue;
    for (const g of paintSeries) {
      const rs = m.get(g.key);
      if (!rs || !rs.length) continue;
      const value = mean(rs, (r) => +r[y]);
      if (value == null || isNaN(value)) continue;
      let vTop, vBot, x0, w;
      if (stk) {
        const o = stk.offsets.get(g.key + '|' + xKeyOf(xv));
        const p0 = o ? yScale(o.y0) : zero;
        const p1 = o ? yScale(o.y1) : yScale(value);
        vTop = Math.min(p0, p1); vBot = Math.max(p0, p1);
        x0 = cx - bw / 2; w = bw;
      } else {
        const p = yScale(value);
        vTop = Math.min(p, zero); vBot = Math.max(p, zero);
        x0 = cx + sub(g.key); w = sub.bandwidth();
      }
      bars.push({
        sk: g.key, meta: g, xv, value,
        x: x0, y: vTop, w, h: Math.max(0, vBot - vTop),
        cx: x0 + w / 2, top: vTop,
        row: { ...rs[0], [y]: value },
      });
    }
  }
  return { bars, max: stk ? stk.max : null };
}

/* ───────────────────────── ContinuousBarMarks ────────────────────────────
   Sous-composant interne : rend les barres d'un jeu « categorical-x » posé sur
   un axe continu (ou catégoriel), en réutilisant HatchPatterns (hachures d'aire)
   et SeriesMarker (marqueur de canal). ────────────────────────────────────── */
const ContinuousBarMarks = ({
  rows, x, y, channels, xScale, yScale,
  colorScale, styleScale, markerScale, hatchScale,
  hovered, fill, stack, mini = false,
}) => {
  const { bars } = barGeometry(rows, x, y, channels, xScale, yScale, stack);

  // Identité stable des <pattern> via useId (aucun compteur de module : impureté
  // de rendu proscrite par react-compiler).
  const uid = 'mb' + useId().replace(/[^a-zA-Z0-9]/g, '');

  // Hachures d'aire (barres pleines + canal style) : un <pattern> par (type,
  // couleur), dédupliqués. En mode « fill » la hachure est blanche translucide
  // (posée sur l'aplat de couleur) ; en mode « line » elle porte la couleur.
  const patternDefs = [];
  const hatchByKey = new Map();
  if (channels.style && hatchScale && fill !== 'none' && !mini) {
    const seen = new Map();
    for (const g of groupSeries(rows, channels)) {
      const type = hatchScale(g.styleVal);
      if (!type) { hatchByKey.set(g.key, null); continue; }
      const color = fill === 'fill' ? '#ffffff' : colorScale(g.colorVal);
      const pk = type + '|' + color;
      let id = seen.get(pk);
      if (!id) { id = uid + '-p' + seen.size; seen.set(pk, id); patternDefs.push({ id, type, color, opacity: fill === 'fill' ? 0.62 : 0.9, strokeWidth: mini ? 1 : 1.5 }); }
      hatchByKey.set(g.key, id);
    }
  }

  const matchHover = (g) => hovered == null || g.colorVal === hovered || g.styleVal === hovered || g.markerVal === hovered;

  return (
    <g className="chart-marks-mbar">
      <HatchPatterns combos={patternDefs} />
      {bars.map((b, i) => {
        const g = b.meta;
        const color = colorScale(g.colorVal);
        const dash = channels.style ? styleScale(g.styleVal) : null;
        const faded = !mini && hovered != null && !matchHover(g);
        const hatchId = hatchByKey.get(g.key);
        if (fill === 'none') {
          const mType = channels.marker ? markerScale(g.markerVal) : 'circle';
          return (
            <g key={i} opacity={faded ? 0.25 : 1}>
              <SeriesMarker type={mType} x={b.cx} y={b.top} size={mini ? 18 : 40} fill={color} strokeWidth={0.8} />
            </g>
          );
        }
        const stroke = fill === 'fill'
          ? (d3color(color) ? d3color(color).darker(0.6).formatHex() : color)
          : color;
        return (
          <g key={i} opacity={faded ? 0.2 : 1} style={{ transition: 'opacity .18s' }}>
            <rect
              x={b.x} y={b.y} width={b.w} height={b.h}
              fill={fill === 'fill' ? color : 'none'}
              stroke={stroke}
              strokeWidth={fill === 'fill' ? (mini ? 0.6 : 1.2) : (mini ? 1 : 1.6)}
              strokeDasharray={(!mini && channels.style && dash) ? dash : undefined} />
            {hatchId && <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={`url(#${hatchId})`} stroke="none" pointerEvents="none" />}
            {!mini && channels.marker && (
              <SeriesMarker type={markerScale(g.markerVal)} x={b.cx} y={(b.y + b.y + b.h) / 2} size={38} fill={color} strokeWidth={0.8} />
            )}
          </g>
        );
      })}
    </g>
  );
};

/* ───────────────────────── Hauteur de l'axe x ─────────────────────────────
   Estimation calquée sur <Chart>/useChartGeometry : prédit la place des libellés
   d'abscisse (rotation éventuelle) pour réserver la marge basse. ─────────────── */
function computeXAxisHeight({ allRows, x, xType, xTypeAxis, innerWidth, format, tickDensity, overlap, maxLines, labels }) {
  const fs = 11;
  let labelsArr = [];
  let tickPx;
  if (xTypeAxis === 'categorical') {
    const fmtX = resolveFormatter(format.x, 'categorical');
    const dom = [...new Set(allRows.map((r) => String(r[x])).filter((v) => v != null))];
    labelsArr = dom.map((t) => String(fmtX(t)));
    tickPx = (innerWidth / Math.max(1, dom.length)) * 0.82;
  } else {
    let s;
    if (xType === 'date') s = scaleTime({ domain: extent(allRows, (r) => coerce(r[x], 'date')), range: [0, innerWidth], nice: true });
    else s = scaleLinear({ domain: extent(allRows.map((r) => +r[x]).filter((v) => !isNaN(v))), range: [0, innerWidth], nice: true });
    const fmtX = resolveFormatter(format.x, xType, xType === 'date' ? s.domain() : null);
    const ticks = s.ticks(tickCountFor(innerWidth, tickDensity));
    labelsArr = ticks.map((t) => String(fmtX(t)));
    tickPx = innerWidth / Math.max(1, ticks.length);
  }
  let strategy = overlap;
  if (strategy === 'auto') {
    const widest = labelsArr.reduce((m, l) => Math.max(m, measureText(l, fs)), 0);
    strategy = widest > tickPx - 6 ? 'rotate' : 'none';
  }
  let lh;
  if (strategy === 'rotate') lh = labelsArr.reduce((m, l) => Math.max(m, measureText(l, fs)), 0) * 0.75 + 8;
  else if (strategy === 'multiline' && xTypeAxis === 'categorical') lh = (maxLines.x || 2) * 13 + 6;
  else lh = 18;
  const ext = 4 + lh;
  return labels.x ? ext + 30 : ext + 10;
}

/* ───────────────────────── MultiChartCanvas (largeur connue) ──────────────── */
const MultiChartCanvas = ({
  width, outerHeight, typedSets, allRows, x, y, xType, yType, xTypeAxis,
  scalesFor, format, labels, maxLabelLength, maxLines, overlap, tickDensity,
  title, expanded, voronoiOn, setVoronoiOn, tooltipsOn, setTooltipsOn, setExpanded,
  hovered, initialMinimapOpen,
}) => {
  const svgRef = useRef(null);
  const [minimapOpen, setMinimapOpen] = useState(initialMinimapOpen);
  const [xSel, setXSel] = useState(null); // sélection COMMITTÉE (relâchement / molette)
  // Geste de brush en cours : les marks basculent sur un rendu en coordonnées de
  // BASE (lignes complètes) déplacé par le transform de preview, et les cibles de
  // survol sont sautées — même mécanisme que <Chart> (cf. useBrushZoom / Chart.jsx).
  const [isBrushing, setIsBrushing] = useState(false);
  const [active, setActive] = useState(null);
  const [activePos, setActivePos] = useState(null);

  // Brouillon de GESTE (preview) : dans une ref, JAMAIS dans un state — un
  // setState par frame re-rendrait les marks (cf. en-tête de useBrushZoom.js) ;
  // le transform est écrit impérativement sur le groupe `previewMarksRef`.
  const draftXRef = useRef(null);
  const previewMarksRef = useRef(null);

  // Commit d'une sélection : pose la valeur ET purge le brouillon de geste (le
  // re-rendu committé reprend la main sur l'attribut transform du groupe).
  const commitXSel = (sel) => { draftXRef.current = null; setXSel(sel); };

  const showXBrush = xTypeAxis !== 'categorical';

  // ── Marges / mesure (calquées sur le prototype) ───────────────────────────
  const legendInline = expanded;
  const marginTop = 16;
  const marginRight = legendInline ? 16 : 26;
  const yTickW = 46;
  const yLabelW = labels.y ? 18 : 0;
  const marginLeft = yTickW + yLabelW + 6;
  const innerWidth = Math.max(40, width - marginLeft - marginRight);

  const xAxisH = computeXAxisHeight({ allRows, x, xType, xTypeAxis, innerWidth, format, tickDensity, overlap, maxLines, labels });

  const minimapH = 44;
  const svgH = outerHeight;
  const minimapXH = (showXBrush && minimapOpen) ? minimapH : 0;
  const miniH = minimapH - 6;
  const innerHeight = Math.max(120, svgH - marginTop - xAxisH - minimapXH - 8);
  const margin = { top: marginTop, right: marginRight, bottom: xAxisH, left: marginLeft };

  // ── Échelle x de base (domaine complet) ───────────────────────────────────
  let baseXScale;
  if (xTypeAxis === 'categorical') {
    const dom = [];
    const seen = new Set();
    for (const ds of typedSets) for (const r of ds.rows) { const v = String(r[x]); if (!seen.has(v)) { seen.add(v); dom.push(v); } }
    baseXScale = scaleBand({ domain: dom, range: [0, innerWidth], padding: 0.18 });
  } else if (xType === 'date') {
    baseXScale = scaleTime({ domain: extent(allRows, (r) => r[x]), range: [0, innerWidth], nice: true });
  } else {
    const vals = allRows.map((r) => +r[x]).filter((v) => !isNaN(v));
    baseXScale = scaleLinear({ domain: extent(vals), range: [0, innerWidth], nice: true });
  }

  // Zoom x (brush / molette) : restreint le domaine continu. Échelle COMMITTÉE,
  // gelée pendant un geste de drag (marks, filtrage, survol, axes).
  const xScale = (xSel && xTypeAxis !== 'categorical') ? restrictScale(baseXScale, xType, xSel) : baseXScale;

  // Transform affine base→committé du calque de preview (x seul : le brush
  // multi-jeux n'existe qu'en x continu). Posé en JSX au début du geste puis
  // réécrit par frame en base→brouillon par `previewXSel` (impératif, hors React).
  const previewTransform = zoomTransformOf(
    axisZoomFactors(baseXScale, xScale, innerWidth, xType),
    { k: 1, t: 0 },
  );

  // Preview de geste : mémorise le brouillon et écrit le transform base→brouillon
  // directement sur le groupe des marks — coût O(1) par frame, aucun rendu React.
  const previewXSel = (sel) => {
    draftXRef.current = sel;
    const xs = sel ? restrictScale(baseXScale, xType, sel) : xScale;
    const t = zoomTransformOf(axisZoomFactors(baseXScale, xs, innerWidth, xType), { k: 1, t: 0 });
    if (previewMarksRef.current) previewMarksRef.current.setAttribute('transform', t);
  };

  // Filtrage par sélection x (continu uniquement).
  const filterRows = (rows) => {
    if (!xSel || xTypeAxis === 'categorical') return rows;
    return rows.filter((r) => { const v = +r[x]; return v >= +xSel[0] && v <= +xSel[1]; });
  };

  // ── Échelle y (valeur) : min/max sur tous les jeux, empilage par jeu ───────
  let lo = Infinity, hi = -Infinity, anchor0 = false;
  for (const ds of typedSets) {
    const ch = channelsFor(ds);
    const rows = filterRows(ds.rows);
    const bar = isBarLike(ds, xTypeAxis);
    const area = ds.fill === 'fill' && !bar;
    if (bar || area) anchor0 = true;
    if (ds.stack && ds.stack !== 'none') {
      const sl = groupSeries(rows, ch).map((s) => s.key);
      const st = buildStacks({ data: rows, posKey: x, valKey: y, channels: ch, stackBy: ds.stack, seriesOrder: sl, aggregate: 'mean' });
      if (st) { hi = Math.max(hi, st.max); lo = Math.min(lo, 0); }
    } else {
      for (const r of rows) { const v = +r[y]; if (!isNaN(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    }
  }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (anchor0 && lo > 0) lo = 0;
  if (anchor0 && hi < 0) hi = 0;
  if (lo === hi) hi = lo + 1;
  const yScale = scaleLinear({ domain: [lo, hi], range: [innerHeight, 0], nice: true });

  // ── Couches de marks (1er jeu DEVANT → peint en dernier) ──────────────────
  // Pendant un geste de brush (`isBrushing`), chaque couche est rendue UNE fois
  // depuis les lignes COMPLÈTES en coordonnées de BASE (échelle x de base), puis
  // simplement déplacée par frame via `previewTransform` — le refiltrage et les
  // stacks ne sont recalculés qu'au relâchement (commit de xSel).
  const mXScale = isBrushing ? baseXScale : xScale;
  const layers = typedSets.map((ds) => {
    const scales = scalesFor(ds);
    const rows = isBrushing ? ds.rows : filterRows(ds.rows);
    const bar = isBarLike(ds, xTypeAxis);
    const st = (ds.stack && ds.stack !== 'none')
      ? buildStacks({ data: rows, posKey: x, valKey: y, channels: scales.channels, stackBy: ds.stack, seriesOrder: groupSeries(rows, scales.channels).map((s) => s.key), aggregate: 'mean' })
      : null;
    return { ds, scales, rows, bar, st };
  });

  const markEls = layers.slice().reverse().map(({ ds, scales, rows, bar, st }) => {
    const ch = scales.channels;
    if (bar) {
      return (
        <ContinuousBarMarks
          key={ds.index} rows={rows} x={x} y={y} channels={ch}
          xScale={mXScale} yScale={yScale} colorScale={scales.color} styleScale={scales.style}
          markerScale={scales.marker} hatchScale={scales.hatch} hovered={hovered} fill={ds.fill} stack={ds.stack} />
      );
    }
    return (
      <LineMarks
        key={ds.index} data={rows} x={x} y={y} channels={ch}
        xScale={mXScale} yScale={yScale} colorScale={scales.color} styleScale={scales.style}
        markerScale={scales.marker} hatchScale={scales.hatch} hovered={hovered}
        fill={ds.fill} stack={st} />
    );
  });

  // ── Cibles de survol (tous les jeux) ──────────────────────────────────────
  // Sautées pendant un geste de brush : on ne survole pas en glissant, et cela
  // évite la géométrie de barres + la boucle O(n) par frame (recalculées au
  // relâchement, quand isBrushing repasse à false et xSel est committé).
  const hoverTargets = [];
  if (!isBrushing) {
    for (const { ds, scales, rows, bar, st } of layers) {
      const ch = scales.channels;
      if (bar) {
        const { bars } = barGeometry(rows, x, y, ch, xScale, yScale, ds.stack);
        for (const b of bars) hoverTargets.push({ px: b.cx, py: b.top, row: b.row, ds, scales, hit: { type: 'rect', x: b.x, y: b.y, w: b.w, h: b.h } });
      } else {
        for (const r of rows) {
          let py = yScale(r[y]);
          if (st) { const o = st.offsets.get(seriesKey(r, ch) + '|' + xKeyOf(r[x])); if (o) py = yScale(o.y1); }
          const px = xScale(r[x]);
          if (isNaN(px) || isNaN(py)) continue;
          hoverTargets.push({ px, py, row: r, ds, scales, hit: { type: 'circle', r: 12 } });
        }
      }
    }
  }
  const cleanTargets = hoverTargets.filter((t) => !isNaN(t.px) && !isNaN(t.py));

  const onHoverTarget = (t) => {
    if (!voronoiOn && !tooltipsOn) return;
    if (!t) { setActive(null); setActivePos(null); return; }
    const cx = t.px, cy = t.py;
    const flipX = cx > innerWidth / 2, flipY = cy > innerHeight / 2;
    setActive(t);
    setActivePos({
      x: margin.left + cx + (flipX ? -14 : 14),
      y: margin.top + cy + (flipY ? -20 : 12),
      flipX, flipY,
    });
  };

  // ── Modèle de tooltip (réutilise <ChartTooltip>) ──────────────────────────
  let tipModel = null;
  let activeColor = null;
  let activeMarker = 'circle';
  if (active) {
    const { ds, scales, row } = active;
    const ch = scales.channels;
    const xFmt = resolveFormatter(format.x, xTypeAxis === 'categorical' ? 'categorical' : xType);
    const yFmt = resolveFormatter(format.y, yType);
    const color = scales.color(ch.color ? row[ch.color] : '__all__');
    const marker = ch.marker ? scales.marker(row[ch.marker]) : null;
    const dash = ch.style ? scales.style(row[ch.style]) : null;
    const bar = isBarLike(ds, xTypeAxis);
    activeColor = color;
    activeMarker = marker || 'circle';
    tipModel = {
      title: ds.label,
      // Barres → tuile pleine ; ligne/aire → segment + marqueur.
      glyphSpec: bar ? { kind: 'bar', color, hatch: null, marker: null } : { kind: 'line', color, dash, marker },
      hueRows: ds.hueCols.map((c) => ({ label: c, value: row[c] })),
      valueRows: [
        { label: labels.x || x, value: xFmt(row[x]) },
        { label: labels.y || y, value: yFmt(row[y]) },
      ],
    };
  }

  // ── Zoom molette (axe x continu) ──────────────────────────────────────────
  // Handler recréé à chaque rendu (capture xSel/scales courants) mais rattaché
  // via une ref stable — l'écouteur `wheel` (passive:false, preventDefault) n'est
  // (dé)posé qu'au montage, sans useCallback (react-compiler).
  const applyWheel = (e) => {
    if (xTypeAxis === 'categorical' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = (width || rect.width) / rect.width;
    const px = (e.clientX - rect.left) * sx - margin.left;
    if (px < 0 || px > innerWidth) return;
    const factor = e.deltaY < 0 ? 0.82 : 1 / 0.82;
    const c = +xScale.invert(px);
    let [d0, d1] = (xSel || baseXScale.domain()).map(Number);
    let n0 = c - (c - d0) * factor, n1 = c + (d1 - c) * factor;
    const [b0, b1] = baseXScale.domain().map(Number);
    const bLo = Math.min(b0, b1), bHi = Math.max(b0, b1);
    n0 = Math.max(bLo, n0); n1 = Math.min(bHi, n1);
    if (n1 - n0 >= (bHi - bLo) * 0.985) { commitXSel(null); return; }
    if (n1 - n0 < (bHi - bLo) * 0.02) return;
    commitXSel(xType === 'date' ? [new Date(n0), new Date(n1)] : [n0, n1]);
  };
  const wheelRef = useRef(applyWheel);
  useEffect(() => { wheelRef.current = applyWheel; });
  useEffect(() => {
    const el = svgRef.current;
    if (!el || xTypeAxis === 'categorical') return undefined;
    // `passive: false` : preventDefault empêche le scroll de la page pendant le zoom.
    const handler = (e) => { e.preventDefault(); wheelRef.current(e); };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [xTypeAxis]);

  // ── Contenu de la mini-vue (réplique miniature) ───────────────────────────
  const yMini = yScale.copy().range([miniH, 0]);
  const xMiniContent = (
    <>
      {typedSets.slice().reverse().map((ds) => {
        const scales = scalesFor(ds);
        const ch = scales.channels;
        const bar = isBarLike(ds, xTypeAxis);
        if (bar) {
          return (
            <ContinuousBarMarks
              key={ds.index} rows={ds.rows} x={x} y={y} channels={ch}
              xScale={baseXScale} yScale={yMini} colorScale={scales.color} styleScale={scales.style}
              markerScale={scales.marker} hatchScale={scales.hatch} fill={ds.fill} stack={ds.stack} mini />
          );
        }
        const st = (ds.stack && ds.stack !== 'none')
          ? buildStacks({ data: ds.rows, posKey: x, valKey: y, channels: ch, stackBy: ds.stack, seriesOrder: groupSeries(ds.rows, ch).map((s) => s.key), aggregate: 'mean' })
          : null;
        return (
          <LineMarks
            key={ds.index} data={ds.rows} x={x} y={y} channels={ch}
            xScale={baseXScale} yScale={yMini} colorScale={scales.color} styleScale={scales.style}
            markerScale={scales.marker} hatchScale={scales.hatch} fill={ds.fill} stack={st} mini />
        );
      })}
    </>
  );

  const clipId = 'mclip-' + useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <>
      <ChartToolbar
        expanded={expanded} onExpand={() => setExpanded((e) => !e)}
        voronoi={voronoiOn} onVoronoi={() => setVoronoiOn((v) => !v)}
        tooltips={tooltipsOn} onTooltips={() => setTooltipsOn((t) => !t)}
        onReset={() => commitXSel(null)} canReset={!!xSel}
        onExportSvg={() => exportSvg(svgRef.current, (title || 'chart') + '.svg')}
        onExportPng={() => exportPng(svgRef.current, (title || 'chart') + '.png')}
      />

        {/* Pas de role="img" : cf. Chart.jsx (pruning des descendants interactifs). */}
        <svg ref={svgRef} className="chart-svg" width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`}>
          <title>{title || 'Graphique'}</title>
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            <ChartAxisLeft
              scale={yScale} type="number" length={innerHeight} width={innerWidth}
              format={format.y} tickDensity={tickDensity} label={labels.y} labelOffset={yTickW + 4} />
            {/* Axe x sur l'échelle COMMITTÉE : gelé pendant un geste de brush,
                recalé au relâchement. */}
            <ChartAxisBottom
              scale={xScale} type={xTypeAxis} length={innerWidth} height={innerHeight}
              format={format.x} maxLabelLength={maxLabelLength.x} maxLines={maxLines.x || 2}
              overlap={overlap} tickDensity={tickDensity} label={labels.x} />
            <defs>
              <clipPath id={clipId}><rect x={0} y={0} width={innerWidth} height={innerHeight} /></clipPath>
            </defs>
            {/* Pendant un geste de brush, les marks (en coordonnées de base) sont
                déplacés par le transform de preview — la valeur JSX (base→committé)
                est posée au début du geste puis réécrite par frame via
                previewMarksRef ; .chart-zoom-content garde les traits à épaisseur
                constante (vector-effect, cf. Chart.scss).
                Les deux <g> sont indispensables : un clip-path est résolu dans le
                repère de l'élément qui le référence, APRÈS son propre transform —
                clip et transform sur le même <g> feraient zoomer la découpe. */}
            <g clipPath={`url(#${clipId})`}>
              <g
                ref={previewMarksRef}
                className={isBrushing ? 'chart-zoom-content' : undefined}
                transform={isBrushing ? previewTransform : undefined}
              >
                {markEls}
              </g>
            </g>

            {voronoiOn && cleanTargets.length > 0 && (
              <VoronoiOverlay points={cleanTargets} innerWidth={innerWidth} innerHeight={innerHeight} onHover={onHoverTarget} />
            )}
            {!voronoiOn && tooltipsOn && cleanTargets.length > 0 && (
              <DirectHoverOverlay targets={cleanTargets} onHover={onHoverTarget} />
            )}
            {active && (voronoiOn || tooltipsOn) && (
              <ActiveMark pos={{ x: active.px, y: active.py }} color={activeColor} marker={activeMarker} />
            )}
          </g>

          {/* Mini-vue x — placée par la prop `transform` de BrushMinimap (posée sur son
              <g> racine) */}
          {showXBrush && minimapOpen && (
            <BrushMinimap
              direction="x"
              transform={`translate(${margin.left}, ${margin.top + innerHeight + margin.bottom + 8})`}
              width={innerWidth} height={miniH} scale={baseXScale}
              selection={xSel} onChange={commitXSel} onPreview={previewXSel}
              content={xMiniContent} onBrushingChange={setIsBrushing}
            />
          )}
        </svg>

        {/* Pastille de bascule, ancrée sur le centre du titre de l'axe x (PAS 50 %
            du body, aux marges asymétriques) juste sous le svg — le centrage
            effectif est fait en CSS par MinimapToggle.scss (cf. Chart.jsx). */}
        {showXBrush && (
          <MinimapToggle
            open={minimapOpen}
            direction="x"
            onToggle={() => setMinimapOpen((o) => !o)}
            style={{
              left: margin.left + innerWidth / 2,
              top: `calc(${svgH}px + var(--chart-minimap-toggle-offset))`,
            }}
          />
        )}

        {tooltipsOn && active && activePos && tipModel && (
          <ChartTooltip model={tipModel} position={activePos} />
        )}
    </>
  );
};

/* ───────────────────────── MultiChart (largeur-indépendant) ───────────────── */

/**
 * Multi-dataset chart. Renders an Array<Dataset> onto a shared frame: shared
 * axes, cross-dataset coordinated channel scales, per-dataset fill/stack, and one
 * legend section per dataset. The first dataset of the list is drawn in front.
 * Delegated to by <Chart> when `data` is a dataset list (see isDatasetList).
 *
 * @param {object} props
 * @param {Array<object>} props.data - Dataset descriptors ({ label, data, hue?, fill?,
 *   stack?, 'categorical-x'?, 'categorical-y'? }).
 * @param {string} props.x - Abscissa column (shared by every dataset).
 * @param {string} props.y - Ordinate column (required, shared).
 * @param {string|string[]} [props.hue] - Default hue column(s) for datasets that omit it.
 * @param {'none'|'line'|'fill'} [props.fill='line'] - Default fill mode.
 * @param {'none'|'color'|'style'|'marker'|'all'} [props.stack='none'] - Default stacking.
 * @param {object} [props.format] - { x?, y? } d3 spec or function.
 * @param {object} [props.labels] - { x?, y? } axis labels.
 * @param {object} [props.maxLabelLength] - { x? } categorical ellipsis.
 * @param {object} [props.maxLines] - { x? } multiline max lines.
 * @param {'auto'|'rotate'|'multiline'|'skip'} [props.overlap='auto'] - Anti-overlap strategy.
 * @param {'sparse'|'normal'|'dense'} [props.tickDensity='normal'] - Tick density.
 * @param {string} [props.title] - Chart title.
 * @param {number} [props.height=460] - Outer height (px).
 * @param {object} [props.defaults={}] - Initial frame state ({ expanded?, voronoi?,
 *   tooltips?, minimaps? }).
 * @returns {JSX.Element}
 */
const MultiChart = ({
  data, x, y, hue, fill = 'line', stack = 'none',
  format = {}, labels = {}, maxLabelLength = {}, maxLines = {},
  overlap = 'auto', tickDensity = 'normal',
  title, height = 460, defaults = {},
}) => {
  // Hooks AVANT tout retour/throw anticipé (règles des hooks).
  const [expanded, setExpanded] = useState(!!defaults.expanded);
  const [voronoiOn, setVoronoiOn] = useState(!!defaults.voronoi);
  const [tooltipsOn, setTooltipsOn] = useState(defaults.tooltips != null ? !!defaults.tooltips : true);
  const [hovered, setHovered] = useState(null);

  if (!y) throw new Error("<Chart>: l'argument `y` est requis.");

  // ── Jeux résolus + types d'axes partagés ──────────────────────────────────
  const datasets = resolveDatasets(data, fill, stack, hue);
  const rawRows = datasets.flatMap((d) => d.rows);
  const xType = detectType(rawRows.map((r) => r[x]));
  const yType = detectType(rawRows.map((r) => r[y]));

  // Type d'AXE x : catégoriel si naturellement catégoriel OU si TOUS les jeux
  // forcent categorical-x. Sinon l'axe reste continu (les jeux catX se dessinent
  // en barres sur l'axe continu).
  let xTypeAxis = xType;
  if (xType === 'categorical' || (datasets.length && datasets.every((d) => d.catX))) xTypeAxis = 'categorical';

  // Coercition par jeu (dates / nombres).
  const typedSets = datasets.map((ds) => ({
    ...ds,
    rows: ds.rows.map((r) => ({
      ...r,
      [x]: xTypeAxis === 'categorical' ? String(r[x] ?? '') : coerce(r[x], xType),
      [y]: coerce(r[y], yType),
    })),
  }));
  const allRows = typedSets.flatMap((d) => d.rows);

  // ── Échelles de canaux coordonnées (globales, par rôle, indexées col·valeur) ──
  const dom = { color: [], style: [], marker: [] };
  for (const ds of typedSets) {
    const ch = channelsFor(ds);
    if (ch.color) {
      for (const v of distinctVals(ds.rows, ch.color)) {
        const k = ch.color + NUL + String(v);
        if (!dom.color.includes(k)) dom.color.push(k);
      }
    } else {
      dom.color.push('#ds' + ds.index);
    }
    for (const role of ['style', 'marker']) {
      const col = ch[role];
      if (!col) continue;
      for (const v of distinctVals(ds.rows, col)) {
        const k = col + NUL + String(v);
        if (!dom[role].includes(k)) dom[role].push(k);
      }
    }
  }
  const combined = {
    color: scaleOrdinal({ domain: dom.color, range: PALETTE }),
    style: scaleOrdinal({ domain: dom.style, range: LINE_STYLES }),
    hatch: scaleOrdinal({ domain: dom.style, range: HATCH_TYPES }),
    marker: scaleOrdinal({ domain: dom.marker, range: MARKER_TYPES }),
  };

  // Échelles propres à un jeu : wrappers qui préfixent la colonne du rôle.
  const scalesFor = (ds) => {
    const ch = channelsFor(ds);
    const key = (role, v) => (ch[role] || '') + NUL + String(v);
    return {
      channels: ch,
      color: (v) => (ch.color ? combined.color(key('color', v)) : combined.color('#ds' + ds.index)),
      style: (v) => combined.style(key('style', v)),
      hatch: (v) => combined.hatch(key('style', v)),
      marker: (v) => combined.marker(key('marker', v)),
    };
  };

  // ── Légende : une section par jeu ─────────────────────────────────────────
  const sections = typedSets.map((ds) => {
    const scales = scalesFor(ds);
    const ch = scales.channels;
    const bar = isBarLike(ds, xTypeAxis);
    const fillKind = bar ? 'bars' : ds.fill === 'fill' ? 'area' : ds.fill === 'none' ? 'points' : 'line';
    const styleGlyph = (bar || ds.fill === 'fill') ? 'hatch' : 'dash';
    const headColor = ch.color ? scales.color(distinctVals(ds.rows, ch.color)[0]) : scales.color('__all__');
    const groups = [];
    if (ch.color) groups.push({ role: 'color', label: ch.color, items: distinctVals(ds.rows, ch.color).map((v) => ({ value: v, color: scales.color(v) })) });
    if (ch.style) groups.push({ role: 'style', label: ch.style, items: distinctVals(ds.rows, ch.style).map((v) => ({ value: v, color: headColor, dash: scales.style(v), hatch: scales.hatch(v) })) });
    if (ch.marker) groups.push({ role: 'marker', label: ch.marker, items: distinctVals(ds.rows, ch.marker).map((v) => ({ value: v, color: headColor, marker: scales.marker(v) })) });
    return { key: ds.index, label: ds.label, fillKind, styleGlyph, headColor, groups };
  });

  // ── Ouverture des mini-vues par défaut ────────────────────────────────────
  const initialMinimapOpen = defaults.minimaps != null ? !!defaults.minimaps : true;

  const legendInline = expanded;

  return (
    <figure className={`chart-frame${expanded ? ' chart-frame--expanded' : ''}`}>
      <figcaption className="chart-header">
        {title && <h3 className="chart-title">{title}</h3>}
      </figcaption>

      {legendInline && (
        <div className="chart-legend-top">
          <MultiLegend sections={sections} layout="rows" hovered={hovered} onHover={setHovered} />
        </div>
      )}

      <ParentSize
        className="chart-body" parentSizeStyles={{ position: 'relative', width: '100%', minHeight: height }}
        debounceTime={150} enableDebounceLeadingCall
      >
        {({ width }) => (width > 0 ? (
          <MultiChartCanvas
            width={Math.max(320, Math.floor(width))}
            outerHeight={height}
            typedSets={typedSets} allRows={allRows}
            x={x} y={y} xType={xType} yType={yType} xTypeAxis={xTypeAxis}
            scalesFor={scalesFor}
            format={format} labels={labels} maxLabelLength={maxLabelLength} maxLines={maxLines}
            overlap={overlap} tickDensity={tickDensity} title={title}
            expanded={expanded} setExpanded={setExpanded}
            voronoiOn={voronoiOn} setVoronoiOn={setVoronoiOn}
            tooltipsOn={tooltipsOn} setTooltipsOn={setTooltipsOn}
            hovered={hovered}
            initialMinimapOpen={initialMinimapOpen} />
        ) : null)}
      </ParentSize>

      {!legendInline && (
        <aside className="chart-legend-right">
          <MultiLegend sections={sections} layout="column" hovered={hovered} onHover={setHovered} />
        </aside>
      )}
    </figure>
  );
};

export default MultiChart;
