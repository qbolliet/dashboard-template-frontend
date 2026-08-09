'use client';

import React from 'react';
import { mergeLabels } from '@/utils/i18n/mergeLabels';

// Défauts français, surchargeables par la prop `labels`. Ce composant est une primitive
// PARTAGÉE par les deux navigations : il ne lit pas le contexte de libellés du header,
// pour rester utilisable seul — c'est l'appelant qui lui passe ce qu'il affiche.
const DEFAULT_LABELS = {
    label: 'Menu de navigation',
    open: 'Ouvrir le menu',
    close: 'Fermer le menu',
};

/**
 * Shared hamburger trigger button for both navigations (sidebar and topbar).
 *
 * Renders the animated three-line hamburger that morphs into an "X" when open.
 * All appearance is provided by the shared role classes `.nav-trigger*`
 * (features/header/nav-base.scss) and the `--nav-trigger-*` tokens. Placement and
 * responsive visibility are left to the caller via `className` (e.g. `mobile-nav-toggle`
 * for the topbar, `sidebar-trigger` for the sidebar).
 *
 * @param {boolean} isOpen - Whether the navigation it controls is currently open.
 * @param {Function} onToggle - Callback invoked when the button is activated.
 * @param {string} [className] - Extra class(es) for placement/visibility.
 * @param {string} [ariaLabel] - Accessible label for the button. Overrides the
 *   open/close wording when the caller wants to name this specific trigger.
 * @param {string} [ariaControls] - Id of the element this trigger controls.
 * @param {Object} [labels] - Wording overrides, merged over the French defaults.
 *   Keys: `label` (visually-hidden helper text), `open`, `close`.
 * @param {Object} rest - Forwarded to the underlying <button> (e.g. data-* attributes).
 * @returns {JSX.Element} The rendered trigger button.
 */
const NavTrigger = ({
    isOpen = false,
    onToggle,
    className = '',
    ariaLabel,
    ariaControls,
    labels: labelOverrides,
    ...rest
}) => {
    const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);

    // Classe d'état (fermé/ouvert) qui pilote l'animation des lignes en « X ».
    const triggerClasses = [
        'nav-trigger',
        isOpen ? 'nav-trigger--open' : 'nav-trigger--closed',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={triggerClasses}
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-label={ariaLabel ?? (isOpen ? labels.close : labels.open)}
            aria-controls={ariaControls}
            {...rest}
        >
            {/* Icône hamburger animée (3 lignes → X) */}
            <span className="nav-trigger-icon" aria-hidden="true">
                <span className="nav-trigger-line nav-trigger-line--top" />
                <span className="nav-trigger-line nav-trigger-line--middle" />
                <span className="nav-trigger-line nav-trigger-line--bottom" />
            </span>

            {/* Texte accessible pour les lecteurs d'écran */}
            <span className="sr-only">{labels.label}</span>
        </button>
    );
};

export default NavTrigger;
