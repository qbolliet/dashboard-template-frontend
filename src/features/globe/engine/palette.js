// Importation des modules
import { Color, SRGBColorSpace } from 'three';

/**
 * Colour plumbing between the CSS token layer and the WebGL scene.
 *
 * The engine never hardcodes a colour: every WebGL colour comes from the
 * `--globe-*` tokens read on the container, normalised through a 2d canvas so
 * any CSS syntax (oklch, hsl, hex…) resolves to an RGB triplet Three.js
 * understands.
 */

/* ---- Résolution d'une couleur CSS (oklch, hsl, hex…) -> THREE.Color ---- */
// Canvas de normalisation partagé, créé paresseusement : un seul élément pour
// toutes les instances de globe, et rien ne touche au DOM à l'import du module.
let _cssCanvas = null;

/**
 * Resolves any CSS colour string to a THREE.Color through the browser parser.
 *
 * @param {string} str - CSS colour in any syntax (oklch, hsl, hex, rgb…).
 * @returns {Color} Parsed colour, or a neutral blue if parsing failed.
 */
export function cssColor(str) {
  try {
    if (!_cssCanvas) _cssCanvas = document.createElement('canvas');
    const ctx = _cssCanvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillStyle = str;              // navigateur normalise (gère oklch)
    const norm = ctx.fillStyle;       // -> "#rrggbb" ou "rgb(...)"
    // Les deux branches convertissent sRGB -> espace de travail lineaire, comme
    // le decodage materiel des textures : les uniforms de couleur et les texels
    // arrivent ainsi dans le MEME espace, et les shaders reencodent une seule
    // fois en sortie. `set()` fait la conversion tout seul ; `setRGB()` ne la
    // fait que si on lui nomme l'espace source, d'ou le 3e argument.
    const c = new Color();
    if (norm[0] === '#') c.set(norm);
    else {
      const m = norm.match(/[\d.]+/g);
      if (m) c.setRGB(+m[0] / 255, +m[1] / 255, +m[2] / 255, SRGBColorSpace);
    }
    return c;
  } catch {
    return new Color().setRGB(0.4, 0.6, 1, SRGBColorSpace);
  }
}

/* ---- Repli : valeurs exactes de palette() du prototype (variante claire) ---- */
// Utilisé uniquement si un token --globe-* est absent (feuille de styles de la
// feature pas encore chargée) : le thème par défaut du moteur étant clair, le
// repli reprend la branche claire du prototype pour un rendu identique.
// Triplets exprimés en sRGB, comme les tokens CSS qu'ils remplacent — ils
// passent donc par la même conversion (cf. colorOf).
const FALLBACK_PALETTE = {
  atmo: [0.40, 0.62, 1.0],
  arc: [0.12, 0.46, 0.98],
  accent: '#0b5cc4',
  fallback: [0.62, 0.72, 0.86],
};

/**
 * Reads the globe WebGL palette from the `--globe-*` CSS custom properties of
 * a container. Called again on every theme change, so the `[data-theme]`
 * variants of the tokens are what actually drives the dark rendering.
 *
 * @param {HTMLElement} container - Element the tokens are resolved against.
 * @returns {{atmo: Color, arc: Color, accent: string, fallback: Color}}
 *   WebGL colours, plus `accent` kept as a CSS string (it ends up in inline DOM
 *   styles of the point badges, never in a shader uniform).
 */
export function readGlobePalette(container) {
  const cs = getComputedStyle(container);
  // Chaque token porte un triplet HSL brut (« 214 46% 44% ») : on reconstitue
  // la fonction hsl() avant normalisation, comme partout dans le repo.
  const token = (name) => cs.getPropertyValue(name).trim();
  const colorOf = (name, fallbackRgb) => {
    const raw = token(name);
    return raw ? cssColor(`hsl(${raw})`) : new Color().setRGB(...fallbackRgb, SRGBColorSpace);
  };

  const accentRaw = token('--globe-marker-accent');
  return {
    atmo: colorOf('--globe-atmo', FALLBACK_PALETTE.atmo),
    arc: colorOf('--globe-arc', FALLBACK_PALETTE.arc),
    accent: accentRaw ? `hsl(${accentRaw})` : FALLBACK_PALETTE.accent,
    fallback: colorOf('--globe-earth-fallback', FALLBACK_PALETTE.fallback),
  };
}

