// Importation des modules
import { clamp } from '@/utils/math/clamp';

/**
 * Pure geometry of the globe flow arrows — no three.js, no DOM.
 *
 * Each flow is a great-circle arc (slerp + bell-shaped elevation) turned into a
 * screen-space RIBBON plus an arrow HEAD at its destination. Vertices only carry
 * geographic coordinates (lon, lat, elev) and a few flags: the projection, the
 * globe ⇄ plane morph, the tiling and the extrusion to a constant on-screen width
 * all happen in ARC_VERT (shaders.js). The per-frame CPU helpers below compute the
 * on-screen arc length that drives the dashes and the ribbon cut at the head base.
 */

const PI = Math.PI;
const DEG = PI / 180;

/** Number of samples along each arc. */
export const ARC_SAMPLES = 72;

/**
 * Drawing variants of the flows: `arrow` (solid stroke + head at the destination),
 * `line` (same stroke, no head: undirected flows) and `glow` (thin additive stroke,
 * brighter towards the destination: decorative). The first one is the default.
 */
export const ARC_VARIANTS = ['arrow', 'line', 'glow'];

/**
 * Flat-map mapping of the arc elevation: a sample at `(lon, lat, elev)` sits at
 * `(lon, lat + elev * PLANE_LIFT, elev * PLANE_DEPTH)` on the plane. Shared by the
 * vertex shader (ARC_VERT), the per-frame length pass and the hover test.
 */
// PLANE_LIFT < 1 : sur le planisphère, la bosse est AJOUTÉE à la latitude, alors
// que sur le globe elle part dans la troisième dimension et se lit en
// perspective. À hauteur égale, elle se voit donc bien davantage à plat : 0,8
// ramène la flèche de l'arc à ~11 % de sa longueur à plat, contre ~25 % sur le
// globe (cf. arcHeight). L'ancien 1,7 dessinait des boucles sur les flux courts.
export const PLANE_LIFT = 0.8;
export const PLANE_DEPTH = 0.6;

/**
 * Peak elevation of an arc, proportional to the chord between its endpoints.
 *
 * @param {number} ang - Great-circle angle between the endpoints (radians).
 * @param {number} [value] - Flow intensity in [0, 1], default 0.5.
 * @returns {number} Peak elevation, in globe radii.
 */
// Proportionnelle à la CORDE (2·sin(ang/2)) et sans plancher : l'ancienne
// formule (0,14 + 0,30·ang/π + 0,10·value) imposait 0,14 rayon même à
// Paris–Francfort, d'où une boucle haute comme dix fois la distance parcourue,
// et des flux voisins issus d'un même hub qui s'enchevêtraient. Ici la flèche
// de l'arc vaut 20 à 30 % de la corde selon `value` : identique à l'ancienne
// pour un arc antipodal (0,5), et d'autant plus plate que l'arc est court.
export const arcHeight = (ang, value) => 2 * Math.sin(ang / 2) * (0.2 + 0.1 * clamp(value ?? 0.5, 0, 1));

/**
 * Horizontal tiles of each arc (multiples of 2π added to the longitude): the
 * central copy plus exactly one on each side.
 */
// POURQUOI exactement une tuile de part et d'autre, ni plus ni moins : le survol
// et les pastilles replient chaque point isole sur la tuile la plus proche du
// centre, soit lon + 2PI*k avec k = round((centerLon - lon)/2PI), tandis que
// uShift vaut 2PI*round((centerLon - midLon)/2PI). Un sommet s'ecarte de midLon
// d'au plus une demi-tuile (l'arc suit le grand cercle le plus court, donc son
// amplitude en longitude est <= PI), et deux `round` dont les arguments different
// de moins de 1 ne peuvent differer que de 1 au plus : k - uShift/2PI est donc
// TOUJOURS dans {-1, 0, +1}. La tuile que vise une pastille est ainsi toujours
// dessinee, et jamais une de plus.
export const ARC_TILES = [-1, 0, 1];

/**
 * Vertices of ONE tile of an arc: two per sample (ribbon sides) + three for the head.
 *
 * @param {number} [S=ARC_SAMPLES] - Samples along the arc.
 * @returns {number} Vertex count of one tile.
 */
