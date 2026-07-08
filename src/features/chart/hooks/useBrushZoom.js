// =================================================================
// useBrushZoom — sélections de brush, échelles zoomées, filtrage, molette
// =================================================================
// Le zoom NE recalcule jamais les marks « pixel »
// coûteux (voronoï, contours KDE) : ceux-ci sont produits une fois en
// coordonnées de BASE puis agrandis par une transformation SVG affine dont les
// facteurs {zx, zy} sont exposés ici (cf. Chart.jsx, groupe .chart-zoom-content).
//
// Deux niveaux d'échelle coexistent :
//   • échelle de BASE  — domaine complet (mini-vues, calcul KDE/voronoï) ;
//   • échelle ZOOMÉE   — domaine restreint à la sélection de brush (axes, marks
//     à bandes, repositionnement des violons).

// Importation des modules
import { useEffect, useRef, useState } from 'react';

/* ────────────────────────── Helpers d'échelle ────────────────────────────── */

/**
 * Restricts a base scale to a brush selection, producing the zoomed scale.
 *
 * Categorical: keeps the contiguous slice of the band domain between the two
 * selected values. Continuous (number/date): copies the scale onto the EXACT
 * selected domain (no `.nice()`, which would push the bounds to round values
 * beyond the selected data → empty leading/trailing ticks).
 *
 * @param {object} base - Base (full-domain) visx/d3 scale.
 * @param {'date'|'number'|'categorical'} type - Column type.
 * @param {Array<*>} sel - Brush selection ([v0, v1] continuous, [cat0, cat1] categorical).
 * @returns {object} The restricted (zoomed) scale.
 */
export function restrictScale(base, type, sel) {
  if (type === 'categorical') {
    const dom = base.domain();
    const i0 = dom.indexOf(sel[0]);
    const i1 = dom.indexOf(sel[1]);
    if (i0 < 0 || i1 < 0) return base;
    const sub = dom.slice(Math.min(i0, i1), Math.max(i0, i1) + 1);
    return base.copy().domain(sub);
  }
  // Domaine = sélection EXACTE, SANS .nice() : niceer étendrait le domaine vers des
  // bornes rondes AU-DELÀ des données sélectionnées → graduations de tête et de
  // queue sans données en vis-à-vis (+ marge vide aux bords). d3 place de toute
  // façon des ticks à valeurs rondes À L'INTÉRIEUR de [a, b].
  return base.copy().domain(sel);
}

/**
 * Tests whether a categorical value falls within a brush selection, comparing
 * band INDICES (not raw values) so the selection is a contiguous index range.
 *
 * @param {*} v - Row value.
 * @param {Array<*>} sel - Selected [cat0, cat1].
 * @param {Array<*>} fullDom - Full band domain.
 * @returns {boolean} True when `v`'s index lies within the selected range.
 */
export function isInCatRange(v, sel, fullDom) {
  const i = fullDom.indexOf(v);
  const i0 = fullDom.indexOf(sel[0]);
  const i1 = fullDom.indexOf(sel[1]);
  if (i < 0 || i0 < 0 || i1 < 0) return false;
  const lo = Math.min(i0, i1), hi = Math.max(i0, i1);
  return i >= lo && i <= hi;
}

/**
 * Affine base→zoomed transform of one axis: `pixelZoom = k · pixelBase + t`.
 *
 * Derived from the BOUNDS of the zoomed scale's domain, so it is exact whether
 * the scale is `.nice()`d or not (continuous) and index-affine for band scales.
 * Lets already-computed base-coordinate marks (voronoï, KDE contours) be zoomed
 * VISUALLY (SVG transform) WITHOUT recomputation.
 *
 * @param {object} baseScale - Base (full-domain) scale.
 * @param {object} zoomedScale - Restricted (zoomed) scale.
 * @param {number} length - Axis pixel extent (innerWidth / innerHeight).
 * @param {'date'|'number'|'categorical'} type - Column type.
 * @returns {{k: number, t: number}} Scale factor and translation.
 */
