// =================================================================
// ARC ENCODING — colonnes hue des flux → couleur / style de trait
// =================================================================
// Pendant, pour le globe, de l'encodage par canaux du chart : `arcHue[0]` pilote
// la COULEUR (ARC_PALETTE, la palette catégorielle sans ses bleus), `arcHue[1]`
// le STYLE de trait (pointillés LINE_STYLES). Mêmes échelles ordinales que
// <Chart>, promues dans src/utils/encoding/scales.js, et légende au format de
// ChannelLegend (src/components/legend/), le composant de légende du chart.
//
// Module PUR (ni React ni three) : <Globe> l'appelle au rendu pour sa légende,
// puis transmet au moteur les accesseurs résolus. Le moteur convertit chaque
// couleur UNE fois en THREE.Color à la construction — jamais de chaîne CSS
// reparsée par frame.

// Importation des modules
import { PALETTE, colorScale, distinctVals, styleScale } from '@/utils/encoding/scales';

// Canaux dans l'ordre de `arcHue` : l'index du tableau EST le canal.
const CHANNELS = ['color', 'style'];

/**
 * Categorical palette of the flows: PALETTE without its blue hues.
 */
// Les flux se dessinent sur l'océan, bleu de jour comme de nuit : les teintes de
// PALETTE dont l'angle tombe dans la bande de l'océan (navy, steel-blue, slate)
// s'y confondent, et le navy, en tête de PALETTE, était le premier servi. On les
// retire plutôt que de réordonner la palette commune : le chart garde ses
// couleurs. Contrepartie assumée : une même modalité ne reçoit plus forcément la
// même teinte sur un chart et sur le globe.
// Filtrage sur l'ANGLE de teinte lu dans la chaîne `hsl(h, s%, l%)`, pas sur des
// index : une teinte ajoutée à PALETTE est classée d'elle-même. La bande
// [195°, 235°] garde le teal (183°) et l'indigo (251°), bien lisibles.
const OCEAN_HUE_MIN = 195;
const OCEAN_HUE_MAX = 235;
const hueOf = (hsl) => parseFloat(hsl.slice(hsl.indexOf('(') + 1));
export const ARC_PALETTE = PALETTE.filter((c) => {
  const h = hueOf(c);
  return h < OCEAN_HUE_MIN || h > OCEAN_HUE_MAX;
});

// Nombre maximal de longueurs d'un motif de tirets : le fragment shader des
// flux les reçoit dans un vec4. Tous les styles de LINE_STYLES y tiennent.
export const MAX_DASH_PARTS = 4;

/**
 * Normalizes the `arcHue` prop into the ordered list of active hue keys.
 *
 * @param {?(string|string[])} arcHue - One key, or up to two keys (color, style).
 * @returns {string[]} Active keys, in channel order (empty when no hue).
 */
export const normalizeArcHue = (arcHue) => {
  const list = Array.isArray(arcHue) ? arcHue : [arcHue];
  // Chaînes non vides seulement, et deux canaux au plus : un troisième nom serait
  // silencieusement sans effet, on le tronque explicitement ici.
  return list.filter((k) => typeof k === 'string' && k !== '').slice(0, CHANNELS.length);
};

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
  // Liste impaire répétée, comme le fait le navigateur pour stroke-dasharray :
  // sans cela, '5' serait un tiret de 5 px suivi d'un vide nul, donc un trait plein.
  const even = parts.length % 2 ? [...parts, ...parts] : parts;
  // Troncature à un nombre PAIR d'entrées, pour garder l'alternance tiret / vide.
  return even.slice(0, MAX_DASH_PARTS);
};

/**
 * Resolves the hue encoding of the globe arcs: per-arc color and dash accessors,
 * the tooltip fields and the legend groups.
 *
 * Values are matched by their string form (`2` and `'2'` are the same category),
 * exactly like the chart's series keys. An arc whose hue value is missing keeps
 * the default look: the `--globe-arc` token color, or a solid stroke.
 *
 * @param {Array<object>} arcs - Flow objects (`{ from, to, value?, ...hueKeys }`).
 * @param {?(string|string[])} arcHue - Hue keys: `[0]` → color, `[1]` → line style.
 * @param {{color?: string, style?: string}} [dataLabels] - Data titles (`labels` prop of
 *   <Globe>); each channel defaults to the key name.
 * @returns {{
 *   active: boolean,
 *   colorFor: function(object): ?string,
 *   dashFor: function(object): ?number[],
 *   fields: Array<{channel: string, key: string, label: string}>,
 *   legend: Array<{channel: string, label: string,
 *     items: Array<{key: string, color: string, dash?: ?string}>}>,
 *   matcher: function(string, string): function(object): boolean,
 * }} `colorFor` returns a CSS color string (null = token color), `dashFor` the
 *   parsed dash lengths (null = solid). `legend` holds one ChannelLegend group per
 *   active channel; a style item is drawn in the first flow color, or in
 *   `currentColor` (left to the host's CSS) without a color channel.
 *   `matcher(channel, key)` returns the predicate selecting the arcs of one legend
 *   item, for the engine's `setArcHighlight`.
 */
export const resolveArcEncoding = (arcs, arcHue, dataLabels = {}) => {
  const rows = Array.isArray(arcs) ? arcs : [];
  const labels = dataLabels ?? {};
  const keys = normalizeArcHue(arcHue);

  // Un canal par clé active : domaine (chaînes, ordre de rencontre) + échelle.
  const channels = keys.map((key, i) => {
    const channel = CHANNELS[i];
    const domain = distinctVals(rows, key).map(String);
    const scale = channel === 'color' ? colorScale(domain, ARC_PALETTE) : styleScale(domain);
    return { channel, key, label: labels[channel] ?? key, domain, scale };
  });
  const byChannel = Object.fromEntries(channels.map((c) => [c.channel, c]));

  // Valeur encodée d'un arc sur un canal, ou null si le canal est inactif ou si
  // l'arc ne porte pas la clé (il garde alors l'apparence par défaut).
  const encode = (channel, arc) => {
    const c = byChannel[channel];
    const v = c ? arc?.[c.key] : null;
    return v == null ? null : c.scale(String(v));
  };

  // Couleur des glyphes de style, comme `refColor` dans <Chart> : la première
  // teinte servie s'il y a un canal couleur. Sinon les flux prennent le token
  // --globe-arc, qui dépend du thème : `currentColor` laisse la feuille de style
  // de l'hôte le fournir (un var() n'est pas permis dans un attribut SVG).
  const color = byChannel.color;
  const refColor = color && color.domain.length ? color.scale(color.domain[0]) : 'currentColor';

  return {
    active: channels.length > 0,
    colorFor: (arc) => encode('color', arc),
    dashFor: (arc) => parseDash(encode('style', arc)),
    fields: channels.map(({ channel, key, label }) => ({ channel, key, label })),
    legend: channels.map(({ channel, label, domain, scale }) => ({
      channel,
      label,
      // La légende garde le dash-array SVG brut ('6 4') : il est consommé tel quel
      // par l'attribut stroke-dasharray de son glyphe.
      items: domain.map((key) => (channel === 'color'
        ? { key, color: scale(key) }
        : { key, color: refColor, dash: scale(key) })),
    })),
    matcher: (channel, key) => {
      const c = byChannel[channel];
      return c ? (arc) => arc?.[c.key] != null && String(arc[c.key]) === key : () => false;
    },
  };
};
