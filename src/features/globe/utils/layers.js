// =================================================================
// LAYERS — props `points` / `arcs` de <Globe> → spécification de calque
// =================================================================
// Chaque calque du globe se décrit comme un « mini-<Chart> » : `data`, `mark`, `hue`,
// `z`, `labels`, `format` (+ `fill`, `pulse`, `icon` pour les points). Un tableau seul
// reste accepté comme raccourci de `{ data }`, pour l'usage décoratif le plus court
// (`<Globe points={rows} />`).
//
// Module PUR (ni React ni three) : <Globe> le résout une fois par rendu, le moteur ne
// voit que les accesseurs qui en découlent.

// Marks reconnus par calque ; le premier est le défaut.
export const POINT_MARKS = ['badge', 'bubble'];
export const ARC_MARKS = ['arrow', 'line', 'glow'];

// Canaux hue par calque et par mark, dans l'ordre de `hue` (l'index EST le canal),
// comme `hue` sur <Chart> : [0] → couleur, [1] → style, [2] → forme. Le badge porte une
// icône : seule sa couleur est encodée. Les flux n'ont pas de forme.
const CHANNELS = {
  badge: ['color'],
  bubble: ['color', 'style', 'marker'],
  arc: ['color', 'style'],
};

/**
 * Normalizes a `hue` prop into the list of hue keys, in channel order.
 *
 * @param {?(string|string[])} hue - One key, or several keys.
 * @param {number} max - Number of channels the layer encodes; extra keys are dropped.
 * @returns {string[]} Non-empty string keys (empty when no hue).
 */
export const normalizeHue = (hue, max) => {
  const list = Array.isArray(hue) ? hue : [hue];
  // Chaînes non vides seulement : une clé au-delà des canaux du mark serait
  // silencieusement sans effet, on la tronque explicitement ici.
  return list.filter((k) => typeof k === 'string' && k !== '').slice(0, max);
};

// Clé de valeur : chaîne non vide, ou null.
const keyOrNull = (k) => (typeof k === 'string' && k !== '' ? k : null);

// Objet simple ou objet vide : `labels` / `format` peuvent arriver null depuis une config.
const objectOr = (o) => (o && typeof o === 'object' ? o : {});

/**
 * Resolves the `points` prop of `<Globe>`.
 *
 * @param {Array<object>|{data?: Array<object>, mark?: string, hue?: (string|string[]),
 *   z?: string, fill?: string, pulse?: boolean, icon?: function(object): string,
 *   labels?: object, format?: object}} [prop] - Array of points (shorthand for
 *   `{ data }`) or layer spec.
 * @returns {{data: Array<object>, mark: 'badge'|'bubble', hue: string[],
 *   channels: string[], z: ?string, fill: 'fill'|'line', pulse: boolean,
 *   icon: ?function(object): string, labels: object, format: object}} `channels`
 *   lists the hue channels the mark encodes, aligned on `hue`. `pulse` defaults to
 *   true for a badge and false for a bubble (a data mark stays still).
 */
export const normalizePoints = (prop) => {
  const spec = Array.isArray(prop) ? { data: prop } : objectOr(prop);
  const mark = POINT_MARKS.includes(spec.mark) ? spec.mark : POINT_MARKS[0];
  const channels = CHANNELS[mark];
  const hue = normalizeHue(spec.hue, channels.length);
  return {
    // Une réponse d'API peut résoudre `data: null` : le défaut de paramètre ne couvre
    // que `undefined`, d'où la garde explicite.
    data: Array.isArray(spec.data) ? spec.data : [],
    mark,
    hue,
    channels: channels.slice(0, hue.length),
    z: keyOrNull(spec.z),
    fill: spec.fill === 'line' ? 'line' : 'fill',
    pulse: typeof spec.pulse === 'boolean' ? spec.pulse : mark === 'badge',
    icon: typeof spec.icon === 'function' ? spec.icon : null,
    labels: objectOr(spec.labels),
    format: objectOr(spec.format),
  };
};

/**
 * Resolves the `arcs` prop of `<Globe>`.
 *
 * @param {Array<object>|{data?: Array<object>, mark?: string, hue?: (string|string[]),
 *   z?: string, labels?: object, format?: object}} [prop] - Array of flows (shorthand
 *   for `{ data }`) or layer spec.
 * @returns {{data: Array<object>, mark: 'arrow'|'line'|'glow', hue: string[],
 *   channels: string[], z: ?string, labels: object, format: object}}
 */
export const normalizeArcs = (prop) => {
  const spec = Array.isArray(prop) ? { data: prop } : objectOr(prop);
  const hue = normalizeHue(spec.hue, CHANNELS.arc.length);
  return {
    data: Array.isArray(spec.data) ? spec.data : [],
    mark: ARC_MARKS.includes(spec.mark) ? spec.mark : ARC_MARKS[0],
    hue,
    channels: CHANNELS.arc.slice(0, hue.length),
    z: keyOrNull(spec.z),
    labels: objectOr(spec.labels),
    format: objectOr(spec.format),
  };
};
