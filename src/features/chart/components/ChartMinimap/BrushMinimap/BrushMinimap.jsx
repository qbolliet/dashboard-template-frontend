// =================================================================
// BrushMinimap — mini-graphique + brush (@visx/brush) X ou Y
// =================================================================
// Mini-vue sous l'axe x (direction "x") ou à gauche de l'axe y (direction "y"),
// surmontée d'un brush. Le CONTENU (`content`) est fourni par le parent : réplique
// miniature des marks en 2-D, projection 1-D (MiniProjection) en 3-D. Le brush
// notifie le parent du domaine sélectionné et reflète toute sélection externe
// (zoom molette, réinitialisation).

// Importation des modules
import { useEffect, useId, useRef } from 'react';
import { Brush } from '@visx/brush';
import { scaleLinear } from '@visx/scale';
import './BrushMinimap.scss';

// Taille des poignées de redimensionnement (cf. ChartMinimap/_tokens.scss).
const HANDLE_SIZE = 6;

/**
 * A brush minimap over a miniature replica/projection of the chart, clipped to
 * the brushable surface. Emits the selected domain and mirrors an external one.
 *
 * @param {object} props
 * @param {'x'|'y'} [props.direction='x'] - Brush axis.
 * @param {number} props.width - Minimap width (px).
 * @param {number} props.height - Minimap height (px).
 * @param {object} props.scale - Position scale of the brushed axis (band for
 *   categorical, linear/time otherwise). Its pixel range must span [0, width|height].
 * @param {?Array} props.selection - External selection ([v0,v1] continuous /
 *   [cat0,cat1] categorical), or null for the un-zoomed (full) state.
 * @param {Function} props.onChange - Called with the new selection (or null when cleared).
 * @param {React.ReactNode} props.content - Miniature content rendered under the brush.
 * @returns {JSX.Element}
 */