export const arcTileVertexCount = (S = ARC_SAMPLES) => 2 * S + 3;

/**
 * Wraps an angle into ]-π, π] — the shortest signed longitude gap.
 *
 * @param {number} x - Angle in radians.
 * @returns {number} Wrapped angle.
 */
export const wrapPi = (x) => { const T = 2 * PI; return x - T * Math.round(x / T); };

// Vecteur unitaire de la sphère pour (lon, lat) en radians — même repère que le
// moteur (_unit) et que les shaders : y vers le nord, z vers lon = 0.
const unit = (lon, lat) => ({
  x: Math.cos(lat) * Math.sin(lon),
  y: Math.sin(lat),
  z: Math.cos(lat) * Math.cos(lon),
});

// Interpolation sphérique entre deux directions, angle déjà connu. Renvoie un
// NOUVEL objet à chaque appel : les échantillons de survol le conservent.
const slerp = (v1, v2, t, ang) => {
  if (ang < 1e-4) return { ...v1 };
  const s = Math.sin(ang);
  const a = Math.sin((1 - t) * ang) / s, b = Math.sin(t * ang) / s;
  const x = v1.x * a + v2.x * b, y = v1.y * a + v2.y * b, z = v1.z * a + v2.z * b;
  const n = Math.hypot(x, y, z) || 1;
  return { x: x / n, y: y / n, z: z / n };
};

/**
 * Builds the vertex buffers of one flow arrow: a ribbon along the great circle
 * from `a` to `b` and a triangular head at `b`, tiled three times horizontally.
 *
 * Per-vertex attributes (all tiles share the same layout, `V = 2S + 3` vertices
 * per tile):
 * - `position` (lon, lat, elev) — sample coordinates, longitude UNWRAPPED so that
 *   neighbours never jump by 2π across the antimeridian;
 * - `prev` / `next` — neighbouring samples (clamped at both ends) from which the
 *   vertex shader derives the on-screen tangent;
 * - `side` — −1 / +1 on each ribbon edge; 0 (tip), −1, +1 (base corners) on the head;
 * - `t` — curvilinear parameter in [0, 1]; `kind` — 0 ribbon, 1 head;
 * - `shift` — tile offset (−2π, 0, +2π); `dist` — on-screen distance from the
 *   origin, left at 0 here and rewritten every frame by the engine.
 *
 * @param {{lon: number, lat: number}} a - Origin point (degrees).
 * @param {{lon: number, lat: number}} b - Destination point (degrees).
 * @param {number} [value] - Flow intensity in [0, 1] (raises the arc), default 0.5.
 * @param {number} [S=ARC_SAMPLES] - Samples along the arc.
 * @returns {{
 *   position: Float32Array, prev: Float32Array, next: Float32Array,
 *   side: Float32Array, t: Float32Array, kind: Float32Array, shift: Float32Array,
 *   dist: Float32Array, index: Uint16Array, samples: Float32Array,
 *   pts: Array<{lon: number, lat: number, elev: number, u: {x: number, y: number, z: number}}>,
 *   midLon: number,
 * }} Buffers, the S samples (lon, lat, elev) for the per-frame length pass, the
 *   hover samples and the unwrapped longitude of the middle sample.
 */
