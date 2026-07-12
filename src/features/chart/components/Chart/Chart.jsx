'use client';
/* ═══════════════════════════════════════════════════════════════════════════
   Chart.jsx — <Chart> (composant pivot)
   Détecte le type de graphique depuis les types de colonnes (x/y/z), calcule la
   géométrie et les échelles, câble le renderer de marks adéquat, le survol
   (proximité voronoï / direct), la tooltip, la légende, les mini-vues/brush, le
   zoom molette et la couche features (barre d'outils configurable : intervalles
   de confiance, projection avant/après, normalisation, zoom, mini-vues).

   Répartition de l'état (split pivot / ChartCanvas) :
     • <Chart> (largeur-indépendant) : détection de type, canaux, échelles de
       canaux, état des features (useFeatureState), rôle transform (normalisation
       → typedData), facteur de normalisation, groupes de légende de features,
       étendue de l'axe valeur (augValExtent), état frame-level (agrandissement,
       voronoï, tooltips).
     • <ChartCanvas> (dans <ParentSize>, largeur-dépendant) : géométrie, échelles
       de position, marks, overlays de features, barre d'outils, mini-vues, zoom.

   GARANTIE : aucune feature « transform » active ⇒ typedData === typedDataRaw
   (même référence) ⇒ rendu strictement identique au graphique nu.
═══════════════════════════════════════════════════════════════════════════ */