/* ---- Style des flèches de flux : épaisseurs, pointe, opacités ---- */
// Repli si un token --globe-arc-* est absent (feuille de styles de la feature
// pas encore chargée) : mêmes valeurs que src/features/globe/_tokens.scss.
const FALLBACK_ARC_STYLE = {
  widthMin: 1.5,
  widthMax: 4,
  glowWidth: 1,
  headLength: 3,
  headWidth: 2.5,
  opacity: 0.95,
  dimmedOpacity: 0.3,
  markerSize: 22,
  dotSize: 10,
  markerMaxSize: 34,
  markerRing: 3,
};

/**
 * Reads the flow-arrow style from the `--globe-arc-*` custom properties of a
 * container: stroke widths resolved to CSS pixels, head ratios and opacities.
 *
 * Widths go through a hidden probe element whose `width` is set to the token:
 * the browser then resolves rem, `var()` and `calc()` alike — a custom property
 * read with getPropertyValue() is only its specified text (`calc(var(--x) * 2)`),
 * which parseFloat cannot evaluate. Ratios and opacities are unitless numbers.
 *
 * Also reads the point diameters (`--globe-marker-size` for a badge,
 * `--globe-marker-dot-size` for a dot, `--globe-marker-max-size` for the largest
 * point sized by value) and the badge halo width (`--globe-marker-ring-width`):
 * the engine sizes the points with them, and the arrow tip stops at the edge of
 * its destination point instead of disappearing under it.
 *
 * @param {HTMLElement} container - Element the tokens are resolved against.
 * @returns {{widthMin: number, widthMax: number, glowWidth: number,
 *   headLength: number, headWidth: number, opacity: number, dimmedOpacity: number,
 *   markerSize: number, dotSize: number, markerMaxSize: number,
 *   markerRing: number}} Widths in CSS px (stroke at value 0 and 1, and the
 *   constant stroke of the `glow` variant), head length / width as multiples of
 *   the stroke width, base opacity, the opacity factor of non-hovered arrows, and
 *   the point diameters / badge halo width in CSS px.
 */
export function readGlobeArcStyle(container) {
  const cs = getComputedStyle(container);
  const F = FALLBACK_ARC_STYLE;
  // Nombre sans unité : parseFloat suffit (un calc() n'y est pas supporté).
  const num = (name, fb) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fb;
  };
  // Sonde invisible, hors flux, retirée aussitôt : un seul recalcul de style,
  // à la construction du moteur uniquement.
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:0;padding:0;border:0;';
  container.appendChild(probe);
  const px = (name, fb) => {
    if (!cs.getPropertyValue(name).trim()) return fb;
    probe.style.width = `var(${name})`;
    const v = parseFloat(getComputedStyle(probe).width);
    return Number.isFinite(v) && v > 0 ? v : fb;
  };
  try {
    return {
      widthMin: px('--globe-arc-width-min', F.widthMin),
      widthMax: px('--globe-arc-width-max', F.widthMax),
      glowWidth: px('--globe-arc-glow-width', F.glowWidth),
      headLength: num('--globe-arc-head-length', F.headLength),
      headWidth: num('--globe-arc-head-width', F.headWidth),
      opacity: num('--globe-arc-opacity', F.opacity),
      dimmedOpacity: num('--globe-arc-dimmed-opacity', F.dimmedOpacity),
      markerSize: px('--globe-marker-size', F.markerSize),
      dotSize: px('--globe-marker-dot-size', F.dotSize),
      markerMaxSize: px('--globe-marker-max-size', F.markerMaxSize),
      markerRing: px('--globe-marker-ring-width', F.markerRing),
    };
  } finally {
    probe.remove();
  }
}
