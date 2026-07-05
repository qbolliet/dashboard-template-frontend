// =================================================================
// FEATURE — confidenceInterval (intervalles de confiance)
// =================================================================
// Descripteur (rôles encoder + overlay) + légende. La légende d'IC est de type
// 'ciband' : un item par NIVEAU, l'opacité décroissant vers l'extérieur, chaque
// glyphe reprenant l'apparence de la série (trait/hachure/marqueur). Survoler un
// item isole ce niveau. Porté du prototype (features.jsx : confidenceInterval,
// confidenceLegend), adapté au contrat de <ChannelLegend> du repo
// (`{ channel, label, items:[{ key, … }] }`).

// Importation des modules
import { groupSeries } from '../utils/encoding';
import ConfidenceOverlay from '../components/overlays/ConfidenceOverlay/ConfidenceOverlay';

const TWO_D = (k) => k === 'line' || k === 'bar' || k === 'bar-h';

/**
 * Builds the confidence-interval legend group (channel 'ciband': one item per
 * level, opacity encoding the level, appearance inherited from the series).
 *
 * @param {object} ctx - Light legend context (chartKind, channels, scales, filteredData).
 * @param {string} channel - Assigned free channel (unused; CI inherits series appearance).
 * @param {object} config - Feature config ({ below, above, fill, labels }).
 * @returns {{channel: 'ciband', label: string, items: Array<object>, __feature: boolean}} Legend group.
 */
export function confidenceLegend(ctx, channel, config) {
  const { below = [], above = [], fill = 'fill', labels = {} } = config;
  const isBar = ctx.chartKind === 'bar' || ctx.chartKind === 'bar-h';
  const isLine = ctx.chartKind === 'line';
  const s0 = groupSeries(ctx.filteredData, ctx.channels)[0];
  const refColor = ctx.colorScale(s0 && s0.colorVal);
  const dash = (ctx.channels.style && s0 && ctx.styleScale) ? ctx.styleScale(s0.styleVal) : null;
  const hatch = (ctx.channels.style && s0 && ctx.hatchScale) ? ctx.hatchScale(s0.styleVal) : null;
  const marker = (ctx.channels.marker && s0 && ctx.markerScale) ? ctx.markerScale(s0.markerVal) : null;
  // Mode visuel de la légende, cohérent avec l'overlay :
  //   barres → 'bars' (rectangles), hachurés seulement en 'fill' (Aire) ;
  //   lignes → 'fill' (aire) / 'line' (lignes) / 'whisker' (moustaches).
  const ciMode = isBar ? (fill === 'none' ? 'whisker' : 'bars')
    : (fill === 'fill' ? 'fill' : fill === 'line' ? 'line' : 'whisker');
  const showHatch = (isLine && fill === 'fill') || (isBar && fill === 'fill');
  const n = Math.max(below.length, above.length);
  const nBands = Math.max(n, 1);
  const fillOpacityFor = (i) => 0.30 * (nBands - i) / nBands + 0.06;
  const strokeOpacityFor = (i) => 0.85 * (nBands - i) / nBands + 0.15;
  const opFor = (ciMode === 'fill' || ciMode === 'bars') ? fillOpacityFor : strokeOpacityFor;
  const items = [];
  for (let i = 0; i < n; i++) {
    const lab = (labels.bands && labels.bands[i]) || `±${i + 1}`;
    items.push({ key: lab, color: refColor, opacity: opFor(i), dash, hatch: showHatch ? hatch : null, marker, ciMode });
  }
  return { channel: 'ciband', label: labels.legend || 'Intervalle', items, __feature: true };
}

/**
 * Confidence-interval feature factory.
 *
 * @param {object} [config] - { data, below, above, fill, labels, defaultOn, id }.
 * @returns {object} Feature descriptor.
 */
export function confidenceInterval(config = {}) {
  return {
    id: config.id || 'confidence',
    kind: 'confidence',
    label: config.label || 'Intervalles de confiance',
    icon: 'confidence',
    roles: ['encoder', 'overlay'],
    supports: TWO_D,
    defaultOn: !!config.defaultOn,
    Overlay: ConfidenceOverlay,
    // Rendue aussi dans les mini-vues : l'IC suit le graphe miniature.
    miniOverlay: ConfidenceOverlay,
    legend: confidenceLegend,
    config,
  };
}