// Importation des modules
import { useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import { extent, mean } from 'd3-array';

import { isDatasetList } from '../../utils/datasetList';
import { detectType, coerce, detectChart } from '../../utils/typeDetection';
import {
  PALETTE, colorScale, sequentialScale, styleScale, hatchScale, markerScale,
  distinctVals, groupSeries, seriesKey, xKeyOf,
} from '../../utils/encoding';
import { buildStacks } from '../../utils/stacking';
import { resolveFormatter } from '../../utils/formatters';
import { makeScale } from '../../utils/scales';
import { exportSvg, exportPng } from '../../utils/exportImage';
import { useSeriesHover } from '../../hooks/useSeriesHover';
import { useChartGeometry } from '../../hooks/useChartGeometry';
import { useMinimapState, resolveMinimapsVisible } from '../../hooks/useMinimapState';
import { useBrushZoom, zoomTransformOf } from '../../hooks/useBrushZoom';
import { useFeatureState } from '../../hooks/useFeatureState';
import { nextFreeChannel, REAL_DIST_MARKER } from '../../toolbar-features/channelAssign';
import { normalizeRefs } from '../../toolbar-features/normalize';

import ChartAxisBottom from '../ChartAxis/ChartAxisBottom/ChartAxisBottom';
import ChartAxisLeft from '../ChartAxis/ChartAxisLeft/ChartAxisLeft';
import ChannelLegend from '../ChartLegend/ChannelLegend/ChannelLegend';
import SequentialLegend from '../ChartLegend/SequentialLegend/SequentialLegend';
// LineMarks / BarMarks restent STATIQUES : ce sont les types détectés par défaut,
// présents sur quasi toutes les pages, et leurs dépendances (@visx/shape, @visx/scale,
// d3-array, d3-color) sont déjà dans le graphe partagé — les splitter n'éviterait aucune
// lib du bundle initial et ajouterait un flash sur le chemin nominal.
import LineMarks from '../marks/LineMarks/LineMarks';
import BarMarks from '../marks/BarMarks/BarMarks';
import { VoronoiOverlay, DirectHoverOverlay, ActiveMark } from '../overlays/HoverOverlays/HoverOverlays';
import ChartTooltip from '../ChartTooltip/ChartTooltip';
import ChartToolbar from '../ChartToolbar/ChartToolbar';
import BrushMinimap from '../ChartMinimap/BrushMinimap/BrushMinimap';
import MiniProjection from '../ChartMinimap/MiniProjection/MiniProjection';
import MinimapToggle from '../ChartMinimap/MinimapToggle/MinimapToggle';
import './Chart.scss';

/* ────────────────────────── Renderers chargés à la demande ────────────────
   Types rares et/ou lourds : sortis du bundle initial via next/dynamic (chemins
   littéraux, analysables par le bundler). Ils ne sont téléchargés qu'à l'affichage
   effectif du type correspondant.
     • DensityMarks → d3-geo + d3-interpolate + d3-contour (KDE 2-D)
     • ViolinMarks  → d3-contour (KDE Epanechnikov)
     • HeatmapMarks → léger, mais type rare (uniformise le traitement)
     • MultiChart   → utile seulement sur la branche isDatasetList(data)
   ssr: false + fallback null : le squelette (axes/légende) est déjà rendu pendant
   les quelques dizaines de ms de chargement. */
const MultiChart = dynamic(() => import('../MultiChart/MultiChart'), { ssr: false });
const HeatmapMarks = dynamic(() => import('../marks/HeatmapMarks/HeatmapMarks'), { ssr: false });
const DensityMarks = dynamic(() => import('../marks/DensityMarks/DensityMarks'), { ssr: false });
const ViolinMarks = dynamic(() => import('../marks/ViolinMarks/ViolinMarks'), { ssr: false });

/* ────────────────────────── Cibles de survol (coordonnées de BASE) ────────
   Pour line / density, les centroïdes sont calculés UNE fois sur les données
   complètes en coordonnées de base : le diagramme de survol (voronoï) et les
   contours KDE ne sont PAS recalculés au zoom, seulement transformés (cf. la
   couche .chart-zoom-content). Porté de `baseHoverTargets` de chart.jsx. ───── */
function computeBaseHoverTargets({
  chartKind, data, channels, baseXScale, baseYScale, x, y, stackMini,
}) {
  const out = [];
  for (const r of data) {
    let py = baseYScale(r[y]);
    if (stackMini && chartKind === 'line') {
      const o = stackMini.offsets.get(seriesKey(r, channels) + '|' + xKeyOf(r[x]));
      if (o) py = baseYScale(o.y1);
    }
    out.push({ px: baseXScale(r[x]), py, row: r, hit: { type: 'circle', r: 13 } });
  }
  return out.filter((t) => !isNaN(t.px) && !isNaN(t.py));
}

/* ────────────────────────── Cibles de survol ─────────────────────────────
   Centroïdes (déjà projetés en pixels) de chaque mark survolable, calculés par
   type de graphique afin que la tooltip et le surlignage fonctionnent partout.
   Porté de chart.jsx (sans la couche zoom : la v1 traite line/density ici même,
   en coordonnées directes). ─────────────────────────────────────────────── */
function computeHoverTargets({
  chartKind, filteredData, channels, xScale, yScale, x, y, z,
  stack, stackMain, innerWidth, innerHeight, fill, groups,
}) {
  const out = [];

  if (chartKind === 'line' || chartKind === 'density') {
    for (const r of filteredData) {
      let py = yScale(r[y]);
      if (stackMain && chartKind === 'line') {
        const o = stackMain.offsets.get(seriesKey(r, channels) + '|' + xKeyOf(r[x]));
        if (o) py = yScale(o.y1);
      }
      out.push({ px: xScale(r[x]), py, row: r, hit: { type: 'circle', r: 13 } });
    }
  } else if (chartKind === 'bar' || chartKind === 'bar-h') {
    // Barres verticales/horizontales : centroïde au sommet de chaque barre
    // (sommet cumulé en empilage, pointe de la moyenne sinon), zone de survol
    // = rectangle plein de la barre, ou disque au sommet en mode nuage (fill='none').
    const horizontal = chartKind === 'bar-h';
    const bandKey = horizontal ? y : x;
    const valKey = horizontal ? x : y;
    const bandScale = horizontal ? yScale : xScale;
    const valScale = horizontal ? xScale : yScale;
    // `groups` (calculé une fois dans ChartCanvas sur `filteredData`) est partagé
    // avec le rendu des marks bar — fallback si la fonction est appelée hors
    // ChartCanvas.
    const seriesList = groups || groupSeries(filteredData, channels);
    const seriesKeys = seriesList.map((s) => s.key);
    const grouped = new Map();
    for (const row of filteredData) {
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
    const subScale = scaleBand({
      domain: seriesKeys, range: [0, bandwidth], padding: seriesKeys.length > 1 ? 0.12 : 0.2,
    });
    for (const [bv, sMap] of grouped) {
      const bandPos = bandScale(bv) ?? 0;
      for (const g of seriesList) {
        const rows = sMap.get(g.key);
        if (!rows || !rows.length) continue;
        const value = mean(rows, (r) => +r[valKey]);
        if (value == null || isNaN(value)) continue;
        let vStart, vEnd, cross0, crossW, tipVal;
        if (stackMain) {
          const o = stackMain.offsets.get(g.key + '|' + xKeyOf(bv));
          const v0 = o ? valScale(o.y0) : zero;
          const v1 = o ? valScale(o.y1) : valScale(value);
          vStart = Math.min(v0, v1); vEnd = Math.max(v0, v1);
          cross0 = 0; crossW = bandwidth; tipVal = v1;
        } else {
          const vv = valScale(value);
          vStart = Math.min(vv, zero); vEnd = Math.max(vv, zero);
          cross0 = subScale(g.key); crossW = subScale.bandwidth(); tipVal = vv;
        }
        const crossCenter = bandPos + cross0 + crossW / 2;
        let px, py, hit;
        if (fill === 'none') {
          px = horizontal ? tipVal : crossCenter;
          py = horizontal ? crossCenter : tipVal;
          hit = { type: 'circle', r: 12 };
        } else {
          const valMid = (vStart + vEnd) / 2;
          px = horizontal ? valMid : crossCenter;
          py = horizontal ? crossCenter : valMid;
          hit = horizontal
            ? { type: 'rect', x: vStart, y: bandPos + cross0, w: vEnd - vStart, h: crossW }
            : { type: 'rect', x: bandPos + cross0, y: vStart, w: crossW, h: vEnd - vStart };
        }
        out.push({ px, py, row: { ...rows[0], [valKey]: value }, hit });
      }
    }
  } else if (chartKind === 'heatmap') {
    // Heatmap : centroïde au centre de chaque cellule (x, y), zone de survol =
    // rectangle de la cellule (même agrégation par moyenne que HeatmapMarks).
    const cellW = xScale.bandwidth ? xScale.bandwidth() : 20;
    const cellH = yScale.bandwidth ? yScale.bandwidth() : 20;
    const map = new Map();
    for (const row of filteredData) {
      const xv = row[x], yv = row[y], zv = row[z];
      if (xv == null || yv == null || zv == null || isNaN(zv)) continue;
      const k = `${xv}|${yv}`;
      if (!map.has(k)) map.set(k, { x: xv, y: yv, vals: [] });
      map.get(k).vals.push(+zv);
    }
    for (const c of map.values()) {
      const cellX = xScale.bandwidth ? xScale(c.x) : xScale(c.x) - cellW / 2;
      const cellY = yScale.bandwidth ? yScale(c.y) : yScale(c.y) - cellH / 2;
      out.push({
        px: cellX + cellW / 2, py: cellY + cellH / 2,
        row: { [x]: c.x, [y]: c.y, [z]: mean(c.vals) },
        hit: { type: 'rect', x: cellX, y: cellY, w: cellW, h: cellH },
      });
    }
  } else if (chartKind === 'violin-v' || chartKind === 'violin-h') {
    const horizontal = chartKind === 'violin-h';
    const bandKey = horizontal ? y : x;
    const valKey = horizontal ? x : y;
    const bandScale = horizontal ? yScale : xScale;
    const valScale = horizontal ? xScale : yScale;
    const hueActive = !!channels.color;
    // Empilage / split — même grammaire que ViolinMarks.
    const stackCols = (!stack || stack === 'none') ? []
      : (stack === 'all' ? ['color', 'style', 'marker'].map((c) => channels[c]).filter(Boolean)
        : (channels[stack] ? [channels[stack]] : []));
    const stackActiveV = stackCols.length > 0;
    let splitCol = null;
    for (const col of stackCols) {
      const seen = new Set();
      for (const r of filteredData) { const v = r[col]; if (v != null) seen.add(String(v)); if (seen.size > 2) break; }
      if (seen.size === 2) { splitCol = col; break; }
    }
    const splitVals = [];
    if (splitCol) {
      const seen = new Set();
      for (const r of filteredData) {
        const v = r[splitCol]; if (v == null) continue;
        const s = String(v); if (!seen.has(s)) { seen.add(s); splitVals.push(s); }
      }
    }
    const splitMode = !!splitCol;
    // NOTE : ce `groupSeries` opère sur `filteredData` (fenêtre de zoom) pour les
    // cibles de survol, alors que ViolinMarks rend ses violons depuis `data` NON
    // filtré (le zoom ne fait que repositionner le KDE, jamais le recalculer) —
    // les deux calculs portent donc sur des entrées différentes et ne peuvent PAS
    // être mutualisés ; `groups` ci-dessous est bien celui de `filteredData`.
    const seriesList = groups || groupSeries(filteredData, channels);
    const seriesKeys = seriesList.map((s) => s.key);
    const map = new Map();
    for (const row of filteredData) {
      const bv = row[bandKey];
      if (bv == null) continue;
      const v = +row[valKey];
      if (isNaN(v)) continue;
      const sk = seriesKey(row, channels);
      if (!map.has(bv)) map.set(bv, new Map());
      const m = map.get(bv);
      if (!m.has(sk)) m.set(sk, { vals: [], zs: [], sample: row, stackVal: splitCol ? String(row[splitCol]) : null });
      const gg = m.get(sk);
      gg.vals.push(v);
      if (z != null && row[z] != null && !isNaN(+row[z])) gg.zs.push(+row[z]);
    }
    const bandwidth = bandScale.bandwidth ? bandScale.bandwidth() : 40;
    const dodge = hueActive && !stackActiveV;
    const subScale = scaleBand({
      domain: seriesKeys, range: [0, bandwidth], padding: seriesKeys.length > 1 ? 0.12 : 0.25,
    });
    // Centroïde à la médiane de chaque groupe, positionné selon le mode :
    // dodge (slot dédié par série), split (moitié gauche/droite) ou simple
    // (violon centré plein) — même géométrie transversale que ViolinMarks.
    for (const [bv, sMap] of map) {
      const bandStart = bandScale(bv) ?? 0;
      const bandCenter = bandStart + bandwidth / 2;
      const present = seriesList.filter((g) => sMap.has(g.key) && sMap.get(g.key).vals.length >= 1);
      for (const gMeta of present) {
        const gg = sMap.get(gMeta.key);
        const sorted = [...gg.vals].sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length * 0.5)];
        const valPos = valScale(med);
        let center, slotStart, slotW;
        if (dodge) {
          const slot = subScale.bandwidth();
          slotStart = bandStart + (subScale(gMeta.key) ?? 0);
          slotW = slot;
          center = slotStart + slot / 2;
        } else if (splitMode) {
          const leftSide = splitVals.indexOf(gg.stackVal) === 0;
          slotStart = leftSide ? bandStart : bandCenter;
          slotW = bandwidth / 2;
          center = slotStart + slotW / 2;
        } else {
          center = bandCenter; slotStart = bandStart; slotW = bandwidth;
        }
        const px = horizontal ? valPos : center;
        const py = horizontal ? center : valPos;
        const hit = horizontal
          ? { type: 'rect', x: 0, y: slotStart, w: innerWidth, h: slotW }
          : { type: 'rect', x: slotStart, y: 0, w: slotW, h: innerHeight };
        const row = { ...gg.sample, [bandKey]: bv, [valKey]: med };
        if (z != null && gg.zs.length) row[z] = mean(gg.zs);
        out.push({ px, py, row, hit });
      }
    }
  }

  return out.filter((t) => !isNaN(t.px) && !isNaN(t.py));
}

/* ────────────────────────── ChartCanvas (largeur connue) ─────────────────
   Sous-composant rendu dans le render-prop de <ParentSize> : toute la logique
   dépendante de la LARGEUR (géométrie, échelles de position, marks, survol,
   overlays de features, barre d'outils, mini-vues) vit ici.
   ───────────────────────────────────────────────────────────────────────── */
