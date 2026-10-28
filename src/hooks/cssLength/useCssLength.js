// =================================================================
// useCssLength — longueur d'un token CSS, convertie en pixels
// =================================================================
// Les tokens sont d'ordinaire consommés par le CSS (épaisseurs, opacités). Certains
// entrent pourtant dans une géométrie calculée en JS : le rayon maximal des bulles du
// chart, le diamètre maximal des points du globe (aire des marques, rayon des cercles
// de la légende de taille). On les lit sur l'élément, une fois monté, pour qu'ils
// restent pilotés par le design system et jamais écrits en px dans le code.
// Promu depuis src/features/chart/hooks/ quand le globe en est devenu le second
// consommateur.

// Importation des modules
import { useState } from 'react';
import { useIsomorphicLayoutEffect } from '@/hooks/layoutEffect/useIsomorphicLayoutEffect';

/**
 * Converts a CSS length (`px`, `rem`, `em`, or a unitless number of px) to pixels.
 *
 * @param {string} raw - Computed value of the custom property (e.g. '1.5rem').
 * @param {Element} el - Element the value was read on (for `em`).
 * @returns {?number} Length in px, or null when the value is empty or not a length.
 */
const toPx = (raw, el) => {
  const match = /^(-?[\d.]+)\s*(px|rem|em)?$/.exec(String(raw).trim());
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2] ?? 'px';
  if (unit === 'px') return value;
  // rem : taille de police racine ; em : taille de police de l'élément lu
  const host = unit === 'rem' ? document.documentElement : el;
  return value * parseFloat(window.getComputedStyle(host).fontSize);
};

/**
 * Reads a CSS custom property holding a length on a mounted element, in pixels.
 *
 * @param {{current: ?Element}} ref - Element the property is read on (it inherits the
 *   `:root` tokens).
 * @param {string} name - Custom property name (e.g. '--chart-bubble-max-radius').
 * @param {boolean} [enabled=true] - Skip the read (and return null) when false.
 * @returns {?number} Length in px, or null before mount / when the property is unset.
 */
export function useCssLength(ref, name, enabled = true) {
  const [px, setPx] = useState(null);
  // Lecture après montage (avant peinture) : le DOM et la cascade sont alors connus. Pas
  // de tableau de dépendances : la valeur peut changer avec le thème ou la taille de
  // police, et setState ignore une valeur identique.
  useIsomorphicLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    const raw = window.getComputedStyle(ref.current).getPropertyValue(name);
    setPx(toPx(raw, ref.current));
  });
  return enabled ? px : null;
}
