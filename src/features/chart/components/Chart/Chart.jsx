'use client';
/* ═══════════════════════════════════════════════════════════════════════════
   Chart.jsx — <Chart> (composant pivot)
   Détecte le type de graphique depuis les types de colonnes (x/y/z), calcule la
   géométrie et les échelles, câble le renderer de marks adéquat, le survol
   (proximité voronoï / direct), la tooltip et la légende.

   Version 1 : SANS barre d'outils configurable (toolbar-features/), SANS
   mini-vues/brush, SANS zoom molette, SANS features (IC / projection /
   normalisation). Ces sous-systèmes viendront ensuite ; les points d'extension
   sont signalés en commentaire (« Extension : … »). Reproduit la logique et
   l'apparence du prototype design-system/project/scripts/charts/chart.jsx.
═══════════════════════════════════════════════════════════════════════════ */

// Importation des modules
import { useId, useState } from 'react';
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
import { useSeriesHover } from '../../hooks/useSeriesHover';
import { useChartGeometry } from '../../hooks/useChartGeometry';

import ChartAxisBottom from '../ChartAxis/ChartAxisBottom/ChartAxisBottom';
import ChartAxisLeft from '../ChartAxis/ChartAxisLeft/ChartAxisLeft';
import ChannelLegend from '../ChartLegend/ChannelLegend/ChannelLegend';
import SequentialLegend from '../ChartLegend/SequentialLegend/SequentialLegend';
import LineMarks from '../marks/LineMarks/LineMarks';
import BarMarks from '../marks/BarMarks/BarMarks';
import HeatmapMarks from '../marks/HeatmapMarks/HeatmapMarks';
import DensityMarks from '../marks/DensityMarks/DensityMarks';
import ViolinMarks from '../marks/ViolinMarks/ViolinMarks';
import { VoronoiOverlay, DirectHoverOverlay, ActiveMark } from '../overlays/HoverOverlays/HoverOverlays';
import ChartTooltip from '../ChartTooltip/ChartTooltip';
import './Chart.scss';

/* ────────────────────────── Cibles de survol ─────────────────────────────
   Centroïdes (déjà projetés en pixels) de chaque mark survolable, calculés par
   type de graphique afin que la tooltip et le surlignage fonctionnent partout.
   Porté de chart.jsx (sans la couche zoom : la v1 traite line/density ici même,
   en coordonnées directes). ─────────────────────────────────────────────── */