const ChartCanvas = ({
  width, height, data, x, y, z, xType, yType, zType, chartKind,
  channels, hueCols, fill, effFill, stack, format, labels, maxLabelLength, maxLines,
  overlap, tickDensity, isSequentialZ, isViolinKind,
  cScale, styleScaleFn, hatchScaleFn, markerScaleFn,
  hovered, voronoiRow, setVoronoiRow, ciHover, initialMinimapOpen, title,
  // Features (barre d'outils configurable)
  tools, activeTools, featOn, featVal, toggleFeature, setFeatureValue,
  ciFeature, baFeature, normFactor, channelAssign, baReal,
  expanded, setExpanded, voronoiOn, setVoronoiOn, tooltipsOn, setTooltipsOn,
}) => {
  // Modèle d'état des mini-vues, partagé avec <MultiChart> : interrupteur maître
  // (barre d'outils) + pli par axe (pastilles). Cf. useMinimapState. Persiste tant
  // que la largeur reste > 0.
  const {
    minimapsVisible, setMinimapsVisible,
    xMinimapOpen, setXMinimapOpen,
    yMinimapOpen, setYMinimapOpen,
  } = useMinimapState(initialMinimapOpen);

  // Calcul des dimensions du graphique. `showXMinimap`/`showYMinimap` intègrent
  // déjà l'interrupteur maître (mini-vue applicable ET visible).
  const {
    margins, innerWidth, innerHeight, yTickW,
    svgH, showXMinimap, showYMinimap, miniH, xMinimapY, xToggleY,
    yMinimapW, yMinimapX, yToggleW,
  } = useChartGeometry({
    chartKind, data, x, y, xType, yType, format, labels, maxLabelLength, maxLines,
    overlap, tickDensity, width, height, minimapsVisible, xMinimapOpen, yMinimapOpen,
  });

  const svgRef = useRef(null);
  const clipId = 'chart-clip-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const mainClipId = 'chart-mclip-' + useId().replace(/[^a-zA-Z0-9]/g, '');

  const [activePos, setActivePos] = useState(null);
  const [activeCentroid, setActiveCentroid] = useState(null);
  // Geste de brush en cours : les marks basculent alors sur un calque de PREVIEW
  // (coordonnées de base + transform affine par frame, cf. plus bas) et le calcul
  // des cibles de survol (O(n) + voronoï), inutile en glissant, est sauté. Le
  // pipeline committé (filteredData/stackMain/échelles restreintes) reste gelé
  // pendant tout le geste et n'est recalculé qu'au relâchement.
  const [isBrushing, setIsBrushing] = useState(false);
  const active = voronoiRow; // la row sous le curseur

  const has2DBrush = chartKind === 'heatmap' || chartKind === 'density';
  const isBarH = chartKind === 'bar-h';
  const posKey = chartKind === 'bar-h' ? y : x;
  const valKey = chartKind === 'bar-h' ? x : y;

  // ── Empilage : deux variantes ────────────────────────────────────────────
  // stackMini — offsets sur les données COMPLÈTES ; stackMain — sur les données
  // FILTRÉES par le brush. L'ordre de séries est partagé.
  const stackable = chartKind === 'line' || chartKind === 'bar' || chartKind === 'bar-h';
  const stackActive = stackable && stack && stack !== 'none';
  const stackPosKey = chartKind === 'bar-h' ? y : x;
  const stackValKey = chartKind === 'bar-h' ? x : y;
  // Regroupement par série sur les données COMPLÈTES : calculé une seule fois et
  // partagé (ordre de stack, mini-vues line/bar, marks violon — ViolinMarks rend
  // depuis `data` non filtré, cf. plus bas, JAMAIS `filteredData`).
  const groupsFull = groupSeries(data, channels);
  const seriesOrder = groupsFull.map((s) => s.key);
  const stackMini = stackActive
    ? buildStacks({ data, posKey: stackPosKey, valKey: stackValKey, channels, stackBy: stack, seriesOrder, aggregate: 'mean' })
    : null;

  // ── Extension de l'axe VALEUR (line / bar) ────────────────────────────────
  // Quand l'IC et/ou la projection sont actifs, on étend le domaine pour englober
  // aussi leurs bornes et points. En empilage, les bornes d'IC sont reportées sur
  // le cumul de la série (mêmes offsets). Porté de chart.jsx (augValExtent).
  let augValExtent = null;
  if (chartKind === 'line' || chartKind === 'bar' || chartKind === 'bar-h') {
    const arr = (d) => (Array.isArray(d) ? d : []);
    const nums = [];
    const nf = (r) => normFactor(seriesKey(r, channels));
    if (ciFeature && ciFeature.config) {
      const cd = arr(ciFeature.config.data);
      const cols = [...(ciFeature.config.below || []), ...(ciFeature.config.above || [])];
      if (stackActive && stackMini) {
        for (const r of cd) {
          const o = stackMini.offsets.get(seriesKey(r, channels) + '|' + xKeyOf(r[posKey]));
          if (!o) continue;
          const sv = o.y1 - o.y0;
          for (const c of cols) { const b = nf(r) * +r[c]; if (!isNaN(b)) nums.push(o.y1 + (b - sv)); }
        }
      } else {
        for (const r of cd) for (const c of cols) { const b = nf(r) * +r[c]; if (!isNaN(b)) nums.push(b); }
      }
    }
    if (baFeature && baFeature.config) {
      const fd = arr(baFeature.config.data);
      for (const r of fd) { const v = nf(r) * +r[valKey]; if (!isNaN(v)) nums.push(v); }
      if (ciFeature && baFeature.config.ci) {
        const fcd = arr(baFeature.config.ci.data);
        const cols = [...(baFeature.config.ci.below || []), ...(baFeature.config.ci.above || [])];
        for (const r of fcd) for (const c of cols) { const b = nf(r) * +r[c]; if (!isNaN(b)) nums.push(b); }
      }
    }
    if (nums.length) augValExtent = [Math.min(...nums), Math.max(...nums)];
  }

  // ── Échelles de position de BASE (domaine complet ; axe valeur ancré à 0) ──
  let baseXScale;
  if (chartKind === 'bar-h' && xType === 'number') {
    if (stackActive) {
      let lo = 0, hi = stackMini.max;
      if (augValExtent) { lo = Math.min(lo, augValExtent[0]); hi = Math.max(hi, augValExtent[1]); }
      baseXScale = scaleLinear({ domain: [lo, hi], range: [0, innerWidth], nice: true });
    } else {
      const vals = data.map((d) => d[x]).filter((v) => v != null && !isNaN(v));
      let ext = extent(vals);
      if (ext[0] > 0) ext = [0, ext[1]];
      if (augValExtent) ext = [Math.min(ext[0], augValExtent[0]), Math.max(ext[1], augValExtent[1])];
      baseXScale = scaleLinear({ domain: ext, range: [0, innerWidth], nice: true });
    }
  } else {
    baseXScale = makeScale(xType, data, x, innerWidth, 'x', chartKind);
  }
  let baseYScale;
  if ((chartKind === 'line' || chartKind === 'bar') && yType === 'number') {
    if (stackActive) {
      let lo = 0, hi = stackMini.max;
      if (augValExtent) { lo = Math.min(lo, augValExtent[0]); hi = Math.max(hi, augValExtent[1]); }
      baseYScale = scaleLinear({ domain: [lo, hi], range: [innerHeight, 0], nice: true });
    } else {
      const vals = data.map((d) => d[y]).filter((v) => v != null && !isNaN(v));
      let ext = extent(vals);
      if (chartKind === 'bar' && ext[0] > 0) ext = [0, ext[1]];
      if (augValExtent) ext = [Math.min(ext[0], augValExtent[0]), Math.max(ext[1], augValExtent[1])];
      baseYScale = scaleLinear({ domain: ext, range: [innerHeight, 0], nice: true });
    }
  } else {
    baseYScale = makeScale(yType, data, y, innerHeight, 'y', chartKind);
  }

  // ── Zoom (brush + molette) : la molette n'est active que si l'outil zoom est ON.
  const zoomTool = tools.find((t) => t.isZoom);
  const zoomOn = zoomTool ? !!featOn[zoomTool.id] : false;
  // Groupes SVG dont le `transform` suit la preview de geste — écrit
  // IMPÉRATIVEMENT par useBrushZoom (setAttribute), sans rendu React par frame :
  // marks, overlays de features, couche zoom line/density.
  const previewMarksRef = useRef(null);
  const previewOverlaysRef = useRef(null);
  const previewZoomLayerRef = useRef(null);
  const {
    xSel, ySel, setXSel, setYSel, previewXSel, previewYSel,
    xScale, yScale, filteredData, axisZoom, resetZoom, canReset,
  } = useBrushZoom({
    data, x, y, xType, yType, chartKind,
    baseXScale, baseYScale, innerWidth, innerHeight,
    marginLeft: margins.left, marginTop: margins.top, width, svgRef, zoomOn,
    previewTargets: [previewMarksRef, previewOverlaysRef, previewZoomLayerRef],
  });
  const { zx, zy } = axisZoom;

  // Regroupement par série sur les données FILTRÉES (fenêtre de zoom) : ne sert
  // que sur bar/bar-h/violon (cibles de survol + marks bar, qui rendent depuis
  // `filteredData`) — line/density passent par la couche zoom
  // (computeBaseHoverTargets, sans notion de série) et heatmap n'en a pas besoin.
  const needsFilteredGroups = chartKind === 'bar' || chartKind === 'bar-h' || isViolinKind;
  const groupsFiltered = needsFilteredGroups ? groupSeries(filteredData, channels) : null;

  // Graphiques « nuage » (line, density) : voronoï + KDE 2-D dans une couche
  // zoomée par transform (coordonnées de base, non recalculés au zoom). Pendant
  // un geste de brush, ce transform est réécrit par frame par la preview
  // impérative (previewZoomLayerRef) puis repris par React au relâchement.
  const zoomLayer = chartKind === 'line' || chartKind === 'density';
  const zoomTransform = zoomTransformOf(zx, zy);

  // ── Empilage des marks affichés (données filtrées par le brush) ───────────
  const stackMain = stackActive
    ? buildStacks({ data: filteredData, posKey: stackPosKey, valKey: stackValKey, channels, stackBy: stack, seriesOrder, aggregate: 'mean' })
    : null;

  // ── Entrées des marks : bascule preview pendant un geste de brush ─────────
  // Pendant le drag (`isBrushing`), les marks sont rendus UNE fois depuis les
  // données COMPLÈTES en coordonnées de BASE (mêmes entrées que les mini-vues :
  // data/baseScales/stackMini/groupsFull) ; leur groupe porte alors le transform
  // affine base→committé, réécrit par frame en base→brouillon par la preview
  // impérative — le recalcul filter + stacks + repositionnement n'a lieu qu'au
  // relâchement, quand la sélection committée change. Hors geste : entrées
  // committées, rendu strictement inchangé.
  const mData = isBrushing ? data : filteredData;
  const mXScale = isBrushing ? baseXScale : xScale;
  const mYScale = isBrushing ? baseYScale : yScale;
  const mStack = isBrushing ? stackMini : stackMain;
  const mGroups = isBrushing ? groupsFull : groupsFiltered;

  // ── Contexte de projection passé aux overlays de features ─────────────────
  // Pendant un geste de brush, il bascule sur les mêmes entrées de BASE que les
  // marks (mData/mScales/mStack) : les overlays sont alors rendus dans le même
  // groupe transformé et restent alignés sur la preview sans recalcul par frame.
  const featureCtx = {
    chartKind, x, y, z, xType, yType, channels, hueCols,
    xScale: mXScale, yScale: mYScale, innerWidth, innerHeight,
    filteredData: mData, typedData: data,
    colorScale: cScale, styleScale: styleScaleFn, markerScale: markerScaleFn, hatchScale: hatchScaleFn,
    isBarH, fill, stack, posKey, valKey,
    stackOffsets: mStack ? mStack.offsets : null,
    ciActive: !!ciFeature,
    ciFill: ciFeature && ciFeature.config ? ciFeature.config.fill : undefined,
    normFactor,
  };

  // Overlays SVG des features (dessinés au-dessus des marks ET de la couche zoom).
  const featureOverlays = activeTools.filter((t) => t.Overlay).map((f) => (
    <f.Overlay
      key={f.id} ctx={featureCtx} channel={channelAssign[f.id]} config={f.config}
      value={featVal[f.id]} onValue={(v) => setFeatureValue(f.id, v)}
      hovered={hovered} voronoiActive={voronoiOn} voronoiRow={active} ciHover={ciHover}
    />
  ));

  // Clip de la série principale (mode replace de la barre avant/après) : renvoie
  // le rectangle du côté à GARDER.
  const clipFeature = activeTools.find((t) => t.mainClip);
  let baClip = null;
  if (clipFeature) {
    const sc = isBarH ? yScale : xScale;
    let p = sc(featVal[clipFeature.id]);
    if (p != null && !isNaN(p)) {
      if (sc.bandwidth) p += sc.bandwidth() / 2;
      if (isBarH) {
        baClip = clipFeature.mainClip === 'before' ? { x: 0, y: 0, w: innerWidth, h: p } : { x: 0, y: p, w: innerWidth, h: innerHeight - p };
      } else {
        baClip = clipFeature.mainClip === 'before' ? { x: 0, y: 0, w: p, h: innerHeight } : { x: p, y: 0, w: innerWidth - p, h: innerHeight };
      }
    }
  }

  // Rejoue les overlays « miniOverlay » (IC) dans les mini-vues, avec des échelles
  // miniatures. Porté de chart.jsx (renderMiniCI).
  const miniCIFeatures = activeTools.filter((t) => t.miniOverlay);
  const renderMiniCI = (miniXScale, miniYScale) => miniCIFeatures.map((f) => (
    <f.miniOverlay
      key={'mci-' + f.id}
      ctx={{
        chartKind, x, y, channels, xScale: miniXScale, yScale: miniYScale,
        colorScale: cScale, hatchScale: hatchScaleFn, styleScale: styleScaleFn, markerScale: markerScaleFn,
        filteredData: data, stackOffsets: stackMini ? stackMini.offsets : null,
      }}
      channel={channelAssign[f.id]} config={f.config} mini
    />
  ));

  // Boutons supplémentaires de la barre d'outils (features + mini-vues). Le bouton
  // « mini-vues » n'agit QUE sur la visibilité de l'ensemble (mini-vues +
  // pastilles) : le pli de chaque axe est la seule affaire de sa pastille, et il
  // est conservé d'un masquage à l'autre.
  const extraTools = tools.map((t) => (t.isMinimaps
    ? {
        id: t.id, icon: t.icon, label: t.label, on: minimapsVisible,
        onToggle: () => setMinimapsVisible((v) => !v),
      }
    : { id: t.id, icon: t.icon, label: t.label, on: !!featOn[t.id], onToggle: () => toggleFeature(t.id) }));

  // ── Cibles de survol ──────────────────────────────────────────────────────
  // Sautées pendant un geste de brush (`isBrushing`) : on ne survole pas en
  // glissant, et cela évite un recalcul O(n) + une reconstruction du diagramme de
  // voronoï à chaque frame. Recalculées au relâchement (isBrushing repasse à false).
  const baseHoverTargets = (zoomLayer && !isBrushing)
    ? computeBaseHoverTargets({ chartKind, data, channels, baseXScale, baseYScale, x, y, stackMini })
    : [];
  const hoverTargets = (zoomLayer || isBrushing) ? [] : computeHoverTargets({
    chartKind, filteredData, channels, xScale, yScale, x, y, z,
    stack, stackMain, innerWidth, innerHeight, fill, groups: groupsFiltered,
  });

  // Ancrage adaptatif : bulle du côté OPPOSÉ au point (flip près des bords). En
  // couche zoomée la cible est en coordonnées de BASE → projetée dans l'espace
  // affiché (transform) pour positionner la marque active et la tooltip.
  const handleHover = (target, fromZoomLayer) => {
    if (target) {
      let cx = target.px, cy = target.py;
      if (fromZoomLayer) { cx = zx.k * target.px + zx.t; cy = zy.k * target.py + zy.t; }
      setVoronoiRow(target.row);
      setActiveCentroid({ x: cx, y: cy });
      const flipX = cx > innerWidth / 2;
      const flipY = cy > innerHeight / 2;
      const pointX = margins.left + cx;
      const pointY = margins.top + cy;
      setActivePos({ x: pointX + (flipX ? -14 : 14), y: pointY + (flipY ? -20 : 12), flipX, flipY });
    } else {
      setVoronoiRow(null); setActiveCentroid(null); setActivePos(null);
    }
  };

  // Couleur du mark actif (séquentielle via z, sinon via le canal couleur).
  let activeColor = PALETTE[0];
  if (active) {
    if (isSequentialZ && z != null) activeColor = cScale(+active[z]);
    else if (channels.color) activeColor = cScale(active[channels.color]);
  }

  // Libellé d'un canal : suit la COLONNE hue (titres corrects même quand forme et
  // style sont permutés en mode nuage).
  const labelForCol = (col) => {
    if (col == null) return '';
    if (col === hueCols[0]) return labels.color || labels.hue || col;
    if (col === hueCols[1]) return labels.style || col;
    if (col === hueCols[2]) return labels.marker || col;
    return col;
  };

  // Glyphe + modèle de tooltip (titre = Y en 2D / Z en 3D).
  const tooltipGlyphSpec = active ? {
    kind: chartKind,
    color: activeColor,
    dash: channels.style ? styleScaleFn(active[channels.style]) : null,
    hatch: channels.style ? hatchScaleFn(active[channels.style]) : null,
    marker: channels.marker ? markerScaleFn(active[channels.marker]) : null,
  } : null;

  let tooltipModel = null;
  if (active) {
    const is3D = chartKind === 'heatmap' || chartKind === 'density';
    const isProj = !!active.__isProjection;
    const xFmt = resolveFormatter(format.x, xType);
    const yFmt = resolveFormatter(format.y, yType);
    const zFmt = z ? resolveFormatter(format.z, zType) : null;
    const af = normFactor(seriesKey(active, channels)); // coeff. de normalisation
    const projLabel = (baFeature && baFeature.config && baFeature.config.label) || 'Projection';
    const valFmtMain = chartKind === 'bar-h' ? xFmt : yFmt;
    const title2 = isProj ? projLabel : (is3D ? (labels.z || z) : (labels.y || y));
    const hueRows = hueCols.map((c) => ({ label: labelForCol(c), value: active[c] }));
    const valueRows = [];
    valueRows.push({ label: labels.x || x, value: xFmt(active[x]) });
    if (is3D) valueRows.push({ label: labels.y || y, value: yFmt(active[y]) });
    if (isProj) {
      valueRows.push({ label: projLabel, value: valFmtMain(af * +active[valKey]) });
    } else {
      valueRows.push({ label: 'Valeur', value: is3D ? zFmt(active[z]) : yFmt(active[y]) });
      if (z && !is3D) valueRows.push({ label: labels.z || z, value: zFmt(active[z]) });
    }

    // ── Bornes d'IC + projection (line / bar) — sous la valeur ───────────────
    if (chartKind === 'line' || chartKind === 'bar' || chartKind === 'bar-h') {
      const valFmt = chartKind === 'bar-h' ? xFmt : yFmt;
      const activeKey = xKeyOf(active[posKey]) + '|' + seriesKey(active, channels);
      const bracket = (lo, hi) => '[' + (lo != null && !isNaN(+lo) ? valFmt(+lo) : '–') + ' ; ' + (hi != null && !isNaN(+hi) ? valFmt(+hi) : '–') + ']';
      const pushBounds = (row, below, above, prefix) => {
        const nb = Math.max(below.length, above.length);
        for (let i = 0; i < nb; i++) {
          const lo = below[i] != null ? af * +row[below[i]] : null;
          const hi = above[i] != null ? af * +row[above[i]] : null;
          if ((lo == null || isNaN(lo)) && (hi == null || isNaN(hi))) continue;
          const lab = (ciFeature.config.labels && ciFeature.config.labels.bands && ciFeature.config.labels.bands[i]) || ('±' + (i + 1));
          valueRows.push({ label: prefix + lab, value: bracket(lo, hi) });
        }
      };
      if (isProj) {
        if (ciFeature && baFeature && baFeature.config.ci && Array.isArray(baFeature.config.ci.data)) {
          const cm = new Map();
          for (const r of baFeature.config.ci.data) cm.set(xKeyOf(r[posKey]) + '|' + seriesKey(r, channels), r);
          const fci = cm.get(activeKey);
          if (fci) pushBounds(fci, baFeature.config.ci.below || [], baFeature.config.ci.above || [], '');
        }
      } else {
        if (ciFeature && ciFeature.config && Array.isArray(ciFeature.config.data)) {
          const m = new Map();
          for (const r of ciFeature.config.data) m.set(xKeyOf(r[posKey]) + '|' + seriesKey(r, channels), r);
          const ci = m.get(activeKey);
          if (ci) pushBounds(ci, ciFeature.config.below || [], ciFeature.config.above || [], '');
        }
        if (baFeature && baFeature.config && Array.isArray(baFeature.config.data)) {
          const m = new Map();
          for (const r of baFeature.config.data) m.set(xKeyOf(r[posKey]) + '|' + seriesKey(r, channels), r);
          const fr = m.get(activeKey);
          if (fr) {
            valueRows.push({ label: projLabel, value: valFmt(af * +fr[valKey]) });
            if (ciFeature && baFeature.config.ci && Array.isArray(baFeature.config.ci.data)) {
              const cm = new Map();
              for (const r of baFeature.config.ci.data) cm.set(xKeyOf(r[posKey]) + '|' + seriesKey(r, channels), r);
              const fci = cm.get(activeKey);
              if (fci) pushBounds(fci, baFeature.config.ci.below || [], baFeature.config.ci.above || [], 'Proj. ');
            }
          }
        }
      }
    }

    tooltipModel = { title: title2, glyphSpec: tooltipGlyphSpec, hueRows, valueRows };
  }

  // ── Marks du kind détecté ────────────────────────────────────────────────
  // Entrées mData/mScales/mStack/mGroups : committées hors geste, de BASE pendant
  // un drag (le groupe porteur reçoit alors le transform de preview, cf. le rendu).
  let marks = null;
  if (chartKind === 'line') {
    marks = <LineMarks data={mData} x={x} y={y} channels={channels} xScale={mXScale} yScale={mYScale} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} hovered={hovered} fill={fill} stack={mStack} groups={mGroups} baReal={baReal} />;
  } else if (chartKind === 'bar') {
    marks = <BarMarks data={mData} x={x} y={y} channels={channels} xScale={mXScale} yScale={mYScale} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} hovered={hovered} orient="v" fill={fill} stack={mStack} groups={mGroups} />;
  } else if (chartKind === 'bar-h') {
    marks = <BarMarks data={mData} x={x} y={y} channels={channels} xScale={mXScale} yScale={mYScale} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} hovered={hovered} orient="h" fill={fill} stack={mStack} groups={mGroups} />;
  } else if (chartKind === 'heatmap') {
    marks = <HeatmapMarks data={mData} x={x} y={y} z={z} xScale={mXScale} yScale={mYScale} colorScale={cScale} hovered={hovered} fill={effFill} />;
  } else if (isViolinKind) {
    marks = <ViolinMarks data={data} x={x} y={y} z={z} channels={channels} xScale={mXScale} yScale={mYScale} xScaleBase={baseXScale} yScaleBase={baseYScale} colorScale={cScale} styleScale={styleScaleFn} hatchScale={hatchScaleFn} markerScale={markerScaleFn} orient={chartKind === 'violin-h' ? 'h' : 'v'} fill={effFill} stack={stack} hovered={hovered} groups={groupsFull} />;
  }

  // Densité (KDE 2-D) rendue en coordonnées de BASE puis zoomée par le transform.
  const densityZoomMarks = chartKind === 'density'
    ? <DensityMarks data={data} x={x} y={y} z={z} channels={channels} xScale={baseXScale} yScale={baseYScale} colorScale={cScale} styleScale={styleScaleFn} hatchScale={hatchScaleFn} markerScale={markerScaleFn} hovered={hovered} innerWidth={innerWidth} innerHeight={innerHeight} fill={effFill} zoom={{ kx: zx.k, ky: zy.k }} />
    : null;

  // ── Contenu des mini-vues : réplique miniature (2-D) ou projection (3-D) ──
  let xMiniContent = null;
  if (chartKind === 'line') {
    const yMini = baseYScale.copy().range([miniH, 0]);
    xMiniContent = <>{<LineMarks data={data} x={x} y={y} channels={channels} xScale={baseXScale} yScale={yMini} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} fill={fill} stack={stackMini} groups={groupsFull} mini />}{renderMiniCI(baseXScale, yMini)}</>;
  } else if (chartKind === 'bar') {
    const yMini = baseYScale.copy().range([miniH, 0]);
    xMiniContent = <>{<BarMarks data={data} x={x} y={y} channels={channels} xScale={baseXScale} yScale={yMini} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} orient="v" fill={fill} stack={stackMini} groups={groupsFull} mini />}{renderMiniCI(baseXScale, yMini)}</>;
  } else if (has2DBrush) {
    xMiniContent = <MiniProjection data={data} posCol={x} posType={xType} valCol={z} posScale={baseXScale} width={innerWidth} height={miniH} direction="x" mode="mean" />;
  } else if (chartKind === 'violin-v') {
    xMiniContent = <MiniProjection data={data} posCol={x} posType={xType} valCol={y} posScale={baseXScale} width={innerWidth} height={miniH} direction="x" mode="mean" />;
  } else if (chartKind === 'violin-h') {
    xMiniContent = <MiniProjection data={data} posCol={x} posType={xType} valCol={x} posScale={baseXScale} width={innerWidth} height={miniH} direction="x" mode="count" />;
  }

  let yMiniContent = null;
  if (has2DBrush) {
    yMiniContent = <MiniProjection data={data} posCol={y} posType={yType} valCol={z} posScale={baseYScale} width={yMinimapW} height={innerHeight} direction="y" mode="mean" />;
  } else if (isBarH) {
    const miniX = baseXScale.copy().range([0, Math.max(2, yMinimapW - 2)]);
    yMiniContent = <>{<BarMarks data={data} x={x} y={y} channels={channels} xScale={miniX} yScale={baseYScale} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} orient="h" fill={fill} stack={stackMini} groups={groupsFull} mini />}{renderMiniCI(miniX, baseYScale)}</>;
  } else if (chartKind === 'violin-v') {
    yMiniContent = <MiniProjection data={data} posCol={y} posType={yType} valCol={y} posScale={baseYScale} width={yMinimapW} height={innerHeight} direction="y" mode="count" />;
  } else if (chartKind === 'violin-h') {
    yMiniContent = <MiniProjection data={data} posCol={y} posType={yType} valCol={x} posScale={baseYScale} width={yMinimapW} height={innerHeight} direction="y" mode="count" />;
  }

  return (
    <>
      {/* Barre d'outils — révélée au survol du frame (CSS pur). */}
      <ChartToolbar
        expanded={expanded} onExpand={() => setExpanded((e) => !e)}
        voronoi={voronoiOn} onVoronoi={() => setVoronoiOn((v) => !v)}
        tooltips={tooltipsOn} onTooltips={() => setTooltipsOn((t) => !t)}
        onReset={resetZoom} canReset={canReset}
        onExportSvg={() => exportSvg(svgRef.current, (title || 'chart') + '.svg')}
        onExportPng={() => exportPng(svgRef.current, (title || 'chart') + '.png')}
        extraTools={extraTools}
      />

      {/* Pas de role="img" : cette valeur PRUNE la sémantique des descendants pour
          les technologies d'assistance, or ce <svg> peut contenir des poignées
          <DragBar> interactives (role="slider", cf. featureOverlays plus bas) —
          le <title> ci-dessous suffit à donner un nom accessible au graphique
          sans masquer ses éventuels contrôles clavier. */}
      <svg
        ref={svgRef} className={`chart-svg${zoomOn ? ' chart-svg--zoom' : ''}`}
        width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`}
      >
        <title>{title || 'Graphique'}</title>
        <g transform={`translate(${margins.left}, ${margins.top})`}>
          {/* Axes sur les échelles COMMITTÉES : gelés pendant un geste de brush
              (aucun rendu React par frame), recalés au relâchement. */}
          <ChartAxisLeft
            scale={yScale} type={yType} length={innerHeight} width={innerWidth}
            format={format.y} maxLabelLength={maxLabelLength.y} maxLines={maxLines.y || 2}
            overlap={overlap} tickDensity={tickDensity} label={labels.y}
            labelOffset={yTickW + 10}
          />
          <ChartAxisBottom
            scale={xScale} type={xType} length={innerWidth} height={innerHeight}
            format={format.x} maxLabelLength={maxLabelLength.x} maxLines={maxLines.x || 2}
            overlap={overlap} tickDensity={tickDensity} label={labels.x}
          />
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={innerWidth} height={innerHeight} />
            </clipPath>
            {baClip && (
              <clipPath id={mainClipId}>
                <rect x={baClip.x} y={baClip.y} width={baClip.w} height={baClip.h} />
              </clipPath>
            )}
          </defs>
          {/* Zone de tracé — UN SEUL groupe clippé (clipId) partagé par les trois
              couches ci-dessous ; tout ce qui suit (survol direct, ActiveMark,
              mini-vues) reste volontairement HORS de ce groupe, donc non clippé.
              Le clip et le transform de preview NE PEUVENT PAS cohabiter sur le
              même <g> : un clip-path (userSpaceOnUse) est résolu dans le repère de
              l'élément qui le référence, APRÈS son propre transform — la fenêtre de
              découpe zoomerait avec les marks. D'où, dans chaque couche, un <g>
              dédié au transform, cible de la preview impérative (previewTargets de
              useBrushZoom) : la valeur JSX (base→committé) est posée au début du
              geste, réécrite par frame par setAttribute, puis reprise par le rendu
              committé au relâchement. .chart-zoom-content garde les traits à
              épaisseur constante (vector-effect). */}
          <g clipPath={`url(#${clipId})`}>
            {/* Marks, rendus en coordonnées de BASE pendant le geste (cf. mData/mScales).
                Le <g> intermédiaire porte le clip de feature (baClip) : deux clips ne
                s'intersectent QU'EN imbriquant (les enfants d'un <clipPath> s'unissent).
                Il est rendu même sans baClip (attribut undefined) pour garder la forme de
                l'arbre — et donc le sous-arbre des marks — stable. */}
            <g clipPath={baClip ? `url(#${mainClipId})` : undefined}>
              <g
                ref={previewMarksRef}
                className={isBrushing ? 'chart-zoom-content' : undefined}
                transform={isBrushing ? zoomTransform : undefined}
              >
                {marks}
              </g>
            </g>

            {/* Couche ZOOM : densité (KDE 2-D) + survol (line/density) en coordonnées
                de BASE, agrandis par transform (traits non-scaling-stroke). */}
            {zoomLayer && (
              <g ref={previewZoomLayerRef} className="chart-zoom-content" transform={zoomTransform}>
                {densityZoomMarks}
                {baseHoverTargets.length > 0 && (voronoiOn
                  ? <VoronoiOverlay points={baseHoverTargets} innerWidth={innerWidth} innerHeight={innerHeight} onHover={(t) => handleHover(t, true)} />
                  : (tooltipsOn ? <DirectHoverOverlay targets={baseHoverTargets} onHover={(t) => handleHover(t, true)} /> : null))}
              </g>
            )}

            {/* Overlays de features (IC, projection, normalisation) AU-DESSUS de la
                couche zoom (la barre de normalisation passe devant les densités).
                Pendant un geste de brush ils sont rendus en base (featureCtx) et
                suivent la preview via le même transform que les marks. */}
            <g
              ref={previewOverlaysRef}
              className={isBrushing ? 'chart-zoom-content' : undefined}
              transform={isBrushing ? zoomTransform : undefined}
            >
              {featureOverlays}
            </g>
          </g>

          {/* Survol direct / proximité (charts à bandes). */}
          {!zoomLayer && hoverTargets.length > 0 && (voronoiOn
            ? <VoronoiOverlay points={hoverTargets} innerWidth={innerWidth} innerHeight={innerHeight} onHover={(t) => handleHover(t, false)} />
            : (tooltipsOn ? <DirectHoverOverlay targets={hoverTargets} onHover={(t) => handleHover(t, false)} /> : null))}

          {active && (voronoiOn || tooltipsOn) && (
            <ActiveMark
              pos={activeCentroid}
              color={activeColor}
              marker={channels.marker ? markerScaleFn(active[channels.marker]) : 'circle'}
            />
          )}

          {/* Mini-vue y — à gauche du tracé.
              Le placement passe par la prop `transform` (posée sur le <g> racine de
              BrushMinimap). */}
          {showYMinimap && yMinimapOpen && (
            <BrushMinimap
              direction="y" transform={`translate(${-yMinimapX}, 0)`}
              width={yMinimapW} height={innerHeight}
              scale={baseYScale} selection={ySel} onChange={setYSel} onPreview={previewYSel}
              content={yMiniContent} onBrushingChange={setIsBrushing}
            />
          )}
        </g>

        {/* Mini-vue x — sous l'axe des abscisses (hors du groupe des marges : son
            translate est exprimé dans le repère du <svg>). */}
        {showXMinimap && xMinimapOpen && (
          <BrushMinimap
            direction="x"
            transform={`translate(${margins.left}, ${xMinimapY})`}
            width={innerWidth} height={miniH}
            scale={baseXScale} selection={xSel} onChange={setXSel} onPreview={previewXSel}
            content={xMiniContent} onBrushingChange={setIsBrushing}
          />
        )}
      </svg>

      {/* Pastilles de pli des mini-vues (une par axe applicable, indépendantes ; ne
          replient QUE leur bande, sans jamais se masquer elles-mêmes — c'est le rôle
          du bouton « mini-vues » de la barre d'outils, via `minimapsVisible`, déjà
          intégré à showXMinimap/showYMinimap).
          Chacune est ALIGNÉE sur le titre de son axe : seul le point d'ancrage
          (issu de la géométrie, connue ici en JS) est posé en inline ; le centrage
          effectif — y compris celui de la pastille y pivotée — est fait en CSS pur
          par MinimapToggle.scss (transform d'ancrage, sans mesure du bouton).
            • x : centre du titre d'axe x (margins.left + innerWidth/2, PAS 50 % du
              body : ses marges gauche/droite sont asymétriques), `xToggleY` px sous
              le haut du svg (= bas de la mini-vue + TOGGLE_GAP) ;
            • y : centre de la gouttière yToggleW (réservée par useChartGeometry à
              gauche du titre d'axe y, au même TOGGLE_GAP de la mini-vue), centré sur
              la hauteur du tracé (margins.top + innerHeight/2) comme le titre. */}
      {showXMinimap && (
        <MinimapToggle
          open={xMinimapOpen}
          direction="x"
          onToggle={() => setXMinimapOpen((o) => !o)}
          style={{
            left: margins.left + innerWidth / 2,
            top: xToggleY,
          }}
        />
      )}
      {showYMinimap && (
        <MinimapToggle
          open={yMinimapOpen}
          direction="y"
          onToggle={() => setYMinimapOpen((o) => !o)}
          style={{
            left: yToggleW / 2,
            top: margins.top + innerHeight / 2,
          }}
        />
      )}

      {tooltipsOn && active && activePos && tooltipModel && (
        <ChartTooltip model={tooltipModel} position={activePos} />
      )}
    </>
  );
};

