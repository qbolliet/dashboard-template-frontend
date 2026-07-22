'use client';

// Importation des modules
import { useEffect, useRef } from 'react';

/**
 * Hook providing drag-to-resize behaviour for a navigation drawer edge (rail).
 *
 * Shared by the sidebar (right edge) and the topbar drawer (left edge). The hook is
 * presentation-agnostic: it only computes the new width on pointer drag / arrow keys and
 * hands it back through `onResize`. The caller owns the width (typically applied as an
 * inline CSS custom property) and the start measurement via `getCurrentWidth`.
 *
 * No persistence: the chosen width lives in the caller's state and resets on reload.
 *
 * @param {Object} options - Hook configuration.
 * @param {('left'|'right')} [options.direction='right'] - Which edge carries the rail.
 *   'right' (panel anchored left, e.g. sidebar): dragging right enlarges.
 *   'left' (panel anchored right, e.g. topbar drawer): dragging left enlarges.
 * @param {number} [options.min] - Minimum width in px (inclusive).
 * @param {number} [options.max] - Maximum width in px (inclusive).
 * @param {Function} options.getCurrentWidth - Returns the panel's current width in px.
 * @param {Function} options.onResize - Called with the clamped next width in px. Pendant un
 *   drag piloté par `elementRef`/`cssProperty`, appelé une seule fois au relâchement (commit) ;
 *   sinon (ex. flèches clavier) appelé à chaque pas.
 * @param {Object} [options.elementRef] - Ref vers l'élément DOM du panneau. Si fourni avec
 *   `cssProperty`, le drag écrit directement la largeur sur cet élément (`style.setProperty`)
 *   sans passer par React tant que le geste est en cours — évite un re-render par pixel.
 * @param {string} [options.cssProperty] - Nom de la custom property CSS à écrire pendant le
 *   drag (ex. '--sidebar-width-open'). Ignoré si `elementRef` n'est pas fourni.
 * @returns {{onPointerDown: Function, onKeyDown: Function}} Handlers to spread on the rail.
 */
export default function useResizable({
    direction = 'right',
    min,
    max,
    getCurrentWidth,
    onResize,
    elementRef,
    cssProperty,
}) {
    // Geste de drag en cours : conserve la fonction d'arrêt liée à CE geste (avec les
    // bonnes références d'écouteurs) pour pouvoir le nettoyer au démontage. Une ref
    // évite tout re-rendu pendant le glissement.
    const dragRef = useRef(null);

    // Borne la largeur entre min et max (si fournis).
    const clamp = (width) => {
        let value = width;
        if (typeof min === 'number') value = Math.max(min, value);
        if (typeof max === 'number') value = Math.min(max, value);
        return value;
    };

    // Début du geste au pointeur (bouton principal uniquement).
    // `onPointerDown` est un handler d'événement React, donc re-lié à chaque rendu : il
    // capture toujours les dernières props (onResize/getCurrentWidth). handleMove et stop
    // sont créés ici, à l'intérieur du geste : add/removeEventListener partagent donc
    // exactement les mêmes références, sans dépendre d'aucune mémoïsation.
    const onPointerDown = (event) => {
        if (event.button !== 0) return;
        const startWidth = getCurrentWidth();
        if (typeof startWidth !== 'number' || Number.isNaN(startWidth)) return;
        event.preventDefault();

        const startX = event.clientX;
        // Dernière largeur calculée pendant le drag : c'est elle qui sera commitée en state
        // au relâchement (React n'est pas synchronisé pixel par pixel pendant le geste).
        let latestWidth = startWidth;
        const useImperativeDom = Boolean(elementRef?.current && cssProperty);

        // Déplacement du pointeur : largeur de départ + delta horizontal signé selon le bord.
        const handleMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const signed = direction === 'left' ? -delta : delta;
            latestWidth = clamp(startWidth + signed);

            if (useImperativeDom) {
                // Haute fréquence (un événement par pixel de déplacement) : on écrit la
                // valeur directement en DOM plutôt que par setState, pour éviter un
                // re-render complet du composant (et de son contexte) à chaque pixel.
                // La valeur reste transitoire ; React redevient source de vérité au stop().
                elementRef.current.style.setProperty(cssProperty, `${latestWidth}px`);
            } else {
                onResize(latestWidth);
            }
        };

        // Fin du geste : on libère le curseur global et les écouteurs, puis on commite la
        // largeur finale dans le state React (source de vérité unique entre deux drags).
        // `options.commit` (par défaut true) permet au cleanup de démontage d'appeler stop()
        // pour libérer les écouteurs sans déclencher onResize (setState après démontage) :
        // window.addEventListener('pointerup', stop) invoque stop avec le PointerEvent, qui
        // n'a pas de propriété `commit` et retombe donc sur la valeur par défaut true.
        const stop = (options = {}) => {
            const { commit = true } = options;
            dragRef.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', stop);

            if (useImperativeDom && commit) {
                onResize(latestWidth);
            }
        };

        dragRef.current = { stop };
        // Curseur + désactivation de la sélection sur tout le document pendant le drag.
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', stop);
    };

    // Accessibilité clavier : flèches gauche/droite (pas plus grand avec Shift).
    const onKeyDown = (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const current = getCurrentWidth();
        if (typeof current !== 'number' || Number.isNaN(current)) return;
        event.preventDefault();
        const step = event.shiftKey ? 32 : 16;
        const towardsLarger = event.key === 'ArrowRight' ? 1 : -1;
        const signed = direction === 'left' ? -towardsLarger : towardsLarger;
        onResize(clamp(current + signed * step));
    };

    // Nettoyage si le composant est démonté en plein drag : on rejoue l'arrêt du geste
    // courant (références d'écouteurs exactes) mais sans committer la largeur, pour ne
    // pas déclencher onResize (setState) après le démontage. Effet de montage uniquement
    // (deps vides).
    useEffect(() => {
        return () => dragRef.current?.stop?.({ commit: false });
    }, []);

    return { onPointerDown, onKeyDown };
}