function computeHoverTargets({
  chartKind, filteredData, channels, xScale, yScale, x, y, z,
  stack, stackMain, innerWidth, innerHeight, fill,
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
    const horizontal = chartKind === 'bar-h';
    const bandKey = horizontal ? y : x;
    const valKey = horizontal ? x : y;
    const bandScale = horizontal ? yScale : xScale;
    const valScale = horizontal ? xScale : yScale;
    const seriesList = groupSeries(filteredData, channels);
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
    const seriesList = groupSeries(filteredData, channels);
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
   dépendante de la LARGEUR (géométrie, échelles de position, marks, survol)
   vit ici, où l'appel de hooks au top-level reste conforme aux règles React.
   ───────────────────────────────────────────────────────────────────────── */
const ChartCanvas = ({
  width, height, data, x, y, z, xType, yType, zType, chartKind,
  channels, hueCols, fill, effFill, stack, format, labels, maxLabelLength, maxLines,
  overlap, tickDensity, isSequentialZ, isViolinKind,
  cScale, styleScaleFn, hatchScaleFn, markerScaleFn,
  hovered, voronoiRow, setVoronoiRow,
}) => {
  const { margins, innerWidth, innerHeight, yTickW } = useChartGeometry({
    chartKind, data, x, y, xType, yType, format, labels, maxLabelLength, maxLines,
    overlap, tickDensity, width, height,
  });

  // État local de la marque active (survol) : position pixel + ancrage tooltip.
  const [activePos, setActivePos] = useState(null);
  const [activeCentroid, setActiveCentroid] = useState(null);
  const active = voronoiRow; // la row sous le curseur

  // Extension : les IC + la projection étendront le domaine de l'axe valeur.
  const augValExtent = null;

  // ── Empilage (line / bar / bar-h) ────────────────────────────────────────
  const stackable = chartKind === 'line' || chartKind === 'bar' || chartKind === 'bar-h';
  const stackActive = stackable && stack && stack !== 'none';
  const stackPosKey = chartKind === 'bar-h' ? y : x;
  const stackValKey = chartKind === 'bar-h' ? x : y;
  const seriesOrder = groupSeries(data, channels).map((s) => s.key);
  const stackMain = stackActive
    ? buildStacks({ data, posKey: stackPosKey, valKey: stackValKey, channels, stackBy: stack, seriesOrder, aggregate: 'mean' })
    : null;

  // ── Échelles de position (axe valeur ancré à 0 ; extension augValExtent) ──
  let baseXScale;
  if (chartKind === 'bar-h' && xType === 'number') {
    if (stackActive) {
      let lo = 0, hi = stackMain.max;
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
      let lo = 0, hi = stackMain.max;
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

  // Extension : le zoom/brush filtrera les données et zoomera les échelles ici.
  const xScale = baseXScale;
  const yScale = baseYScale;
  const filteredData = data;

  // ── Cibles de survol ──────────────────────────────────────────────────────
  const hoverTargets = computeHoverTargets({
    chartKind, filteredData, channels, xScale, yScale, x, y, z,
    stack, stackMain, innerWidth, innerHeight, fill,
  });

  // Ancrage adaptatif : bulle du côté OPPOSÉ au point (flip près des bords).
  const handleHover = (target) => {
    if (target) {
      const cx = target.px, cy = target.py;
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

  // Libellé d'un canal : suit la COLONNE hue (titres corrects même quand forme
  // et style sont permutés en mode nuage).
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
    const xFmt = resolveFormatter(format.x, xType);
    const yFmt = resolveFormatter(format.y, yType);
    const zFmt = z ? resolveFormatter(format.z, zType) : null;
    const title = is3D ? (labels.z || z) : (labels.y || y);
    const hueRows = hueCols.map((c) => ({ label: labelForCol(c), value: active[c] }));
    const valueRows = [];
    valueRows.push({ label: labels.x || x, value: xFmt(active[x]) });
    if (is3D) valueRows.push({ label: labels.y || y, value: yFmt(active[y]) });
    valueRows.push({ label: 'Valeur', value: is3D ? zFmt(active[z]) : yFmt(active[y]) });
    if (z && !is3D) valueRows.push({ label: labels.z || z, value: zFmt(active[z]) });
    tooltipModel = { title, glyphSpec: tooltipGlyphSpec, hueRows, valueRows };
  }

  // ── Marks du kind détecté ────────────────────────────────────────────────
  let marks = null;
  if (chartKind === 'line') {
    marks = <LineMarks data={filteredData} x={x} y={y} channels={channels} xScale={xScale} yScale={yScale} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} hovered={hovered} fill={fill} stack={stackMain} />;
  } else if (chartKind === 'bar') {
    marks = <BarMarks data={filteredData} x={x} y={y} channels={channels} xScale={xScale} yScale={yScale} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} hovered={hovered} orient="v" fill={fill} stack={stackMain} />;
  } else if (chartKind === 'bar-h') {
    marks = <BarMarks data={filteredData} x={x} y={y} channels={channels} xScale={xScale} yScale={yScale} colorScale={cScale} styleScale={styleScaleFn} markerScale={markerScaleFn} hatchScale={hatchScaleFn} hovered={hovered} orient="h" fill={fill} stack={stackMain} />;
  } else if (chartKind === 'heatmap') {
    marks = <HeatmapMarks data={filteredData} x={x} y={y} z={z} xScale={xScale} yScale={yScale} colorScale={cScale} hovered={hovered} fill={effFill} />;
  } else if (chartKind === 'density') {
    marks = <DensityMarks data={data} x={x} y={y} z={z} channels={channels} xScale={baseXScale} yScale={baseYScale} colorScale={cScale} styleScale={styleScaleFn} hatchScale={hatchScaleFn} markerScale={markerScaleFn} hovered={hovered} innerWidth={innerWidth} innerHeight={innerHeight} fill={effFill} zoom={{ kx: 1, ky: 1 }} />;
  } else if (isViolinKind) {
    marks = <ViolinMarks data={data} x={x} y={y} z={z} channels={channels} xScale={xScale} yScale={yScale} xScaleBase={baseXScale} yScaleBase={baseYScale} colorScale={cScale} styleScale={styleScaleFn} hatchScale={hatchScaleFn} markerScale={markerScaleFn} orient={chartKind === 'violin-h' ? 'h' : 'v'} fill={effFill} stack={stack} hovered={hovered} />;
  }

  // Survol par défaut en v1 : tooltip sur le mark sous le curseur (survol direct).
  // Extension : la barre d'outils exposera le survol par proximité (voronoï).
  const voronoiOn = false;
  const clipId = 'chart-clip-' + useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <>
      <svg className="chart-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g transform={`translate(${margins.left}, ${margins.top})`}>
          <ChartAxisLeft
            scale={yScale} type={yType} length={innerHeight} width={innerWidth}
            format={format.y} maxLabelLength={maxLabelLength.y} maxLines={maxLines.y || 2}
            overlap={overlap} tickDensity={tickDensity} label={labels.y}
            tickPadX={0} labelOffset={yTickW + 10}
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
          </defs>
          <g clipPath={`url(#${clipId})`}>{marks}</g>
          {/* Survol direct (v1) : une zone de captation par mark. Extension :
              VoronoiOverlay (proximité) commutable via la barre d'outils. */}
          {voronoiOn
            ? <VoronoiOverlay points={hoverTargets} innerWidth={innerWidth} innerHeight={innerHeight} onHover={handleHover} />
            : <DirectHoverOverlay targets={hoverTargets} onHover={handleHover} />}
          {active && (
            <ActiveMark
              pos={activeCentroid}
              color={activeColor}
              marker={channels.marker ? markerScaleFn(active[channels.marker]) : 'circle'}
            />
          )}
        </g>
      </svg>
      {active && activePos && tooltipModel && (
        <ChartTooltip model={tooltipModel} position={activePos} />
      )}
    </>
  );
};

/* ────────────────────────── Chart (pivot) ────────────────────────────────── */

/**
 * Adaptive chart. Detects column types on x/y/z and picks the mark renderer.
 * Delegates to <MultiChart> when `data` is an Array<Dataset> (v1: renders null).
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
 * @param {string} [props.title] - Chart title.
 * @param {number} [props.height=460] - Outer height (px).
 * @param {Array} [props.toolbar=[]] - Feature descriptors (v1: inert).
 * @param {object} [props.defaults={}] - Initial feature state (v1: inert).
 * @param {boolean} [props.initialMinimapOpen=true] - Minimap open by default (v1: inert).
 * @returns {JSX.Element}
 */
const Chart = ({
  data, x, y, z, hue,
  fill = 'line', stack = 'none',
  format = {}, labels = {}, maxLabelLength = {}, maxLines = {},
  overlap = 'auto', tickDensity = 'normal',
  title, height = 460,
  // Extension : la barre d'outils configurable et les mini-vues consommeront
  // ces props une fois les sous-systèmes construits — inertes en v1.
  toolbar = [], defaults = {}, initialMinimapOpen = true,
}) => {
  // Hook AVANT tout retour anticipé (conformité règles React).
  const { hovered, setHovered, voronoiRow, setVoronoiRow, ciHover, setCiHover } = useSeriesHover();

  // Branche « data = liste de jeux » → délégation ultérieure à <MultiChart>.
  if (isDatasetList(data)) {
    // TODO MultiChart : rendre <MultiChart …/> une fois le composant construit.
    return null;
  }
  if (!y) throw new Error("<Chart>: l'argument `y` est requis.");

  const hueCols = hue ? (Array.isArray(hue) ? hue : [hue]) : [];

  // ── Détection de type + coercition ────────────────────────────────────────
  const xType = detectType(data.map((r) => r[x]));
  const yType = detectType(data.map((r) => r[y]));
  const zType = z ? detectType(data.map((r) => r[z])) : null;
  const typedData = data.map((r) => ({
    ...r,
    [x]: coerce(r[x], xType),
    [y]: coerce(r[y], yType),
    ...(z ? { [z]: coerce(r[z], zType) } : {}),
  }));

  const chartKind = detectChart({ xType, yType, zType, hasZ: !!z });
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
  // Nuage de points : couleur → forme → plein/pointillé. Sinon ordre classique.
  const legendOrder = fill === 'none' ? ['color', 'marker', 'style'] : ['color', 'style', 'marker'];
  const legendGroups = legendOrder.map((k) => byType[k]).filter(Boolean);
  const hasChannelLegend = legendGroups.length > 0;
  // Canal « style » : hachures sur barres/violon-plein/density-plein, sinon pointillés.
  const styleGlyphKind = (
    ((chartKind === 'bar' || chartKind === 'bar-h') && fill !== 'none')
    || (isViolinKind && effFill === 'fill')
    || (chartKind === 'density' && effFill === 'fill')
  ) ? 'hatch' : 'dash';

  // Route le survol de légende (un item d'IC isolerait un niveau ; en v1 aucun).
  const onLegendHover = (value, group) => {
    if (group && group.channel === 'ciband') {
      setCiHover(value == null ? null : { value });
      setHovered(null);
    } else {
      setHovered(value);
      setCiHover(null);
    }
  };

  return (
    <figure className="chart-frame">
      <figcaption className="chart-header">
        {title && <h3 className="chart-title">{title}</h3>}
        <span className="chart-kind" title={`Type détecté : ${chartKind}`}>
          {chartKind} · x:{xType} y:{yType}{z ? ` z:${zType}` : ''}{hueCols.length ? ' · hue' : ''}
        </span>
      </figcaption>

      <ParentSize className="chart-body" parentSizeStyles={{ position: 'relative', width: '100%', minHeight: height }}>
        {({ width }) => (
          // Rendu différé jusqu'à la mesure de la largeur réelle (client). Au SSR
          // et au 1er rendu, `width` vaut 0 → on ne rend rien : measureText
          // renvoie une estimation hors canvas (SSR) mais la vraie largeur au
          // client, donc rendre le SVG dans les deux cas divergerait à
          // l'hydratation. Serveur (width 0) et hydratation cliente (width 0)
          // rendent l'identique (néant), puis le ResizeObserver déclenche le
          // vrai rendu.
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
            hovered={hovered} voronoiRow={voronoiRow} setVoronoiRow={setVoronoiRow}
          />
          ) : null
        )}
      </ParentSize>

      {hasChannelLegend && !isSequentialZ && (
        <aside className="chart-legend-right">
          <ChannelLegend
            groups={legendGroups} layout="vertical"
            hovered={hovered} hoveredCI={ciHover && ciHover.value}
            onHover={onLegendHover} styleGlyph={styleGlyphKind}
          />
        </aside>
      )}
      {isSequentialZ && (
        <aside className="chart-legend-right">
          <SequentialLegend scale={cScale} label={labels.z || z} orientation="vertical" />
        </aside>
      )}
    </figure>
  );
};

export default Chart;
