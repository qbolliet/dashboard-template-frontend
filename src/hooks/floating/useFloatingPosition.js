// Importation des modules
import { useLayoutEffect, useState } from 'react';

/**
 * Tracks the viewport-relative position of an anchor element while `open`,
 * for use with content portaled to `document.body` (e.g. a dropdown that
 * must escape a scrollable/overflow-clipping ancestor).
 *
 * @param {React.RefObject<HTMLElement>} anchorRef - Element to measure.
 * @param {boolean} open - Whether the floating content is currently shown.
 * @returns {{top: number, left: number, width: number}|null} Position in
 *   viewport px (`top`/`left` are the anchor's bottom-left corner, `width`
 *   its full width), or `null` while closed.
 */
export function useFloatingPosition(anchorRef, open) {
  // Initialisation de la position
  const [pos, setPos] = useState(null);

  // Mesure synchrone (avant peinture) pour éviter un flash à (0,0) à l'ouverture.
  // Rien à faire à la fermeture : le return ci-dessous dérive déjà `null` de `open`.
  useLayoutEffect(() => {
    if (!open) return;

    const measure = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Reproduit le chevauchement de bordure existant (top: calc(100% - 1px);
      // left/right: -1px), désormais exprimé en coordonnées de viewport fixes.
      setPos({ top: rect.bottom - 1, left: rect.left - 1, width: rect.width + 2 });
    };

    measure();
    // capture: true — capte aussi le scroll d'un ancêtre (ex. la rangée
    // défilante de MultiCriterionMenu), pas seulement celui de la fenêtre.
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, { capture: true });
      window.removeEventListener('resize', measure);
    };
  }, [anchorRef, open]);

  return open ? pos : null;
}
