'use client';

// Importation des modules
import { useCallback, useEffect, useRef } from 'react';

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
    // État du drag en cours (null hors drag). Ref pour éviter les re-rendus pendant le geste.
    const dragRef = useRef(null);
    // Refs vers les callbacks pour garder des handlers stables sans les recréer à chaque rendu.
    const onResizeRef = useRef(onResize);
    const getWidthRef = useRef(getCurrentWidth);
    useEffect(() => {
        onResizeRef.current = onResize;
        getWidthRef.current = getCurrentWidth;
    });

    // Borne la largeur entre min et max (si fournis).
    const clamp = useCallback((width) => {
        let value = width;
        if (typeof min === 'number') value = Math.max(min, value);
        if (typeof max === 'number') value = Math.min(max, value);
        return value;
    }, [min, max]);

    // Déplacement du pointeur : largeur de départ + delta horizontal signé selon le bord.
    const handleMove = useCallback((event) => {
        const drag = dragRef.current;
        if (!drag) return;
        const delta = event.clientX - drag.startX;
        const signed = direction === 'left' ? -delta : delta;
        onResizeRef.current(clamp(drag.startWidth + signed));
    }, [direction, clamp]);

    // Fin du geste : on libère le curseur global et les écouteurs.
    const stopResize = useCallback(() => {
        dragRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', stopResize);
    }, [handleMove]);

    // Début du geste au pointeur (bouton principal uniquement).
    const onPointerDown = useCallback((event) => {
        if (event.button !== 0) return;
        const startWidth = getWidthRef.current();
        if (typeof startWidth !== 'number' || Number.isNaN(startWidth)) return;
        event.preventDefault();
        dragRef.current = { startX: event.clientX, startWidth };
        // Curseur + désactivation de la sélection sur tout le document pendant le drag.
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', stopResize);
    }, [handleMove, stopResize]);

    // Accessibilité clavier : flèches gauche/droite (pas plus grand avec Shift).
    const onKeyDown = useCallback((event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const current = getWidthRef.current();
        if (typeof current !== 'number' || Number.isNaN(current)) return;
        event.preventDefault();
        const step = event.shiftKey ? 32 : 16;
        const towardsLarger = event.key === 'ArrowRight' ? 1 : -1;
        const signed = direction === 'left' ? -towardsLarger : towardsLarger;
        onResizeRef.current(clamp(current + signed * step));
    }, [direction, clamp]);

    // Nettoyage si le composant est démonté en plein drag.
    useEffect(() => stopResize, [stopResize]);

    return { onPointerDown, onKeyDown };
}
