// =================================================================
// minimapGeometry — ancrage des mini-vues : SOURCE DE VÉRITÉ UNIQUE
// =================================================================
// Constantes et formules d'ancrage des bandes de brush et de leurs pastilles de
// pli, partagées par TOUS les graphiques.
//
// Pourquoi un module à part plutôt que useChartGeometry ? Parce que <MultiChart>
// compose ses marges LUI-MÊME (marge droite dépendante de la légende, largeur de
// ticks fixe, pas de mini-vue y) et ne peut donc pas appeler le hook. Les helpers
// ci-dessous sont donc PURS et PARAMÉTRÉS par les marges de l'appelant : chacun
// garde ses marges, personne ne recopie l'ancrage.
//
// Corollaire volontaire : MINIMAP_H / MINI_H / FOOTER_H / PLOT_GAP restent PRIVÉS.
// Les appelants les obtiennent par le retour des helpers — c'est ce qui rend la
// recopie impossible.

// ── Débord des poignées du brush ──────────────────────────────────────────
// Les poignées de @visx/brush débordent de HANDLE_SIZE/2 de part et d'autre de la
// bande : c'est ce débord, et non la bande nominale, que l'œil voit comme son bord
// — donc ce à quoi la pastille doit s'aligner. BrushMinimap importe HANDLE_SIZE
// d'ici : le débord est DÉRIVÉ, jamais recopié.
export const HANDLE_SIZE = 6;
export const BRUSH_OVERSHOOT = HANDLE_SIZE / 2;

// Écart mini-vue ↔ pastille de bascule, IDENTIQUE sur les deux axes.
export const TOGGLE_GAP = 3;

// Épaisseur de la pastille. Elle dépend des tokens de
// ChartMinimap/_tokens.scss : les faire varier impose de la répercuter ici.
export const TOGGLE_THICKNESS = 17;

// ── Dimensions des bandes (privées : cf. en-tête) ─────────────────────────
const MINIMAP_H = 44;          // bande x réservée dans la hauteur
const MINI_H = MINIMAP_H - 6;  // hauteur utile du contenu miniature (marge visuelle du brush)
const FOOTER_H = 24;           // pied de page (hors SVG) accueillant la pastille x
const PLOT_GAP = 8;            // espace entre le bas de l'axe x et la bande

/**
 * Vertical layout of the x-axis minimap: the strip carved out of the chart height,
 * the resulting inner plot height, and the anchors of both the band and its toggle.
 *
 * Pure and parameterised by the caller's own margins — <Chart> (via useChartGeometry)
 * and <MultiChart> compose their margins differently but share this anchoring.
 *
 * Le pied de page est réservé dès que la mini-vue est APPLICABLE, même repliée :
 * la pastille reste affichée pour pouvoir la redéplier. La pastille, elle, suit le
 * bord VISIBLE (bande + débord des poignées) du bas de la mini-vue dépliée, et
 * celui de l'axe sinon — toujours à TOGGLE_GAP.
 *
 * @param {object} params
 * @param {number} params.height - Outer height available to the chart (px).
 * @param {number} params.marginTop - Caller's top margin (px).
 * @param {number} params.xAxisH - Caller's bottom margin, i.e. predicted x-axis height (px).
 * @param {boolean} params.showXMinimap - Whether the x minimap applies at all (master
 *   switch × chart kind). When false, nothing is reserved: no band, no footer, no toggle.
 * @param {boolean} [params.xMinimapOpen=true] - Whether the band itself is expanded.
 * @returns {{ footerH: number, svgH: number, minimapXH: number, miniH: number,
 *   innerHeight: number, xMinimapY: number, xToggleY: number, xOpen: boolean }}
 */
export function xMinimapLayout({ height, marginTop, xAxisH, showXMinimap, xMinimapOpen = true }) {
  const footerH = showXMinimap ? FOOTER_H : 0;
  const svgH = Math.max(160, height - footerH);
  const xOpen = showXMinimap && xMinimapOpen;
  const minimapXH = xOpen ? MINIMAP_H : 0;
  const innerHeight = Math.max(120, svgH - marginTop - xAxisH - minimapXH - PLOT_GAP);

  // Repère du SVG = repère du corps du graphique (ils commencent au même point).
  const xMinimapY = marginTop + innerHeight + xAxisH + PLOT_GAP;
  const xToggleY = xMinimapY + (xOpen ? MINI_H + BRUSH_OVERSHOOT : 0) + TOGGLE_GAP;

  return { footerH, svgH, minimapXH, miniH: MINI_H, innerHeight, xMinimapY, xToggleY, xOpen };
}

/**
 * Horizontal bands of the y-axis minimap: the band itself and the gutter reserved
 * for its rotated toggle. The caller composes them into its left margin (it alone
 * knows its tick width and axis label).
 *
 * La gouttière de la pastille est réservée dès que la mini-vue y est applicable,
 * même repliée — sans elle la pastille déborderait dans le padding du chart-frame.
 * Largeur = épaisseur de la pastille + 2 × (débord des poignées + écart) : la
 * pastille étant CENTRÉE dans la gouttière, son bord droit tombe alors à TOGGLE_GAP
 * du bord visible de la mini-vue — même écart que sur l'axe x.
 *
 * @param {object} params
 * @param {boolean} params.showYMinimap - Whether the y minimap applies at all.
 * @param {boolean} [params.yMinimapOpen=true] - Whether the band is expanded.
 * @param {boolean} [params.wide=false] - Wider band (horizontal bar chart: its miniature
 *   carries the value axis).
 * @returns {{ yMinimapW: number, yMinimapBand: number, yToggleW: number }}
 */
export function yMinimapLayout({ showYMinimap, yMinimapOpen = true, wide = false }) {
  // Largeur du CONTENU miniature : non nulle même repliée, pour que le contenu
  // rendu garde une largeur stable.
  const yMinimapW = showYMinimap ? (wide ? 48 : 38) : 0;
  const yMinimapGap = showYMinimap ? 10 : 0;
  const yMinimapBand = (showYMinimap && yMinimapOpen) ? (yMinimapW + yMinimapGap) : 0;
  const yToggleW = showYMinimap ? TOGGLE_THICKNESS + 2 * (BRUSH_OVERSHOOT + TOGGLE_GAP) : 0;

  return { yMinimapW, yMinimapBand, yToggleW };
}
