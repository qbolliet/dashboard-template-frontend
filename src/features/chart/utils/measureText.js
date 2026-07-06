// =================================================================
// MEASURE TEXT — mesure de largeur de texte (anti-chevauchement des ticks)
// =================================================================
// Mesure via un canvas caché, réutilisé entre appels. On y ajoute un cache des
// largeurs déjà mesurées (clé = police + texte) : les composants d'axe rappellent
// measureText() sur les mêmes libellés de ticks à chaque rendu, sans que la
// police ne change — le cache évite de re-mesurer inutilement le canvas.

let measureCtx = null;
const widthCache = new Map();

/**
 * Measures a string's rendered width at a given font size/family, using a
 * hidden canvas 2D context. Falls back to a rough monospace estimate when
 * canvas is unavailable (server-side render pass).
 *
 * @param {string} text - Text to measure.
 * @param {number} [fontSize=11] - Font size in px.
 * @param {string} [fontFamily='Inter, system-ui, sans-serif'] - Font family.
 * @returns {number} Estimated width in px.
 */
export function measureText(text, fontSize = 11, fontFamily = 'Inter, system-ui, sans-serif') {
  const str = String(text);
  const cacheKey = `${fontSize}|${fontFamily}|${str}`;
  const cached = widthCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Rendu côté serveur (premier passage SSR d'un Client Component) : pas de
  // canvas disponible — estimation grossière (0.6 × taille de police / caractère).
  if (typeof document === 'undefined') return str.length * fontSize * 0.6;

  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  measureCtx.font = `${fontSize}px ${fontFamily}`;
  const width = measureCtx.measureText(str).width;
  widthCache.set(cacheKey, width);
  return width;
}

/**
 * Decides the tick count for an axis given a density preset and the pixels
 * available along that axis.
 *
 * @param {number} pixels - Available pixel length along the axis.
 * @param {'sparse'|'normal'|'dense'} [density='normal'] - Density preset.
 * @returns {number} Tick count (minimum 2).
 */
export function tickCountFor(pixels, density = 'normal') {
  const per = { sparse: 110, normal: 70, dense: 45 }[density] || 70;
  return Math.max(2, Math.round(pixels / per));
}
