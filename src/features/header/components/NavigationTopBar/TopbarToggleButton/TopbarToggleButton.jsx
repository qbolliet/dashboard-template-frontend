'use client';

import React from 'react';
import ChevronDownIcon from '../../../../../components/icons/ChevronDownIcon/ChevronDownIcon';
import './TopbarToggleButton.scss';

/**
 * Dropdown toggle button component for opening/closing dropdowns.
 * Uses ChevronDownIcon and global design system styles.
 *
 * @param {boolean} isOpen - State of the dropdown (open/closed)
 * @param {Function} onClick - Function called on click
 * @param {Function} onKeyDown - Function to handle keyboard events
 * @param {string} ariaControls - ID of the element controlled by this button
 * @param {string} ariaLabel - Accessibility label for the button
 * @param {string} className - Additional CSS classes
 * @param {string|number} size - Size of the icon (default: 12)
 * @param {React.Ref} ref - Ref transmise au <button> interne (gestion du focus)
 * @returns {JSX.Element} The rendered dropdown toggle button component
 */
const TopbarToggleButton = React.forwardRef(({
    isOpen,
    onClick,
    onKeyDown,
    ariaControls,
    ariaLabel,
    className = '',
    size = 12
}, ref) => {
    /**
     * Handle keyboard events with default behavior if no custom handler provided.
     *
     * @param {KeyboardEvent} event - The keyboard event
     */
    const handleKeyDown = (event) => {
        // Appeler le gestionnaire personnalisé s'il existe
        if (onKeyDown) {
            onKeyDown(event);
        } else {
            // Comportement par défaut
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (onClick) {
                    onClick();
                }
            }
        }
    };

    // Classes CSS dynamiques (rôle .nav-toggle + préfixe .topbar-toggle)
    const buttonClasses = [
        'nav-toggle',
        'topbar-toggle',
        isOpen && 'topbar-toggle--open',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            ref={ref}
            type="button"
            className={buttonClasses}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            aria-expanded={isOpen}
            aria-controls={ariaControls}
            aria-label={ariaLabel || `${isOpen ? 'Fermer' : 'Ouvrir'} le menu déroulant`}
            tabIndex={0}
        >
            {/* Icône chevron utilisant le composant centralisé */}
            <ChevronDownIcon
                width={size}
                height={size}
                className="topbar-toggle-icon"
            />

            {/* Texte accessible pour les lecteurs d'écran */}
            <span className="sr-only">
                {isOpen ? 'Réduire' : 'Développer'} le menu
            </span>
        </button>
    );
});

// Nom d'affichage pour le débogage (requis avec forwardRef)
TopbarToggleButton.displayName = 'TopbarToggleButton';

export default TopbarToggleButton;
