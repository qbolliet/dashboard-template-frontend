// =================================================================
// useChartGeometry — marges adaptatives, innerWidth / innerHeight
// =================================================================
// Deux mesures clés s'ADAPTENT au contenu :
//   • yTickW  — largeur réelle des libellés d'ordonnée catégoriels (measureText),
//     pour que le nom d'axe se place toujours à GAUCHE des ticks ;
//   • xAxisH  — hauteur réelle de l'axe x, PRÉDITE avec la MÊME stratégie
//     anti-chevauchement que <ChartAxisBottom> (rotation / multi-lignes), pour
//     que le bas du tracé réserve exactement la place des libellés + nom d'axe.

// Importation des modules
import { measureText, tickCountFor } from '../utils/measureText';
import { resolveFormatter } from '../utils/formatters';
import { makeScale } from '../utils/scales';
import { ticksFor, TICK_FONT_SIZE } from '../components/ChartAxis/tickHelpers';

/**
 * Computes the adaptive plot geometry of a chart: outward-composed left margin
 * (measured categorical tick width + optional axis label + optional y-minimap
 * gutter) and bottom margin (predicted x-axis height), then the inner drawing
 * rectangle, plus the strips reserved for the brush minimaps.
 *
 * Réservation des mini-vues : la minimap x occupe une bande (miniH) sous l'axe,
 * et un pied de page (footerH) accueille la pastille de bascule ; la minimap y
 * s'insère à GAUCHE du tracé (entre les ticks et le bord), décalant les ticks de
 * `tickPadX` quand elle est ouverte (cf. ChartAxisLeft). Les deux ne sont
 * réservées que lorsque `minimapOpen` (mais leur pied de page reste, pour que la
 * pastille de réouverture demeure visible).
 *
 * @param {object} params
 * @param {string} params.chartKind - Detected chart kind (drives band padding).
 * @param {Array<object>} params.data - Coerced data rows (typedData).
 * @param {string} params.x - x column.
 * @param {string} params.y - y column.
 * @param {'date'|'number'|'categorical'} params.xType - x column type.
 * @param {'date'|'number'|'categorical'} params.yType - y column type.
 * @param {object} [params.format] - { x?, y? } formatter specs.
 * @param {object} [params.labels] - { x?, y? } axis labels.
 * @param {object} [params.maxLabelLength] - { x?, y? } categorical ellipsis budgets.
 * @param {object} [params.maxLines] - { x?, y? } categorical multiline budgets.
 * @param {'auto'|'rotate'|'multiline'|'skip'} [params.overlap='auto'] - Anti-overlap strategy.
 * @param {'sparse'|'normal'|'dense'} [params.tickDensity='normal'] - Tick density preset.
 * @param {number} params.width - Available outer width (px, from ParentSize).
 * @param {number} params.height - Outer SVG height (px).
 * @param {boolean} [params.minimapOpen=true] - Whether the brush minimaps are shown.
 * @returns {{ margins: {top:number,right:number,bottom:number,left:number},
 *   innerWidth: number, innerHeight: number, yTickW: number, xAxisH: number,
 *   svgH: number, showXMinimap: boolean, showYMinimap: boolean, miniH: number,
 *   minimapXH: number, footerH: number, yMinimapW: number, yMinimapGap: number,
 *   tickPadX: number }}
 */