export function axisZoomFactors(baseScale, zoomedScale, length, type) {
  if (zoomedScale === baseScale) return { k: 1, t: 0 };
  if (type === 'categorical' || (baseScale.bandwidth && !baseScale.invert)) {
    const dom = zoomedScale.domain();
    if (!dom.length) return { k: 1, t: 0 };
    const bw = baseScale.bandwidth ? baseScale.bandwidth() : 0;
    const p0b = baseScale(dom[0]);
    const p1b = baseScale(dom[dom.length - 1]) + bw;
    if (p0b == null || isNaN(p0b) || p1b === p0b) return { k: 1, t: 0 };
    const k = length / (p1b - p0b);
    return { k, t: -k * p0b };
  }
  const [d0, d1] = zoomedScale.domain();
  const p0b = baseScale(d0), p1b = baseScale(d1);
  const p0z = zoomedScale(d0), p1z = zoomedScale(d1);
  if (p1b === p0b) return { k: 1, t: 0 };
  const k = (p1z - p0z) / (p1b - p0b);
  return { k, t: p0z - k * p0b };
}

/* ────────────────────────── Hook principal ───────────────────────────────── */

/**
 * Brush-driven zoom state for a chart: brush selections, zoomed scales, brush-
 * filtered data and the affine zoom factors, plus wheel-zoom wiring.
 *
 * The wheel handler zooms the PRINCIPAL axis for 1-D charts (x, or y for
 * horizontal bars), both axes for heatmap/density: continuous axes zoom around
 * the cursor by a 0.82 factor, categorical axes zoom by an index range. A full
 * un-zoom clears the selection (back to the base scale).
 *
 * @param {object} params
 * @param {Array<object>} params.data - Coerced data rows (full, unfiltered).
 * @param {string} params.x - x column.
 * @param {string} params.y - y column.
 * @param {'date'|'number'|'categorical'} params.xType - x column type.
 * @param {'date'|'number'|'categorical'} params.yType - y column type.
 * @param {string} params.chartKind - Detected chart kind (drives principal axis / 2-D).
 * @param {object} params.baseXScale - Base x scale (full domain).
 * @param {object} params.baseYScale - Base y scale (full domain).
 * @param {number} params.innerWidth - Plot width (px).
 * @param {number} params.innerHeight - Plot height (px).
 * @param {number} params.marginLeft - Left margin (px, cursor→plot offset).
 * @param {number} params.marginTop - Top margin (px, cursor→plot offset).
 * @param {number} params.width - Outer SVG width (px, CSS-scale correction).
 * @param {{current: SVGSVGElement|null}} params.svgRef - Ref of the chart SVG (wheel target + bounding rect).
 * @param {boolean} [params.zoomOn=true] - Whether the wheel gesture zooms. TODO(step 7):
 *   piloté par l'outil « zoom » de la barre d'outils (activé par défaut pour l'instant).
 * @returns {{
 *   xSel: ?Array, ySel: ?Array, setXSel: Function, setYSel: Function,
 *   xScale: object, yScale: object, filteredData: Array<object>,
 *   axisZoom: {zx: {k:number,t:number}, zy: {k:number,t:number}},
 *   resetZoom: Function, canReset: boolean,
 * }}
 */
