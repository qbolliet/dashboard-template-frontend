// =================================================================
// useBrushZoom — sélections de brush, échelles zoomées, filtrage, molette
// =================================================================
// Le zoom NE recalcule jamais les marks « pixel »
// coûteux (voronoï, contours KDE) : ceux-ci sont produits une fois en
// coordonnées de BASE puis agrandis par une transformation SVG affine dont les
// facteurs {zx, zy} sont exposés ici (cf. Chart.jsx, groupe .chart-zoom-content).
//
// Deux niveaux d'échelle coexistent :
//   • échelle de BASE  — domaine complet (mini-vues, calcul KDE/voronoï, calque
//     de preview pendant un drag) ;
//   • échelle ZOOMÉE   — domaine restreint à la sélection COMMITTÉE (axes, marks
//     à bandes, repositionnement des violons) : GELÉE pendant un geste de drag.
//
// Pendant un geste de drag du brush, le brouillon de sélection ne passe PAS par
// un setState : un re-rendu React par frame re-rendrait les marks (la granularité
// des scopes du React Compiler ne préserve pas leur identité, mesuré sur bar).
// Il est stocké dans une ref et le `transform` affine base→brouillon est écrit
// DIRECTEMENT (setAttribute) sur les groupes SVG enregistrés (`previewTargets`) :
// coût par frame quasi nul, aucun rendu React.

