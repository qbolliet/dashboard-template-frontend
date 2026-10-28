// =================================================================
// HUE ENCODING — colonnes hue d'un calque → couleur / style / forme
// =================================================================
// Pendant, pour les deux calques du globe, de l'encodage par canaux de <Chart> : la
// clé `hue[0]` pilote la COULEUR (GLOBE_PALETTE, la palette catégorielle sans ses
// bleus), `hue[1]` le STYLE (pointillé LINE_STYLES d'un flux ou d'un contour de bulle,
// hachure HATCH_TYPES d'une bulle pleine), `hue[2]` la FORME d'une bulle
// (MARKER_TYPES). Mêmes échelles ordinales que <Chart>, promues dans
// src/utils/encoding/scales.js, et légende au format de ChannelLegend
// (src/components/legend/).
//
// Module PUR (ni React ni three) : <Globe> l'appelle au rendu pour sa légende et sa
// tooltip, puis transmet au moteur les accesseurs résolus. Le moteur convertit chaque
// couleur de flux UNE fois en THREE.Color à la construction — jamais de chaîne CSS
// reparsée par frame.

// Importation des modules
import {
  PALETTE, colorScale, distinctVals, hatchScale, markerScale, styleScale,
} from '@/utils/encoding/scales';

/**
 * Categorical palette of the globe (flows and points): PALETTE without its blue hues.
 */
// Flux et points se dessinent sur l'océan, bleu de jour comme de nuit : les teintes de
// PALETTE dont l'angle tombe dans la bande de l'océan (navy, steel-blue, slate) s'y
// confondent, et le navy, en tête de PALETTE, était le premier servi. On les retire
// plutôt que de réordonner la palette commune : le chart garde ses couleurs.
// Contrepartie assumée : une même modalité ne reçoit plus forcément la même teinte sur
// un chart et sur le globe — mais elle reçoit la même sur les deux calques du globe.
// Filtrage sur l'ANGLE de teinte lu dans la chaîne `hsl(h, s%, l%)`, pas sur des index :
// une teinte ajoutée à PALETTE est classée d'elle-même. La bande [195°, 235°] garde le
// teal (183°) et l'indigo (251°), bien lisibles.
const OCEAN_HUE_MIN = 195;
const OCEAN_HUE_MAX = 235;
const hueOf = (hsl) => parseFloat(hsl.slice(hsl.indexOf('(') + 1));
export const GLOBE_PALETTE = PALETTE.filter((c) => {
  const h = hueOf(c);
  return h < OCEAN_HUE_MIN || h > OCEAN_HUE_MAX;
});

// Nombre maximal de longueurs d'un motif de tirets : le fragment shader des flux les
// reçoit dans un vec4. Tous les styles de LINE_STYLES y tiennent.
export const MAX_DASH_PARTS = 4;

/**
 * Parses an SVG-like dash-array (`'6 4'`) into pixel lengths for the arc shader.
 *
 * Follows the SVG rules: an odd-length list is repeated once to make it even
 * (`'5'` → `[5, 5]`), and an all-zero or empty list means a solid stroke.
 * Lists longer than {@link MAX_DASH_PARTS} are truncated to that many entries.
 *
 * @param {?string} dash - Dash-array, entries in px separated by spaces or commas.
 * @returns {?number[]} Dash and gap lengths in px, or null for a solid stroke.
 */
export const parseDash = (dash) => {
  if (typeof dash !== 'string') return null;
  const parts = dash.trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0);
  if (parts.length === 0 || parts.every((n) => n === 0)) return null;
  // Liste impaire répétée, comme le fait le navigateur pour stroke-dasharray : sans
  // cela, '5' serait un tiret de 5 px suivi d'un vide nul, donc un trait plein.
  const even = parts.length % 2 ? [...parts, ...parts] : parts;
  // Troncature à un nombre PAIR d'entrées, pour garder l'alternance tiret / vide.
  return even.slice(0, MAX_DASH_PARTS);
};

