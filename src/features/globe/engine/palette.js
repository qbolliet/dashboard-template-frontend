// Importation des modules
import { Color } from 'three';

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
    const c = new Color();
    if (norm[0] === '#') c.set(norm);
    else {
      const m = norm.match(/[\d.]+/g);
      if (m) c.setRGB(+m[0] / 255, +m[1] / 255, +m[2] / 255);
    }
    return c;
  } catch {
    return new Color(0.4, 0.6, 1);
  }
}

/* ---- Repli : valeurs exactes de palette() du prototype (variante claire) ---- */
// Utilisé uniquement si un token --globe-* est absent (feuille de styles de la
// feature pas encore chargée) : le thème par défaut du moteur étant clair, le
// repli reprend la branche claire du prototype pour un rendu identique.
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
    return raw ? cssColor(`hsl(${raw})`) : new Color(...fallbackRgb);
  };

  const accentRaw = token('--globe-marker-accent');
  return {
    atmo: colorOf('--globe-atmo', FALLBACK_PALETTE.atmo),
    arc: colorOf('--globe-arc', FALLBACK_PALETTE.arc),
    accent: accentRaw ? `hsl(${accentRaw})` : FALLBACK_PALETTE.accent,
    fallback: colorOf('--globe-earth-fallback', FALLBACK_PALETTE.fallback),
  };
}