export function useChartGeometry({
  chartKind, data, x, y, xType, yType,
  format = {}, labels = {}, maxLabelLength = {}, maxLines = {},
  overlap = 'auto', tickDensity = 'normal', width, height, minimapOpen = true,
}) {
  // ── Mini-vues applicables selon le type de graphique ──────────────────────
  const isBarH = chartKind === 'bar-h';
  const isViolin = chartKind === 'violin-v' || chartKind === 'violin-h';
  const has2DBrush = chartKind === 'heatmap' || chartKind === 'density';
  // Minimap x : sous l'axe des abscisses (la plupart des graphiques, sauf bar-h
  // dont l'axe des valeurs est horizontal).
  const showXMinimap = ['line', 'bar', 'heatmap', 'density', 'violin-v', 'violin-h'].includes(chartKind);
  // Minimap y : le long de l'axe des ORDONNÉES (2-D, barchart horizontal, violons).
  const showYMinimap = has2DBrush || isBarH || isViolin;

  // ── Largeur réservée aux ticks d'ordonnée (catégoriel : mesuré ; sinon fixe) ──
  let yTickW = 44;
  if (yType === 'categorical') {
    const fmt = resolveFormatter(format.y, 'categorical');
    const dom = [...new Set(data.map((r) => r[y]).filter((v) => v != null))];
    const maxLen = maxLabelLength.y;
    let w = 0;
    for (const d of dom) {
      let s = String(fmt(d));
      if (maxLen && s.length > maxLen) s = s.slice(0, Math.max(1, maxLen - 1)) + '…';
      w = Math.max(w, measureText(s, TICK_FONT_SIZE));
    }
    yTickW = Math.min(190, Math.max(44, Math.ceil(w) + 12));
  }
  const yTickGap = 6;
  const yLabelW = labels.y ? 16 : 0;
  const yLabelGap = labels.y ? 8 : 0;

  // ── Gouttière de la mini-vue y (réservée seulement quand ouverte) ─────────
  // Plus large pour le barchart horizontal (axe valeur miniature). `tickPadX`
  // décale les ticks de l'axe gauche pour dégager cette gouttière.
  const yMinimapW = showYMinimap ? (isBarH ? 48 : 38) : 0;
  const yMinimapGap = showYMinimap ? 10 : 0;
  const tickPadX = (showYMinimap && minimapOpen) ? (yMinimapW + yMinimapGap) : 0;

  const marginTop = 16;
  const marginRight = 28;
  const marginLeft = tickPadX + yTickW + yTickGap + yLabelW + yLabelGap;
  const innerWidth = Math.max(40, width - marginLeft - marginRight);

  // ── Hauteur réelle de l'axe x (ticks + nom d'axe) ─────────────────────────
  // Reproduit la stratégie de <ChartAxisBottom> : on reconstruit l'échelle et
  // ses ticks, on compare le libellé le plus large au budget par graduation,
  // puis on en déduit la hauteur (rotation / multi-lignes / à plat).
  const desired = tickCountFor(innerWidth, tickDensity);
  const xScale = makeScale(xType, data, x, innerWidth, 'x', chartKind);
  const ticks = ticksFor(xScale, xType, desired);
  const fmtX = resolveFormatter(format.x, xType, xType === 'date' ? xScale.domain() : null);
  const labelsArr = ticks.map((t) => String(fmtX(t)));
  const tickPx = xType === 'categorical'
    ? (xScale.bandwidth ? xScale.bandwidth() : innerWidth / Math.max(1, ticks.length))
    : innerWidth / Math.max(1, ticks.length);

  let strategy = overlap;
  if (strategy === 'auto') {
    const widest = labelsArr.reduce((m, l) => Math.max(m, measureText(l, TICK_FONT_SIZE)), 0);
    strategy = widest > tickPx - 6 ? 'rotate' : 'none';
  }
  let labelHeight;
  if (strategy === 'rotate') {
    const widest = labelsArr.reduce((m, l) => Math.max(m, measureText(l, TICK_FONT_SIZE)), 0);
    labelHeight = widest * 0.75 + 8;
  } else if (strategy === 'multiline' && xType === 'categorical') {
    labelHeight = (maxLines.x || 2) * 13 + 6;
  } else {
    labelHeight = 18;
  }
  const tickExtent = 4 + labelHeight;               // talon + libellés
  const xAxisH = labels.x ? tickExtent + 30 : tickExtent + 10; // + nom d'axe

  const margins = { top: marginTop, right: marginRight, bottom: xAxisH, left: marginLeft };

  // ── Bandes réservées aux mini-vues (dans la hauteur du SVG) ───────────────
  // footerH : pied de page hors SVG accueillant la pastille de bascule (réservé
  // dès que la minimap x est applicable, même fermée, pour rouvrir la mini-vue).
  // minimapH : bande de la mini-vue x (visible seulement quand ouverte) ; miniH
  // en est la hauteur utile (le brush garde une marge visuelle). Le SVG lui-même
  // est réduit du footer, et le tracé de la bande x + d'un léger espace.
  const footerH = showXMinimap ? 24 : 0;
  const minimapH = 44;
  const miniH = minimapH - 6;               // hauteur utile du contenu miniature
  const svgH = Math.max(160, height - footerH);
  const minimapXH = (showXMinimap && minimapOpen) ? minimapH : 0;
  const innerHeight = Math.max(120, svgH - marginTop - xAxisH - minimapXH - 8);

  return {
    margins, innerWidth, innerHeight, yTickW, xAxisH,
    svgH, showXMinimap, showYMinimap, miniH, minimapXH, footerH,
    yMinimapW, yMinimapGap, tickPadX,
  };
}