export function buildArcBuffers(a, b, value, S = ARC_SAMPLES) {
  const v1 = unit(a.lon * DEG, a.lat * DEG);
  const v2 = unit(b.lon * DEG, b.lat * DEG);
  const ang = Math.acos(clamp(v1.x * v2.x + v1.y * v2.y + v1.z * v2.z, -1, 1));
  const height = arcHeight(ang, value);

  // ── Échantillons du grand cercle ──
  const samples = new Float32Array(S * 3), ts = new Float32Array(S);
  const pts = [];
  // Longitude DEROULEE (unwrapped), accumulee d'un echantillon au suivant, et
  // longitude de l'echantillon median qui servira de reference de tuile.
  let lon = 0, midLon = 0;
  const mid = S >> 1;
  for (let i = 0; i < S; i++) {
    const t = i / (S - 1);
    const p = slerp(v1, v2, t, ang);
    const lat = Math.asin(clamp(p.y, -1, 1));
    // atan2 replie dans ]-PI, PI] : un arc franchissant l'antimeridien (Tokyo
    // -> San Francisco) y saute de +3.14 a -3.14 entre deux echantillons
    // voisins. On n'accumule donc que l'ECART LE PLUS COURT (wrapPi) pour
    // obtenir une suite continue, quitte a sortir de ]-PI, PI] : ARC_VERT
    // consomme cette valeur telle quelle (lon + uShift + aShift), et une marche
    // de 2PI y etirerait un triangle du ruban sur toute la largeur de l'ecran.
    const raw = Math.atan2(p.x, p.z);
    lon = i === 0 ? raw : lon + wrapPi(raw - lon);
    if (i === mid) midLon = lon;
    const elev = Math.sin(PI * t) * height;
    samples[i * 3] = lon; samples[i * 3 + 1] = lat; samples[i * 3 + 2] = elev;
    ts[i] = t;
    // Echantillons pour le survol : un sur quatre, plus la DESTINATION forcee
    // (72 n'est pas multiple de 4 a partir de 0, l'indice 71 tomberait). `u` est
    // le vecteur unitaire deja calcule par le slerp, fige ici pour epargner au
    // survol une allocation et quatre appels trigonometriques par mousemove.
    // La longitude poussee est la DEROULEE, la meme que celle des sommets.
    if (i % 4 === 0 || i === S - 1) pts.push({ lon, lat, elev, u: p });
  }

  // ── Gabarit d'UNE tuile : ruban (2 sommets par échantillon) + pointe ──
  const V = arcTileVertexCount(S);
  const N = V * ARC_TILES.length;
  const position = new Float32Array(N * 3), prev = new Float32Array(N * 3), next = new Float32Array(N * 3);
  const side = new Float32Array(N), tAttr = new Float32Array(N), kind = new Float32Array(N);
  const shift = new Float32Array(N), dist = new Float32Array(N);
  // Écriture d'un sommet du gabarit (tuile 0 du buffer, recopiée ensuite).
  const put = (v, si, pi, ni, sd, k) => {
    position.set(samples.subarray(si * 3, si * 3 + 3), v * 3);
    prev.set(samples.subarray(pi * 3, pi * 3 + 3), v * 3);
    next.set(samples.subarray(ni * 3, ni * 3 + 3), v * 3);
    side[v] = sd; tAttr[v] = ts[si]; kind[v] = k;
  };
  for (let i = 0; i < S; i++) {
    // Voisins BORNES aux extremites : la tangente y devient une difference
    // finie d'un seul cote, jamais un vecteur nul (le voisin existe toujours).
    const pi = Math.max(i - 1, 0), ni = Math.min(i + 1, S - 1);
    put(2 * i, i, pi, ni, -1, 0);
    put(2 * i + 1, i, pi, ni, 1, 0);
  }
  // Pointe : trois sommets marques aKind = 1. Leur position est la destination,
  // mais le vertex shader la remplace par uHeadTip (bord de la pastille de
  // destination) et les ecarte en espace ecran (pointe, coin gauche, coin droit)
  // le long de la direction uHeadBase -> uHeadTip, deux points recalcules par
  // frame. prev = echantillon S-2 : valeur sans effet sur le rendu, choisie pour
  // rester une tangente plausible a la lecture d'un dump.
  const last = S - 1;
  put(2 * S, last, last - 1, last, 0, 1);
  put(2 * S + 1, last, last - 1, last, -1, 1);
  put(2 * S + 2, last, last - 1, last, 1, 1);

  // ── Tuilage : recopie du gabarit, chaque copie porte son décalage aShift ──
  // Index 16 bits : 441 sommets au plus par arc (3 x 147).
  const perTileIdx = 6 * (S - 1) + 3;
  const index = new Uint16Array(perTileIdx * ARC_TILES.length);
  ARC_TILES.forEach((kc, ci) => {
    const voff = ci * V, ioff = ci * perTileIdx;
    if (ci > 0) {
      position.copyWithin(voff * 3, 0, V * 3);
      prev.copyWithin(voff * 3, 0, V * 3);
      next.copyWithin(voff * 3, 0, V * 3);
      side.copyWithin(voff, 0, V);
      tAttr.copyWithin(voff, 0, V);
      kind.copyWithin(voff, 0, V);
    }
    shift.fill(kc * 2 * PI, voff, voff + V);
    // Deux triangles par segment, TOUS internes a la tuile : aucun ne relie la
    // fin d'une copie au debut de la suivante (il balaierait l'ecran entier).
    for (let i = 0; i < S - 1; i++) {
      const l0 = voff + 2 * i, r0 = l0 + 1, l1 = l0 + 2, r1 = l0 + 3, o = ioff + i * 6;
      index[o] = l0; index[o + 1] = r0; index[o + 2] = l1;
      index[o + 3] = r0; index[o + 4] = r1; index[o + 5] = l1;
    }
    const h = voff + 2 * S, o = ioff + 6 * (S - 1);
    index[o] = h; index[o + 1] = h + 1; index[o + 2] = h + 2;
  });

  // midLon reste DEROULEE (non repliee dans ]-PI, PI]) : le moteur en deduit
  // uShift par `2PI * round((centerLon - midLon) / 2PI)`, et le shader rend
  // l'arc en `lon + uShift`. Replier midLon de 2PI*k decalerait uShift du meme
  // 2PI*k sans toucher aux sommets -> l'arc partirait une tuile plus loin.
  return { position, prev, next, side, t: tAttr, kind, shift, dist, index, samples, pts, midLon };
}

