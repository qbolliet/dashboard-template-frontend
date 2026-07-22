// Importation des modules
import { useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '@/hooks/layoutEffect/useIsomorphicLayoutEffect';

/**
 * Tracks the viewport-relative position of an anchor element while `open`,
 * for use with content portaled to `document.body` (e.g. a dropdown that
 * must escape a scrollable/overflow-clipping ancestor).
 *
 * While `open`, the anchor is re-measured on every animation frame, so the
 * position also follows reflows that emit no `scroll`/`resize` event and no
 * React render at all — a sibling row being inserted or removed above the
 * anchor, an async option list changing a row's height, or a drag gesture
 * writing a width straight to the DOM. Updates are committed only when the
 * measured position actually changes, so a still page triggers no re-render.
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

  // Dernière position commitée — comparée avant chaque setState pour ne re-rendre que
  // sur changement réel. Une ref (et non `pos`) pour rester lisible depuis la boucle
  // rAF sans avoir à la relancer à chaque rendu.
  const lastRef = useRef(null);

  // Mesure synchrone (avant peinture) pour éviter un flash à (0,0) à l'ouverture.
  // Rien à faire à la fermeture : le return ci-dessous dérive déjà `null` de `open`.
  // Isomorphe : useEffect côté serveur (composant 'use client' quand même rendu en
  // SSR par l'App Router) pour éviter le warning React, useLayoutEffect côté client.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;

    // Identifiant de la frame programmée, pour l'annuler à la fermeture/au démontage.
    let frame = 0;

    const measure = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Reproduit le chevauchement de bordure existant (top: calc(100% - 1px);
      // left/right: -1px), désormais exprimé en coordonnées de viewport fixes.
      // Aucun arrondi : on conserve le sous-pixel pour que la bordure reste jointive.
      const next = { top: rect.bottom - 1, left: rect.left - 1, width: rect.width + 2 };
      const prev = lastRef.current;
      // GARDE indispensable : sans elle, un setState par frame = boucle de rendu
      // permanente. Comparaison stricte suffisante — à layout identique,
      // getBoundingClientRect renvoie exactement les mêmes flottants.
      if (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width) return;
      lastRef.current = next;
      setPos(next);
    };

    // Première mesure synchrone, avant la peinture de la frame d'ouverture.
    measure();

    // Sondage par frame tant que le flottant est ouvert. C'est le seul moyen de capter
    // un déplacement de l'ancre qui ne produit ni scroll, ni resize, ni rendu React :
    // carte insérée/supprimée au-dessus, liste d'options chargée en asynchrone, ou drag
    // du rail de la sidebar (useResizable écrit la largeur directement en DOM, hors
    // React). Un ResizeObserver ne verrait rien dans ces cas : il rapporte des tailles,
    // jamais des positions, et l'ancre ne change pas de taille — elle est translatée.
    // Le scroll (y compris celui d'un ancêtre) et le resize sont couverts par la même
    // boucle : d'anciens écouteurs dédiés feraient double emploi dans la même frame.
    // Coût borné : un seul getBoundingClientRect par frame, uniquement pendant
    // l'ouverture (interaction courte), et le rAF est suspendu par le navigateur quand
    // l'onglet passe en arrière-plan.
    const loop = () => {
      measure();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frame);
  }, [anchorRef, open]);

  return open ? pos : null;
}
