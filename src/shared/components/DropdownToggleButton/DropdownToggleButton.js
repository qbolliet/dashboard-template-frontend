'use client';

import React from 'react';
import './DropdownToggleButton.scss';

/**
 * Dropdown toggle button component for opening/closing dropdowns.
 * Displays an arrow that transforms according to dropdown state.
 * 
 * @param {boolean} isOpen - State of the dropdown (open/closed)
 * @param {Function} onClick - Function called on click
 * @param {Function} onKeyDown - Function to handle keyboard events
 * @param {string} ariaControls - ID of the element controlled by this button
 * @param {string} ariaLabel - Accessibility label for the button
 * @param {string} className - Additional CSS classes
 * @returns {JSX.Element} The rendered dropdown toggle button component
 */
const DropdownToggleButton = ({ 
    isOpen, 
    onClick, 
    onKeyDown,
    ariaControls,
    ariaLabel,
    className = '' 
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
                onClick && onClick();
            }
        }
    };

    return (
        <button
            type="button"
            className={`dropdown-toggle-button ${isOpen ? 'dropdown-toggle-button--open' : ''} ${className}`.trim()}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            aria-expanded={isOpen}
            aria-controls={ariaControls}
            aria-label={ariaLabel || `${isOpen ? 'Fermer' : 'Ouvrir'} le menu déroulant`}
            tabIndex={0}
        >
            {/* Icône de flèche SVG */}
            <div className="dropdown-toggle-button__icon">
                <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none" 
                    aria-hidden="true"
                >
                    <path 
                        className="dropdown-arrow"
                        d="M3 4.5L6 7.5L9 4.5" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* Texte accessible pour les lecteurs d'écran */}
            <span className="sr-only">
                {isOpen ? 'Réduire' : 'Développer'} le menu
            </span>
        </button>
    );
};

export default DropdownToggleButton;