/**
 * Cumulative on-screen length along a projected polyline.
 *
 * @param {Float32Array|number[]} px - Projected samples, interleaved x, y (px).
 * @param {number} n - Sample count.
 * @param {Float32Array|number[]} out - Receives the distance of each sample from
 *   the first one (length ≥ n).
 * @returns {number} Total length in px.
 */
export function cumulativeLengths(px, n, out) {
  out[0] = 0;
  for (let i = 1; i < n; i++) {
    out[i] = out[i - 1] + Math.hypot(px[i * 2] - px[i * 2 - 2], px[i * 2 + 1] - px[i * 2 - 1]);
  }
  return n > 0 ? out[n - 1] : 0;
}

/**
 * Point of the sample polyline at a given cumulative distance, linearly
 * interpolated between the two samples that frame it (in lon, lat, elev).
 *
 * @param {Float32Array} samples - Samples, interleaved lon, lat, elev.
 * @param {Float32Array|number[]} dists - Cumulative distance of each sample.
 * @param {number} n - Sample count.
 * @param {number} target - Distance to reach; clamped to [0, dists[n - 1]].
 * @param {Float32Array|number[]} out - Receives (lon, lat, elev).
 * @returns {Float32Array|number[]} `out`.
 */
export function pointAtDistance(samples, dists, n, target, out) {
  // Parcours depuis la FIN : la cible (base de la pointe) est toujours proche de
  // la destination, quelques echantillons suffisent en pratique.
  let k = n - 2;
  while (k > 0 && dists[k] > target) k--;
  const span = dists[k + 1] - dists[k];
  const f = span > 0 ? clamp((target - dists[k]) / span, 0, 1) : 0;
  for (let c = 0; c < 3; c++) out[c] = samples[k * 3 + c] + (samples[(k + 1) * 3 + c] - samples[k * 3 + c]) * f;
  return out;
}

/**
 * Writes the per-frame on-screen distances into the `dist` attribute array of an
 * arc: both ribbon edges of every sample, in every tile, plus the head vertices
 * (which sit at the destination, so at the total length).
 *
 * @param {Float32Array} attr - The arc's `dist` attribute array.
 * @param {Float32Array|number[]} dists - Cumulative distance of each sample.
 * @param {number} total - Total on-screen length.
 * @param {number} [S=ARC_SAMPLES] - Samples along the arc.
 * @returns {void}
 */
export function writeArcDistances(attr, dists, total, S = ARC_SAMPLES) {
  const V = arcTileVertexCount(S);
  for (let ci = 0; ci < ARC_TILES.length; ci++) {
    const base = ci * V;
    for (let i = 0; i < S; i++) { attr[base + 2 * i] = dists[i]; attr[base + 2 * i + 1] = dists[i]; }
    attr[base + 2 * S] = total; attr[base + 2 * S + 1] = total; attr[base + 2 * S + 2] = total;
  }
}