/**
 * Resolves the hue encoding of one globe layer: per-row channel accessors, the
 * tooltip fields and the legend groups.
 *
 * Values are matched by their string form (`2` and `'2'` are the same category),
 * exactly like the chart's series keys. A row whose hue value is missing keeps the
 * default look of its channel (token color, solid stroke, no hatch, disc).
 *
 * @param {Array<object>} rows - Layer rows (`points` or `arcs`).
 * @param {string[]} keys - Hue keys, aligned on `channels`.
 * @param {string[]} channels - Encoded channels, from `normalizePoints` /
 *   `normalizeArcs`: a subset of `['color', 'style', 'marker']`, in that order.
 * @param {{layer?: 'points'|'arcs', labels?: object, colorDomain?: string[]}} [options] -
 *   `layer` tags the legend groups (routing of the legend hover); `labels` titles each
 *   channel (`color`, `style`, `marker`) and defaults to the key name; `colorDomain`
 *   lists the color values another layer already took (its `colorDomain` output): this
 *   layer's colors continue the palette after them, and a value shared by both layers
 *   keeps the same color.
 * @returns {{
 *   active: boolean,
 *   colorDomain: string[],
 *   colorFor: function(object): ?string,
 *   dashFor: function(object): ?string,
 *   hatchFor: function(object): ?string,
 *   markerFor: function(object): ?string,
 *   fields: Array<{channel: string, key: string, label: string}>,
 *   legend: Array<{channel: string, layer: ?string, label: string,
 *     items: Array<{key: string, color: string, dash?: ?string, hatch?: ?string,
 *     marker?: string}>}>,
 *   matcher: function(string, string): function(object): boolean,
 * }} `colorFor` returns a CSS color (null = token color), `dashFor` the SVG
 *   dash-array (null = solid; parse it with `parseDash` for the arc shader),
 *   `hatchFor` the hatch type, `markerFor` the marker type (null = disc). `legend`
 *   holds one ChannelLegend group per channel; style and marker items are drawn in
 *   the first color served, or in `currentColor` (left to the host's CSS) without a
 *   color channel. `matcher(channel, key)` selects the rows of one legend item, for
 *   the engine's `setArcHighlight` / `setPointHighlight`. `colorDomain` is the color
 *   domain actually served (`options.colorDomain` first), to chain another layer.
 */
export const resolveHueEncoding = (rows, keys, channels, { layer = null, labels = {}, colorDomain = [] } = {}) => {
  const data = Array.isArray(rows) ? rows : [];
  const titles = labels ?? {};

  // Un canal par clé active : domaine (chaînes, ordre de rencontre) + échelle(s). Le
  // style porte DEUX échelles parallèles (pointillé et hachure, même domaine → même
  // index), comme sur <Chart> : le dessin choisit selon le mode plein ou contour.
  //
  // Couleur : deux calques colorés par des colonnes DIFFÉRENTES ne doivent pas se
  // partager les mêmes teintes (« Europe » des points et « rail » des flux en rouge
  // tous deux). L'échelle couvre donc le domaine déjà servi par l'autre calque, puis le
  // sien : ses modalités prennent les teintes suivantes, et une modalité commune aux
  // deux garde sa teinte. La légende ne liste que les modalités de CE calque.
  const taken = (colorDomain ?? []).map(String);
  const list = (keys ?? []).map((key, i) => {
    const channel = channels[i];
    const domain = distinctVals(data, key).map(String);
    const served = channel === 'color' ? [...new Set([...taken, ...domain])] : domain;
    return {
      channel, key, label: titles[channel] ?? key, domain, served,
      color: channel === 'color' ? colorScale(served, GLOBE_PALETTE) : null,
      dash: channel === 'style' ? styleScale(domain) : null,
      hatch: channel === 'style' ? hatchScale(domain) : null,
      marker: channel === 'marker' ? markerScale(domain) : null,
    };
  });
  const byChannel = Object.fromEntries(list.map((c) => [c.channel, c]));

  // Valeur encodée d'une ligne sur un canal, ou null si le canal est inactif ou si la
  // ligne ne porte pas la clé (elle garde alors l'apparence par défaut).
  const encode = (channel, scale, row) => {
    const c = byChannel[channel];
    const v = c ? row?.[c.key] : null;
    return v == null ? null : c[scale](String(v));
  };

  // Couleur des glyphes de style et de forme, comme `refColor` dans <Chart> : la
  // première teinte servie s'il y a un canal couleur. Sinon la ligne prend le token
  // du calque, qui dépend du thème : `currentColor` laisse la feuille de style de
  // l'hôte le fournir (un var() n'est pas permis dans un attribut SVG).
  const color = byChannel.color;
  const refColor = color && color.domain.length ? color.color(color.domain[0]) : 'currentColor';

  const itemsOf = (c) => c.domain.map((key) => {
    if (c.channel === 'color') return { key, color: c.color(key) };
    // La légende garde le dash-array SVG brut ('6 4') : il est consommé tel quel par
    // l'attribut stroke-dasharray de son glyphe.
    if (c.channel === 'style') return { key, color: refColor, dash: c.dash(key), hatch: c.hatch(key) };
    return { key, color: refColor, marker: c.marker(key) };
  });

  return {
    active: list.length > 0,
    colorDomain: byChannel.color ? byChannel.color.served : taken,
    colorFor: (row) => encode('color', 'color', row),
    dashFor: (row) => encode('style', 'dash', row),
    hatchFor: (row) => encode('style', 'hatch', row),
    markerFor: (row) => encode('marker', 'marker', row),
    fields: list.map(({ channel, key, label }) => ({ channel, key, label })),
    legend: list.map((c) => ({ channel: c.channel, layer, label: c.label, items: itemsOf(c) })),
    matcher: (channel, key) => {
      const c = byChannel[channel];
      return c ? (row) => row?.[c.key] != null && String(row[c.key]) === key : () => false;
    },
  };
};
