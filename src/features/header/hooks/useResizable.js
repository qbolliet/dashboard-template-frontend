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
 * @param {Function} options.onResize - Called with the clamped next width in px.
 * @returns {{onPointerDown: Function, onKeyDown: Function}} Handlers to spread on the rail.
 */
export default function useResizable({
    direction = 'right',
    min,
    max,
    getCurrentWidth,
    onResize,
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

        // Déplacement du pointeur : largeur de départ + delta horizontal signé selon le bord.
        const handleMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const signed = direction === 'left' ? -delta : delta;
            onResize(clamp(startWidth + signed));
        };

        // Fin du geste : on libère le curseur global et les écouteurs.
        const stop = () => {
            dragRef.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', stop);
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
    // courant (références d'écouteurs exactes). Effet de montage uniquement (deps vides).
    useEffect(() => {
        return () => dragRef.current?.stop?.();
    }, []);

    return { onPointerDown, onKeyDown };
}
