'use client';

import React from 'react';

/**
 * Mobile hamburger menu toggle button component.
 * Provides accessibility features and visual feedback for menu state.
 * 
 * @param {boolean} isOpen - Whether the mobile menu is currently open
 * @param {Function} onToggle - Callback function when toggle button is clicked
 * @returns {JSX.Element} The rendered mobile menu toggle button
 */
const MobileMenuToggle = ({ isOpen, onToggle }) => {
    return (
        <button 
            className="mobile-nav-toggle" 
            aria-controls="primary-navigation" 
            aria-expanded={isOpen ? "true" : "false"} 
            onClick={onToggle}
            tabIndex="0"
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
            <span className="sr-only">
                Menu
            </span>
        </button>
    );
};

export default MobileMenuToggle;