/* ────────────────────────── Chart (pivot) ────────────────────────────────── */

/**
 * Adaptive chart. Detects column types on x/y/z and picks the mark renderer.
 * Delegates to <MultiChart> when `data` is an Array<Dataset> (not yet built).
 *
 * @param {object} props
 * @param {Array<object>} props.data - Array<Row> (long format) | Array<Dataset>.
 * @param {string} props.x - Abscissa column.
 * @param {string} props.y - Ordinate column (required).
 * @param {string} [props.z] - Third dimension (heatmap / violin / density).
 * @param {string|string[]} [props.hue] - [0]→color, [1]→style, [2]→marker.
 * @param {'none'|'line'|'fill'} [props.fill='line'] - Fill mode.
 * @param {'none'|'color'|'style'|'marker'|'all'} [props.stack='none'] - Stacking mode.
 * @param {object} [props.format] - { x?, y?, z? } d3 spec or function.
 * @param {object} [props.labels] - { x?, y?, z?, color?, style?, marker? }.
 * @param {object} [props.maxLabelLength] - { x?, y? } categorical ellipsis.
 * @param {object} [props.maxLines] - { x?, y? } multiline max lines.
 * @param {'auto'|'rotate'|'multiline'|'skip'} [props.overlap='auto'] - Anti-overlap strategy.
 * @param {'sparse'|'normal'|'dense'} [props.tickDensity='normal'] - Tick density.
 * @param {boolean} [props['categorical-x']=false] - Force the x axis to be treated as
 *   categorical (single-series path), turning a line into vertical bars. Ignored on the
 *   MultiChart path, where each dataset carries its own `categorical-x` key.
 * @param {boolean} [props['categorical-y']=false] - Force the y axis to be treated as
 *   categorical (single-series path), producing horizontal bars (`bar-h`).
 * @param {string} [props.title] - Chart title.
 * @param {number} [props.height=460] - Outer height (px).
 * @param {Array<object>} [props.toolbar=[]] - Toolbar feature descriptors. Should be a
 *   STABLE reference across renders unrelated to it (build it once — module scope, or a
 *   dedicated child component fed only the state it depends on) : a new array/object
 *   identity on every parent render defeats the React Compiler's ability to bail out
 *   this <Chart>'s re-render.
 * @param {object} [props.defaults={}] - Initial ON state per tool id ('confidence',
 *   'beforeAfter', 'normalize', 'zoom', 'minimaps' + built-ins 'voronoi', 'tooltips',
 *   'expanded'). Overrides each feature's `defaultOn`.
 * @param {boolean} [props.initialMinimapOpen=true] - Minimap open by default.
 * @returns {JSX.Element}
 */
