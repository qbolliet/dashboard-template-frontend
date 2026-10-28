// =================================================================
// MEASURE TEXT — mesure de largeur de texte
// =================================================================
// Promu depuis src/features/chart/utils/measureText.js avec la légende de taille
// (src/components/legend/SizeLegend), désormais partagée par le chart et le globe.
// Le chart garde ses helpers d'axe (tickCountFor) et réexporte cette fonction.
//
// Mesure via un canvas caché, réutilisé entre appels. On y ajoute un cache des
// largeurs déjà mesurées (clé = police + texte) : les composants d'axe rappellent
// measureText() sur les mêmes libellés de ticks à chaque rendu, sans que la
// police ne change — le cache évite de re-mesurer inutilement le canvas.

let measureCtx = null;
const widthCache = new Map();

/**
 * Measures a string's rendered width at a given font size/family, using a
 * hidden canvas 2D context. Falls back to a rough monospace estimate when
 * canvas is unavailable (server-side render pass, or an environment without a
 * 2D context such as jsdom).
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

  // Estimation grossière (0.6 × taille de police / caractère) quand aucun canvas
  // n'est disponible : premier passage SSR d'un Client Component, ou contexte 2D
  // absent (getContext renvoie null, par exemple sous jsdom).
  const estimate = () => str.length * fontSize * 0.6;
  if (typeof document === 'undefined') return estimate();

  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  if (!measureCtx) return estimate();
  measureCtx.font = `${fontSize}px ${fontFamily}`;
  const width = measureCtx.measureText(str).width;
  widthCache.set(cacheKey, width);
  return width;
}