export function useBrushZoom({
  data, x, y, xType, yType, chartKind,
  baseXScale, baseYScale, innerWidth, innerHeight,
  marginLeft, marginTop, width, svgRef, zoomOn = true,
}) {
  const [xSel, setXSel] = useState(null); // sélection de brush x (null = plein axe)
  const [ySel, setYSel] = useState(null); // sélection de brush y

  // ── Données filtrées par les brushes ──────────────────────────────────────
  const filteredData = data.filter((r) => {
    if (xSel) {
      const v = r[x];
      if (xType === 'categorical') {
        if (!isInCatRange(v, xSel, baseXScale.domain())) return false;
      } else if (!(v >= xSel[0] && v <= xSel[1])) {
        return false;
      }
    }
    if (ySel) {
      const v = r[y];
      if (yType === 'categorical') {
        if (!isInCatRange(v, ySel, baseYScale.domain())) return false;
      } else if (!(v >= ySel[0] && v <= ySel[1])) {
        return false;
      }
    }
    return true;
  });

  // ── Échelles zoomées (domaine restreint à la sélection) ───────────────────
  const xScale = xSel ? restrictScale(baseXScale, xType, xSel) : baseXScale;
  const yScale = ySel ? restrictScale(baseYScale, yType, ySel) : baseYScale;

  // ── Facteurs affines base→zoomé (transformation visuelle sans recalcul) ────
  const zx = axisZoomFactors(baseXScale, xScale, innerWidth, xType);
  const zy = axisZoomFactors(baseYScale, yScale, innerHeight, yType);

  // ── Zoom à la molette (axe principal pour line/bar ; 2-D heatmap/density) ──
  const applyWheelZoom = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = (width || rect.width) / rect.width; // SVG mis à l'échelle CSS
    const px = (e.clientX - rect.left) * sx - marginLeft;
    const py = (e.clientY - rect.top) * sx - marginTop;
    const factor = e.deltaY < 0 ? 0.82 : 1 / 0.82; // molette haut = zoom in

    // Zoom CATÉGORIEL : par plage d'INDEX autour du curseur (axe à bandes).
    const zoomCat = (base, sel, cursorPx, len) => {
      const fullDom = base.domain();
      const N = fullDom.length;
      if (N <= 1 || cursorPx < 0 || cursorPx > len) return sel;
      let lo = 0, hi = N - 1;
      if (sel) {
        const a = fullDom.indexOf(sel[0]), b = fullDom.indexOf(sel[1]);
        if (a >= 0 && b >= 0) { lo = Math.min(a, b); hi = Math.max(a, b); }
      }
      const winLen = hi - lo + 1;
      const frac = Math.max(0, Math.min(1, cursorPx / len));
      const cursorIdx = lo + frac * (winLen - 1);
      let newLen = Math.round(winLen * factor);
      if (factor < 1) newLen = Math.min(newLen, winLen - 1); // garantit un zoom in
      else newLen = Math.max(newLen, winLen + 1); // et un dézoom
      newLen = Math.max(1, Math.min(N, newLen));
      if (newLen >= N) return null; // dézoom complet
      if (newLen === winLen) return sel;
      let nlo = Math.round(cursorIdx - frac * (newLen - 1));
      nlo = Math.max(0, Math.min(N - newLen, nlo));
      return [fullDom[nlo], fullDom[nlo + newLen - 1]];
    };

    const zoomAxis = (base, type, sel, scaleNow, cursorPx, len) => {
      if (type === 'categorical' || !base.invert) {
        // Axe à bandes → zoom par plage d'index ; sinon pas de zoom.
        return base.bandwidth ? zoomCat(base, sel, cursorPx, len) : sel;
      }
      if (cursorPx < 0 || cursorPx > len) return sel;
      const c = +scaleNow.invert(cursorPx);
      let [d0, d1] = (sel || base.domain()).map(Number);
      let n0 = c - (c - d0) * factor, n1 = c + (d1 - c) * factor;
      const [b0, b1] = base.domain().map(Number);
      const lo = Math.min(b0, b1), hi = Math.max(b0, b1);
      n0 = Math.max(lo, n0); n1 = Math.min(hi, n1);
      if (n1 - n0 >= (hi - lo) * 0.985) return null; // dézoom complet
      if (n1 - n0 < (hi - lo) * 0.02) return sel; // zoom max
      const out = [n0, n1];
      return type === 'date' ? out.map((v) => new Date(v)) : out;
    };

    const principal = chartKind === 'bar-h' ? 'y' : 'x';
    const twoD = chartKind === 'heatmap' || chartKind === 'density';
    if (principal === 'x' || twoD) {
      const nx = zoomAxis(baseXScale, xType, xSel, xScale, px, innerWidth);
      if (nx !== xSel) setXSel(nx);
    }
    if (principal === 'y' || twoD) {
      const ny = zoomAxis(baseYScale, yType, ySel, yScale, py, innerHeight);
      if (ny !== ySel) setYSel(ny);
    }
  };

  // Le handler capture xSel/ySel/scales du rendu courant : on le stocke dans une
  // ref rafraîchie APRÈS chaque rendu (effet) pour que l'écouteur `wheel`
  // (identité stable) appelle toujours la dernière version — sans réattacher
  // l'écouteur ni recréer le handler via useCallback (React Compiler +
  // preventDefault natif). L'écriture de la ref se fait dans un effet (et non
  // pendant le rendu) pour respecter la règle react-hooks « no ref during render ».
  const wheelRef = useRef(applyWheelZoom);
  useEffect(() => { wheelRef.current = applyWheelZoom; });
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !zoomOn) return undefined;
    // `passive: false` : preventDefault empêche le scroll de la page pendant le zoom.
    const handler = (ev) => { ev.preventDefault(); wheelRef.current(ev); };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomOn, svgRef]);

  const resetZoom = () => { setXSel(null); setYSel(null); };
  const canReset = !!(xSel || ySel);

  return {
    xSel, ySel, setXSel, setYSel,
    xScale, yScale, filteredData,
    axisZoom: { zx, zy },
    resetZoom, canReset,
  };
}