const Chart = ({
  data, x, y, z, hue,
  fill = 'line', stack = 'none',
  format = {}, labels = {}, maxLabelLength = {}, maxLines = {},
  overlap = 'auto', tickDensity = 'normal',
  'categorical-x': categoricalX = false, 'categorical-y': categoricalY = false,
  title, height = 460,
  toolbar = [], defaults = {}, initialMinimapOpen = true,
}) => {
  // Hooks AVANT tout retour anticipé
  const { hovered, setHovered, voronoiRow, setVoronoiRow, ciHover, setCiHover } = useSeriesHover();

  // ── Détection de type + coercition (données BRUTES avant transform) ────────
  const isList = isDatasetList(data);
  const hueCols = hue ? (Array.isArray(hue) ? hue : [hue]) : [];
  // Les props `categorical-x/y` forcent un axe en catégoriel (bande) : détection
  // court-circuitée → detectChart produit alors 'bar' / 'bar-h', et `coerce`
  // convertit les valeurs en chaînes (catégories) de façon cohérente.
  const xType = isList ? null : (categoricalX ? 'categorical' : detectType(data.map((r) => r[x])));
  const yType = isList ? null : (categoricalY ? 'categorical' : detectType(data.map((r) => r[y])));
  const zType = (!isList && z) ? detectType(data.map((r) => r[z])) : null;
  const typedDataRaw = isList ? data : data.map((r) => ({
    ...r,
    [x]: coerce(r[x], xType),
    [y]: coerce(r[y], yType),
    ...(z ? { [z]: coerce(r[z], zType) } : {}),
  }));
  const chartKind = isList ? null : detectChart({ xType, yType, zType, hasZ: !!z });

  // État des features (avant tout retour : hooks au top-level). `supports`
  // reçoit un kind null pour la branche multi-jeux → aucune option retenue.
  const {
    tools, activeTools, featOn, featVal, toggleFeature, setFeatureValue,
  } = useFeatureState({ toolbar, chartKind, defaults });

  // État frame-level (agrandissement + modes de survol).
  const [expanded, setExpanded] = useState(!!defaults.expanded);
  const [voronoiOn, setVoronoiOn] = useState(!!defaults.voronoi);
  const [tooltipsOn, setTooltipsOn] = useState(defaults.tooltips != null ? !!defaults.tooltips : true);

  // Branche « data = liste de jeux » → délégation à <MultiChart> (axes partagés,
  // échelles de canaux coordonnées entre jeux, une section de légende par jeu).
  if (isList) {
    return (
      <MultiChart
        data={data} x={x} y={y} hue={hue}
        fill={fill} stack={stack}
        format={format} labels={labels} maxLabelLength={maxLabelLength} maxLines={maxLines}
        overlap={overlap} tickDensity={tickDensity}
        title={title} height={height} defaults={defaults} toolbar={toolbar}
      />
    );
  }
  if (!y) throw new Error("<Chart>: l'argument `y` est requis.");

  const isViolinKind = chartKind === 'violin-v' || chartKind === 'violin-h';
  const isContinuousZ = chartKind === 'heatmap' || chartKind === 'density' || isViolinKind;
  // z continu : 'none' (option scatter des charts X-Y) retombe sur 'fill'.
  const effFill = isContinuousZ ? (fill === 'line' ? 'line' : 'fill') : fill;

  // ── Canaux (le nombre est inféré de la longueur de `hue`) ─────────────────
  let channels;
  if (chartKind === 'heatmap') {
    channels = { color: null, style: null, marker: null };
  } else if (fill === 'none' && !isContinuousZ) {
    // Nuage X-Y : 2e hue → forme (marqueur), 3e → plein/pointillé (style).
    channels = { color: hueCols[0] || null, marker: hueCols[1] || null, style: hueCols[2] || null };
  } else {
    channels = { color: hueCols[0] || null, style: hueCols[1] || null, marker: hueCols[2] || null };
  }

  const posKey = chartKind === 'bar-h' ? y : x;
  const valKey = chartKind === 'bar-h' ? x : y;

  // ── Rôle TRANSFORM (normalisation) : données AVANT échelles/marks ─────────
  // GARANTIE : inactif ⇒ référence brute inchangée (zéro recalcul, rendu nu).
  const normTool = activeTools.find((t) => t.transform);
  const typedData = normTool
    ? normTool.transform(typedDataRaw, { posKey, valKey, channels, barPos: featVal[normTool.id], chartKind, x, y, z })
    : typedDataRaw;

  // Coefficient de normalisation PAR SÉRIE (100 / valeur à la barre). Le même
  // coeff. met à l'échelle les bornes d'IC et la projection (jeux séparés).
  let normFactorMap = null;
  if (normTool && (chartKind === 'line' || chartKind === 'bar' || chartKind === 'bar-h')) {
    const barPos = featVal[normTool.id];
    if (barPos != null) {
      const refs = normalizeRefs(typedDataRaw, { posKey, valKey, channels, barPos });
      normFactorMap = new Map();
      for (const [k, ref] of refs) normFactorMap.set(k, (ref == null || ref === 0) ? 1 : 100 / ref);
    }
  }
  const normFactor = (key) => ((normFactorMap && normFactorMap.has(key)) ? normFactorMap.get(key) : 1);

  // Features identifiées par `kind` (l'id peut être surchargé par config.id).
  const ciFeature = activeTools.find((t) => t.kind === 'confidence');
  const baFeature = activeTools.find((t) => t.kind === 'beforeAfter');

  // Marqueur de distinction posé sur la VRAIE série (line) quand une projection
  // NON-remplaçante est active : hue 2 → marqueur unique ; hue 3 → + 2e marqueur.
  let baReal = null;
  if (chartKind === 'line' && baFeature && !(baFeature.config && baFeature.config.replace)) {
    const nHue = (channels.color ? 1 : 0) + (channels.style ? 1 : 0) + (channels.marker ? 1 : 0);
    if (nHue >= 2) baReal = { marker: REAL_DIST_MARKER, secondary: nHue >= 3 };
  }

  // Échelle séquentielle (dégradé) : heatmap toujours ; violon/density seulement
  // tant qu'aucun canal couleur n'est actif.
  const isSequentialZ = !!z && (chartKind === 'heatmap' || (isContinuousZ && !channels.color));

  // ── Domaines + échelles de canaux (indépendants de la largeur) ────────────
  const colorVals = distinctVals(typedData, channels.color);
  const styleVals = distinctVals(typedData, channels.style);
  const markerVals = distinctVals(typedData, channels.marker);
  const cScale = isSequentialZ
    ? sequentialScale(extent(typedData.map((r) => +r[z]).filter((v) => !isNaN(v))))
    : colorScale(colorVals);
  const styleScaleFn = styleScale(styleVals);
  const hatchScaleFn = hatchScale(styleVals);
  const markerScaleFn = markerScale(markerVals);
  const refColor = (!isSequentialZ && colorVals.length) ? cScale(colorVals[0]) : PALETTE[0];

  const labelForCol = (col) => {
    if (col == null) return '';
    if (col === hueCols[0]) return labels.color || labels.hue || col;
    if (col === hueCols[1]) return labels.style || col;
    if (col === hueCols[2]) return labels.marker || col;
    return col;
  };

  // ── Groupes de légende (couleur / style / marqueur) ───────────────────────
  const byType = {
    color: channels.color
      ? { channel: 'color', label: labelForCol(channels.color), items: colorVals.map((v) => ({ key: v, color: cScale(v) })) }
      : null,
    style: channels.style
      ? { channel: 'style', label: labelForCol(channels.style), items: styleVals.map((v) => ({ key: v, color: refColor, dash: styleScaleFn(v), hatch: hatchScaleFn(v) })) }
      : null,
    marker: channels.marker
      ? { channel: 'marker', label: labelForCol(channels.marker), items: markerVals.map((v) => ({ key: v, color: refColor, marker: markerScaleFn(v) })) }
      : null,
  };
  const legendOrder = fill === 'none' ? ['color', 'marker', 'style'] : ['color', 'style', 'marker'];
  const legendGroups = legendOrder.map((k) => byType[k]).filter(Boolean);
  const hasChannelLegend = legendGroups.length > 0;
  const styleGlyphKind = (
    ((chartKind === 'bar' || chartKind === 'bar-h') && fill !== 'none')
    || (isViolinKind && effFill === 'fill')
    || (chartKind === 'density' && effFill === 'fill')
  ) ? 'hatch' : 'dash';

  // ── Canaux libres des features « encoder » (profondeur de hue +1) ──────────
  const encoderFeatures = activeTools.filter((t) => t.roles.includes('encoder'));
  const channelAssign = {};
  const usedChannels = [];
  // Projection avant les intervalles (CI en dernier) — même ordre que le prototype.
  const orderedEncoders = [...encoderFeatures].sort((a, b) => (a.id === 'confidence') - (b.id === 'confidence'));
  for (const f of orderedEncoders) { const ch = nextFreeChannel(channels, usedChannels); channelAssign[f.id] = ch; usedChannels.push(ch); }

  // ── Groupes de légende additionnels (bandes CI, projection) ───────────────
  // Les factories `legend()` n'utilisent que des valeurs largeur-indépendantes.
  const featureLegendCtx = {
    chartKind, channels, filteredData: typedData,
    colorScale: cScale, styleScale: styleScaleFn, hatchScale: hatchScaleFn, markerScale: markerScaleFn,
  };
  const featureLegendGroups = [];
  for (const f of activeTools) {
    if (f.legend) {
      const g = f.legend(featureLegendCtx, channelAssign[f.id], f.config);
      if (g && g.items && g.items.length) featureLegendGroups.push(g);
    }
  }
  const allLegendGroups = [...legendGroups, ...featureLegendGroups];
  const hasAnyLegend = hasChannelLegend || featureLegendGroups.length > 0;

  // Route le survol de légende : item d'IC ('ciband') isole un niveau ; item de
  // série estompe les autres séries + IC.
  const onLegendHover = (value, group) => {
    if (group && group.channel === 'ciband') {
      setCiHover(value == null ? null : { value });
      setHovered(null);
    } else {
      setHovered(value);
      setCiHover(null);
    }
  };

  // Visibilité des mini-vues par défaut : defaults.minimaps > outil minimaps > prop.
  const effInitialMinimapOpen = resolveMinimapsVisible({
    defaults, toolbar, fallback: initialMinimapOpen,
  });

  const legendInline = expanded;

  return (
    <figure className={`chart-frame${expanded ? ' chart-frame--expanded' : ''}`}>
      <figcaption className="chart-header">
        {title && <h3 className="chart-title">{title}</h3>}
      </figcaption>

      {/* Légende du haut (mode agrandi). */}
      {legendInline && hasAnyLegend && !isSequentialZ && (
        <div className="chart-legend-top">
          <ChannelLegend
            groups={allLegendGroups} layout="horizontal"
            hovered={hovered} hoveredCI={ciHover && ciHover.value}
            onHover={onLegendHover} styleGlyph={styleGlyphKind}
          />
        </div>
      )}
      {legendInline && isSequentialZ && (
        <div className="chart-legend-top">
          <SequentialLegend scale={cScale} label={labels.z || z} orientation="horizontal" />
        </div>
      )}

      <ParentSize
        className="chart-body" parentSizeStyles={{ position: 'relative', width: '100%', minHeight: height }}
        debounceTime={150} enableDebounceLeadingCall
      >
        {({ width }) => (
          width > 0 ? (
            <ChartCanvas
              width={Math.max(320, Math.floor(width))}
              height={height}
              data={typedData}
              x={x} y={y} z={z}
              xType={xType} yType={yType} zType={zType}
              chartKind={chartKind}
              channels={channels} hueCols={hueCols}
              fill={fill} effFill={effFill} stack={stack}
              format={format} labels={labels} maxLabelLength={maxLabelLength} maxLines={maxLines}
              overlap={overlap} tickDensity={tickDensity}
              isSequentialZ={isSequentialZ} isViolinKind={isViolinKind}
              cScale={cScale} styleScaleFn={styleScaleFn} hatchScaleFn={hatchScaleFn} markerScaleFn={markerScaleFn}
              hovered={hovered} voronoiRow={voronoiRow} setVoronoiRow={setVoronoiRow} ciHover={ciHover}
              initialMinimapOpen={effInitialMinimapOpen} title={title}
              tools={tools} activeTools={activeTools} featOn={featOn} featVal={featVal}
              toggleFeature={toggleFeature} setFeatureValue={setFeatureValue}
              ciFeature={ciFeature} baFeature={baFeature} normFactor={normFactor}
              channelAssign={channelAssign} baReal={baReal}
              expanded={expanded} setExpanded={setExpanded}
              voronoiOn={voronoiOn} setVoronoiOn={setVoronoiOn}
              tooltipsOn={tooltipsOn} setTooltipsOn={setTooltipsOn}
            />
          ) : null
        )}
      </ParentSize>

      {/* Légende de droite (mode par défaut). */}
      {!legendInline && hasAnyLegend && !isSequentialZ && (
        <aside className="chart-legend-right">
          <ChannelLegend
            groups={allLegendGroups} layout="vertical"
            hovered={hovered} hoveredCI={ciHover && ciHover.value}
            onHover={onLegendHover} styleGlyph={styleGlyphKind}
          />
        </aside>
      )}
      {!legendInline && isSequentialZ && (
        <aside className="chart-legend-right">
          <SequentialLegend scale={cScale} label={labels.z || z} orientation="vertical" />
        </aside>
      )}
    </figure>
  );
};

export default Chart;
