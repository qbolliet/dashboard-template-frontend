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
 * @param {Function} props.onChange - Called with the COMMITTED selection (or null when
 *   cleared): once per gesture, on release — plus the wheel/reset mirror path.
 * @param {Function} [props.onPreview] - Called continuously DURING a drag gesture with the
 *   in-progress selection. When omitted, mid-gesture notifications fall back to `onChange`
 *   (legacy behaviour). Lets the parent drive a cheap visual preview (SVG transform) while
 *   deferring its expensive pipeline (filtering, stacking) to the final `onChange`.
 * @param {React.ReactNode} props.content - Miniature content rendered under the brush.
 * @param {Function} [props.onBrushingChange] - Notifie le début (`true`) et la fin (`false`)
 *   d'un geste utilisateur, pour que le parent allège son rendu pendant le drag (ex. sauter
 *   le calcul des cibles de survol, inutiles tant qu'on glisse).
 * @returns {JSX.Element}
 */
const BrushMinimap = ({
  direction = 'x', width, height, scale, selection, onChange, onPreview, content, onBrushingChange,
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
  // Deux réciproques COHÉRENTES pour l'axe catégoriel (indispensable pour que le
  // brush ne « se décale » pas après commit et qu'une modalité UNIQUE reste
  // sélectionnable) : selectionToPixels renvoie les bornes PIXEL réelles des
  // bandes (début de la 1re → fin de la dernière) ; domainToSel retient les bandes
  // dont le CENTRE tombe dans l'extent. Les centres des bandes sélectionnées sont
  // alors dans l'intervalle, ceux des voisines non → round-trip stable.
  const selectionToPixels = (sel) => {
    if (!sel) return null;
    if (isCategorical) {
      const dom = scale.domain();
      const i0 = dom.indexOf(sel[0]);
      const i1 = dom.indexOf(sel[1]);
      if (i0 < 0 || i1 < 0) return null;
      const lo = Math.min(i0, i1), hi = Math.max(i0, i1);
      const bw = scale.bandwidth ? scale.bandwidth() : 0;
      const p0 = scale(dom[lo]);
      const p1 = scale(dom[hi]) + bw;
      if (p0 == null || isNaN(p0)) return null;
      return [p0, p1];
    }
    const p0 = scale(sel[0]);
    const p1 = scale(sel[1]);
    if (p0 == null || p1 == null || isNaN(p0) || isNaN(p1)) return null;
    return [Math.min(p0, p1), Math.max(p0, p1)];
  };

  // Domaine @visx/brush → sélection. Continu : bornes réordonnées [min, max]
  // (l'axe y a un range inversé → invert() rend [haut, bas]) ; date : re-Daté
  // pour rester cohérent avec restrictScale/filtrage.
  const domainToSel = (domain) => {
    if (isCategorical) {
      // Sélection dérivée de l'EXTENT PIXEL réel du brush (règle du CENTRE) plutôt
      // que de `domain.xValues` — fragile : @visx y ajoute des `null` (→ dézoom
      // fantôme / barres vidées) et l'inclusion des bandes dépend d'un bord (→
      // impossible d'isoler une seule modalité). Une bande est retenue si son
      // centre est dans l'extent → sélection contiguë stable et réciproque de
      // selectionToPixels.
      const dom = scale.domain();
      const bw = scale.bandwidth ? scale.bandwidth() : 0;
      const ext = brushRef.current && brushRef.current.state && brushRef.current.state.extent;
      let p0; let p1;
      if (ext) {
        p0 = isX ? Math.min(ext.x0, ext.x1) : Math.min(ext.y0, ext.y1);
        p1 = isX ? Math.max(ext.x0, ext.x1) : Math.max(ext.y0, ext.y1);
      } else {
        // Repli (extent indisponible) : xValues purgé de ses `null`.
        const raw = isX ? domain.xValues : domain.yValues;
        const values = Array.isArray(raw) ? raw.filter((v) => v != null) : [];
        if (values.length === 0) return null;
        return [values[0], values[values.length - 1]];
      }
      const centerIn = (c) => {
        const s = scale(c);
        return s != null && !isNaN(s) && (s + bw / 2) >= p0 && (s + bw / 2) <= p1;
      };
      const inside = dom.filter(centerIn);
      if (inside.length > 0) return [inside[0], inside[inside.length - 1]];
      // Extent trop étroit (aucun centre dedans, entre deux bandes) : retenir la
      // bande dont le centre est le plus proche du milieu → un geste fin sélectionne
      // TOUJOURS exactement une modalité (jamais zéro ni « au moins deux »).
      const mid = (p0 + p1) / 2;
      let best = null; let bd = Infinity;
      for (const c of dom) {
        const s = scale(c);
        if (s == null || isNaN(s)) continue;
        const d = Math.abs(s + bw / 2 - mid);
        if (d < bd) { bd = d; best = c; }
      }
      return best == null ? null : [best, best];
    }
    const a = isX ? domain.x0 : domain.y0;
    const b = isX ? domain.x1 : domain.y1;
    if (a == null || b == null) return null;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    return isDate ? [new Date(lo), new Date(hi)] : [lo, hi];
  };

  // ── Callbacks du brush ────────────────────────────────────────────────────
  const handleBrushStart = () => { isUserBrushing.current = true; onBrushingChange?.(true); };

  const handleBrushChange = (domain) => {
    // Mouvement programmatique (sync externe) → consommé sans renotifier.
    if (isProgrammatic.current) { isProgrammatic.current = false; return; }
    // Domaine nul transitoire (extent -1 au tout début d'un brush) → ignoré :
    // seul un END sur sélection vide (clic) doit dézoomer.
    if (!domain) return;
    const sel = domainToSel(domain);
    // Mi-geste : on notifie la PREVIEW (rendu allégé côté parent : simple
    // transform visuel) quand elle est câblée ; le commit (`onChange`) n'arrive
    // qu'au relâchement (handleBrushEnd). Sans `onPreview`, repli sur `onChange`
    // — comportement historique conservé pour les appelants non migrés.
    if (sel) (onPreview ?? onChange)?.(sel);
  };

  const handleBrushEnd = (domain) => {
    isUserBrushing.current = false;
    if (isProgrammatic.current) { isProgrammatic.current = false; return; }
    onBrushingChange?.(false); // fin du geste → le parent peut recalculer le survol
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
