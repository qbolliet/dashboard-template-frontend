'use client';

import React from 'react';
import ChevronDownIcon from '../../icons/ChevronDownIcon/ChevronDownIcon';
import './DropdownToggleButton.scss';

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
 * @returns {JSX.Element} The rendered dropdown toggle button component
 */
const DropdownToggleButton = ({ 
    isOpen, 
    onClick, 
    onKeyDown,
    ariaControls,
    ariaLabel,
    className = '',
    size = 12
}) => {
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

    // Classes CSS dynamiques
    const buttonClasses = [
        'dropdown-toggle-button',
        isOpen && 'dropdown-toggle-button--open',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
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
                className="dropdown-toggle-button__icon"
            />

            {/* Texte accessible pour les lecteurs d'écran */}
            <span className="sr-only">
                {isOpen ? 'Réduire' : 'Développer'} le menu
            </span>
        </button>
    );
};

export default DropdownToggleButton;