// Importation des modules
import { useEffect, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '@/hooks/layoutEffect/useIsomorphicLayoutEffect';

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

/**
 * Builds the SVG `transform` string applying a pair of affine axis zoom factors
 * (see {@link axisZoomFactors}) to a group rendered in BASE coordinates.
 *
 * @param {{k: number, t: number}} zx - x-axis factors.
 * @param {{k: number, t: number}} zy - y-axis factors.
 * @returns {string} `translate(tx, ty) scale(kx, ky)`.
 */
export function zoomTransformOf(zx, zy) {
  return `translate(${zx.t.toFixed(3)}, ${zy.t.toFixed(3)}) scale(${zx.k.toFixed(5)}, ${zy.k.toFixed(5)})`;
}

/* ────────────────────────── Hook principal ───────────────────────────────── */

/**
 * Brush-driven zoom state for a chart: brush selections, zoomed scales, brush-
 * filtered data and the affine zoom factors, plus wheel-zoom wiring.
 *
 * Two selection levels coexist so a brush DRAG stays cheap on large datasets:
 * the COMMITTED selection (`xSel`/`ySel`, set once on gesture release or by the
 * wheel) drives the expensive pipeline (`filteredData`, restricted scales,
 * stacks), while the DRAFT selection (`previewXSel`/`previewYSel`, fed every
 * frame by the minimap's `onPreview`) bypasses React entirely: it is kept in a
 * ref and imperatively writes the base→draft affine `transform` attribute onto
 * the SVG groups registered through `previewTargets`. During a gesture the
 * caller renders its marks once in BASE coordinates inside those groups; on
 * release the commit setters clear the draft and React takes back over.
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
 * @param {Array<{current: ?SVGGElement}>} [params.previewTargets=[]] - Refs of the
 *   SVG groups whose `transform` attribute mirrors the in-gesture draft selection
 *   (imperative preview layer). Unmounted refs (null current) are skipped.
 * @returns {{
 *   xSel: ?Array, ySel: ?Array, setXSel: Function, setYSel: Function,
 *   previewXSel: Function, previewYSel: Function,
 *   xScale: object, yScale: object, filteredData: Array<object>,
 *   axisZoom: {zx: {k:number,t:number}, zy: {k:number,t:number}},
 *   resetZoom: Function, canReset: boolean,
 * }}
 */
export function useBrushZoom({
  data, x, y, xType, yType, chartKind,
  baseXScale, baseYScale, innerWidth, innerHeight,
  marginLeft, marginTop, width, svgRef, zoomOn = true,
  previewTargets = [],
}) {
  const [xSel, setXSelRaw] = useState(null); // sélection COMMITTÉE x (null = plein axe)
  const [ySel, setYSelRaw] = useState(null); // sélection COMMITTÉE y
  // Brouillon de GESTE (preview) : dans une ref, JAMAIS dans un state — cf.
  // l'en-tête du fichier (un setState par frame re-rendrait les marks).
  const draftRef = useRef({ x: null, y: null });

  // Commit d'une sélection : pose la valeur ET purge le brouillon — le
  // relâchement du brush, le zoom molette et la réinitialisation rendent donc la
  // main à React (le re-rendu committé réécrit/retire les transforms de preview).
  const clearDrafts = () => { draftRef.current.x = null; draftRef.current.y = null; };
  const setXSel = (sel) => { clearDrafts(); setXSelRaw(sel); };
  const setYSel = (sel) => { clearDrafts(); setYSelRaw(sel); };

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

  // ── Échelles zoomées COMMITTÉES (domaine restreint à la sélection) ─────────
  // Gelées pendant un geste de drag (seul le brouillon bouge) : les marks et le
  // pipeline coûteux qui en dépendent ne sont recalculés qu'au relâchement.
  const xScale = xSel ? restrictScale(baseXScale, xType, xSel) : baseXScale;
  const yScale = ySel ? restrictScale(baseYScale, yType, ySel) : baseYScale;

  // ── Facteurs affines base→zoomé (transformation visuelle sans recalcul) ────
  const zx = axisZoomFactors(baseXScale, xScale, innerWidth, xType);
  const zy = axisZoomFactors(baseYScale, yScale, innerHeight, yType);

  // ── Preview de geste (impérative, hors React) ─────────────────────────────
  // À chaque notification `onPreview` du minimap : mémorise le brouillon de
  // l'axe, calcule le transform affine base→(brouillon ?? committé) et l'écrit
  // sur les groupes enregistrés. Coût O(1) par frame, aucun rendu React — au
  // relâchement, le commit purge le brouillon et le rendu React reprend la main
  // sur l'attribut (valeur JSX du groupe).
  const applyPreview = () => {
    const dx = draftRef.current.x;
    const dy = draftRef.current.y;
    const xs = dx ? restrictScale(baseXScale, xType, dx) : xScale;
    const ys = dy ? restrictScale(baseYScale, yType, dy) : yScale;
    const t = zoomTransformOf(
      axisZoomFactors(baseXScale, xs, innerWidth, xType),
      axisZoomFactors(baseYScale, ys, innerHeight, yType),
    );
    for (const ref of previewTargets) if (ref.current) ref.current.setAttribute('transform', t);
  };
  const previewXSel = (sel) => { draftRef.current.x = sel; applyPreview(); };
  const previewYSel = (sel) => { draftRef.current.y = sel; applyPreview(); };

  // Ré-assertion du brouillon après CHAQUE rendu committé : React vient d'écrire
  // la valeur JSX du transform (base→COMMITTÉ) sur les mêmes groupes, ce qui
  // écraserait le brouillon écrit impérativement. Les deux écritures ne sont pas
  // ordonnées de façon fiable — @visx/brush émet `onChange` depuis un callback de
  // setState et @visx/drag depuis un effet de layout, donc dans un commit qui
  // n'est pas forcément celui qui porte l'écriture React (typiquement au tout
  // début du geste, quand `isBrushing` bascule). Plutôt que de parier sur l'ordre,
  // on redonne le dernier mot à la couche impérative, avant le paint.
  // Hors geste, le brouillon est purgé par les setters de commit → l'effet ne fait
  // rien et React garde la main sur l'attribut.
  useIsomorphicLayoutEffect(() => {
    if (draftRef.current.x || draftRef.current.y) applyPreview();
  });

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
    previewXSel, previewYSel,
    xScale, yScale, filteredData,
    axisZoom: { zx, zy },
    resetZoom, canReset,
  };
}
