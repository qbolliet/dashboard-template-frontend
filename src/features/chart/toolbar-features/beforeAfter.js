// =================================================================
// FEATURE — beforeAfter (projection avant/après une barre)
// =================================================================
// Descripteur (rôles encoder + overlay + interaction) + légende. La projection
// se distingue de la vraie série par un canal libre selon le nombre de hue :
// couleur (0), trait (1) ou marqueur (≥2). Mode `replace` : la série principale
// est masquée d'un côté (clip géré côté <Chart> via `mainClip`). Porté du
// prototype (features.jsx : beforeAfter, beforeAfterLegend), adapté au contrat de
// <ChannelLegend> du repo.

// Importation des modules
import { groupSeries, PALETTE } from '../utils/encoding';
import { PROJ_DIST_MARKER } from './channelAssign';
import BeforeAfterOverlay from '../components/overlays/BeforeAfterOverlay/BeforeAfterOverlay';

const TWO_D = (k) => k === 'line' || k === 'bar' || k === 'bar-h';

/**
 * Builds the projection legend group. Its channel matches the distinction channel
 * (color at hue 0, style at hue 1, marker beyond) so the single item reads like
 * the projected series.
 *
 * @param {object} ctx - Light legend context (channels, scales, filteredData).
 * @param {string} channel - Assigned free channel (unused; derived from nHue).
 * @param {object} config - Feature config ({ side, replace, color, dash, label, labels }).
 * @returns {{channel: string, label: string, items: Array<object>, __feature: boolean}} Legend group.
 */
export function beforeAfterLegend(ctx, channel, config) {
  const ch = ctx.channels;
  const nHue = (ch.color ? 1 : 0) + (ch.style ? 1 : 0) + (ch.marker ? 1 : 0);
  const s0 = groupSeries(ctx.filteredData, ch)[0];
  const refColor = ctx.colorScale(s0 && s0.colorVal);
  const value = config.label || (config.side === 'after' ? 'Après' : 'Avant');
  const replace = !!config.replace;
  let item, channelType;
  if (replace) {
    // Identique à la série : un trait dans la couleur de série (style hérité).
    channelType = 'style';
    item = { key: value, color: refColor, dash: (ch.style && ctx.styleScale && s0) ? ctx.styleScale(s0.styleVal) : null };
  } else if (nHue === 0) {
    channelType = 'color';
    item = { key: value, color: config.color || PALETTE[1] };
  } else if (nHue === 1) {
    channelType = 'style';
    item = { key: value, color: refColor, dash: config.dash || '6 4' };
  } else {
    channelType = 'marker';
    item = { key: value, color: refColor, marker: PROJ_DIST_MARKER };
  }
  return {
    channel: channelType,
    label: (config.labels && config.labels.legend) || 'Projection',
    items: [item],
    __feature: true,
  };
}

/**
 * Before/after projection feature factory.
 *
 * @param {object} [config] - { data, value, side, draggable, replace, color, dash, label, ci, labels, id }.
 * @returns {object} Feature descriptor.
 */
export function beforeAfter(config = {}) {
  return {
    id: config.id || 'beforeAfter',
    kind: 'beforeAfter',
    label: config.label || 'Barre avant / après',
    icon: 'beforeAfter',
    roles: ['encoder', 'overlay', 'interaction'],
    supports: TWO_D,
    defaultOn: !!config.defaultOn,
    initialValue: config.value,
    Overlay: BeforeAfterOverlay,
    legend: beforeAfterLegend,
    // clip de la série principale quand replace : renvoie le côté à GARDER.
    mainClip: config.replace ? (config.side === 'after' ? 'before' : 'after') : null,
    config,
  };
}
