// =================================================================
// useChartGeometry — marges adaptatives, innerWidth / innerHeight
// =================================================================
// Dérivation pure (aucun état / effet) portée de la logique de marges du
// prototype (design-system/project/scripts/charts/chart.jsx). Deux mesures
// clés s'ADAPTENT au contenu :
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
 * (measured categorical tick width + optional axis label) and bottom margin
 * (predicted x-axis height), then the inner drawing rectangle.
 *
 * Point d'extension (étapes suivantes) : la réservation de marge pour les
 * mini-vues (minimap x sous l'axe, minimap y à gauche) n'est PAS faite en v1
 * (yMinimapW = 0, footer = 0). Elle s'ajoutera ici sans changer la signature.
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
 * @returns {{ margins: {top:number,right:number,bottom:number,left:number},
 *   innerWidth: number, innerHeight: number, yTickW: number, xAxisH: number }}
 */
export function useChartGeometry({
  chartKind, data, x, y, xType, yType,
  format = {}, labels = {}, maxLabelLength = {}, maxLines = {},
  overlap = 'auto', tickDensity = 'normal', width, height,
}) {
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

  const marginTop = 16;
  const marginRight = 28;
  const marginLeft = yTickW + yTickGap + yLabelW + yLabelGap;
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
  const innerHeight = Math.max(120, height - marginTop - xAxisH);

  return { margins, innerWidth, innerHeight, yTickW, xAxisH };
}