const BrushMinimap = ({
  direction = 'x', width, height, scale, selection, onChange, content,
}) => {
  const isX = direction === 'x';
  // Échelle catégorielle (band) → pas d'`invert` ; sinon continue (linear/time).
  const isCategorical = typeof scale.invert !== 'function';
  const isDate = !isCategorical && scale.domain()[0] instanceof Date;

  const brushRef = useRef(null);          // instance BaseBrush (updateBrush / state)
  const isProgrammatic = useRef(false);   // ignore le prochain onChange (mouvement piloté)
  const isUserBrushing = useRef(false);   // vrai pendant un geste utilisateur

  const clipId = `chart-minimap-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // ── Conversions sélection ↔ pixels (le long de l'axe brushé) ──────────────
  // Pixels d'une sélection : par index de bande (catégoriel, scale.step) ou par
  // projection directe (continu). Réordonnés [min, max].
  const selectionToPixels = (sel) => {
    if (!sel) return null;
    if (isCategorical) {
      const dom = scale.domain();
      const i0 = dom.indexOf(sel[0]);
      const i1 = dom.indexOf(sel[1]);
      if (i0 < 0 || i1 < 0) return null;
      const step = scale.step ? scale.step() : (isX ? width : height) / Math.max(1, dom.length);
      return [Math.min(i0, i1) * step, (Math.max(i0, i1) + 1) * step];
    }
    const p0 = scale(sel[0]);
    const p1 = scale(sel[1]);
    if (p0 == null || p1 == null || isNaN(p0) || isNaN(p1)) return null;
    return [Math.min(p0, p1), Math.max(p0, p1)];
  };

  // Domaine @visx/brush → sélection. Continu : bornes réordonnées [min, max]
  // (l'axe y a un range inversé → invert() rend [haut, bas]) ; date : re-Daté
  // pour rester cohérent avec restrictScale/filtrage. Catégoriel : 1re et
  // dernière bande de la plage.
  const domainToSel = (domain) => {
    if (isCategorical) {
      const values = isX ? domain.xValues : domain.yValues;
      if (!values || values.length === 0) return null;
      return [values[0], values[values.length - 1]];
    }
    const a = isX ? domain.x0 : domain.y0;
    const b = isX ? domain.x1 : domain.y1;
    if (a == null || b == null) return null;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    return isDate ? [new Date(lo), new Date(hi)] : [lo, hi];
  };

  // ── Callbacks du brush ────────────────────────────────────────────────────
  const handleBrushStart = () => { isUserBrushing.current = true; };

  const handleBrushChange = (domain) => {
    // Mouvement programmatique (sync externe) → consommé sans renotifier.
    if (isProgrammatic.current) { isProgrammatic.current = false; return; }
    // Domaine nul transitoire (extent -1 au tout début d'un brush) → ignoré :
    // seul un END sur sélection vide (clic) doit dézoomer.
    if (!domain) return;
    const sel = domainToSel(domain);
    if (sel) onChange?.(sel);
  };

  const handleBrushEnd = (domain) => {
    isUserBrushing.current = false;
    if (isProgrammatic.current) { isProgrammatic.current = false; return; }
    if (!domain) { onChange?.(null); return; } // clic sans glissement → dézoom
    const sel = domainToSel(domain);
    onChange?.(sel ?? null);
  };

  // ── Synchronisation depuis une sélection EXTERNE (molette / réinit) ────────
  // On n'écrit dans le brush que hors geste utilisateur, et seulement si sa
  // position diffère réellement (évite une boucle onChange et un « snap » inutile).
  useEffect(() => {
    const brush = brushRef.current;
    if (!brush || isUserBrushing.current) return;
    const target = selectionToPixels(selection) ?? (isX ? [0, width] : [0, height]);
    const [a, b] = target;
    const cur = brush.state?.extent;
    if (cur) {
      const curA = isX ? Math.min(cur.x0, cur.x1) : Math.min(cur.y0, cur.y1);
      const curB = isX ? Math.max(cur.x0, cur.x1) : Math.max(cur.y0, cur.y1);
      if (Math.abs(curA - a) < 1 && Math.abs(curB - b) < 1) return;
    }
    isProgrammatic.current = true;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    brush.updateBrush((prev) => {
      const extent = isX
        ? { x0: lo, x1: hi, y0: 0, y1: height }
        : { x0: 0, x1: width, y0: lo, y1: hi };
      return {
        ...prev,
        start: { x: extent.x0, y: extent.y0 },
        end: { x: extent.x1, y: extent.y1 },
        extent,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, width, height, scale, isX]);

  // Échelle « factice » de l'axe non brushé (nécessaire à @visx/brush mais ignorée).
  const crossLen = isX ? height : width;
  const crossScale = scaleLinear({ domain: [0, crossLen], range: [0, crossLen] });

  // Position initiale du brush : sélection courante si fournie, sinon pleine
  // largeur (état dézoomé). Lue une seule fois au montage par @visx/brush.
  const initPx = selectionToPixels(selection);
  const initialBrushPosition = isX
    ? { start: { x: initPx ? initPx[0] : 0 }, end: { x: initPx ? initPx[1] : width } }
    : { start: { y: initPx ? initPx[0] : 0 }, end: { y: initPx ? initPx[1] : height } };

  return (
    <g className={`chart-minimap-brush chart-minimap-brush--${direction}`}>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={Math.max(0, width)} height={Math.max(0, height)} />
        </clipPath>
      </defs>
      <g className="chart-minimap-content" clipPath={`url(#${clipId})`}>{content}</g>
      <Brush
        innerRef={(node) => { brushRef.current = node; }}
        xScale={isX ? scale : crossScale}
        yScale={isX ? crossScale : scale}
        width={width}
        height={height}
        brushDirection={isX ? 'horizontal' : 'vertical'}
        resizeTriggerAreas={isX ? ['left', 'right'] : ['top', 'bottom']}
        initialBrushPosition={initialBrushPosition}
        handleSize={HANDLE_SIZE}
        useWindowMoveEvents={false}
        onBrushStart={handleBrushStart}
        onChange={handleBrushChange}
        onBrushEnd={handleBrushEnd}
      />
    </g>
  );
};

export default BrushMinimap;
