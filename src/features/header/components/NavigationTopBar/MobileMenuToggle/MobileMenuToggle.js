'use client';

import React from 'react';
import HamburgerIcon from'../../../../../components/icons/HamburgerIcon/HamburgerIcon';
import CloseIcon from '../../../../../components/icons/CloseIcon/CloseIcon';
import './MobileMenuToggle.scss';

/**
 * Mobile menu toggle button component.
 * Displays hamburger icon when closed, close icon when open.
 * 
 * @param {boolean} isOpen - Whether the mobile menu is currently open
 * @param {Function} onToggle - Function to call when the button is clicked
 * @param {string} className - Optional additional CSS class
 * @returns {JSX.Element} The rendered mobile menu toggle button
 */
const MobileMenuToggle = ({ 
    isOpen = false, 
    onToggle,
    className = ''
}) => {
    // Classes CSS pour le bouton
    const toggleClasses = [
        'mobile-nav-toggle',
        className
    ].filter(Boolean).join(' ');

    return (
        <button 
            className={toggleClasses}
            aria-controls="primary-navigation"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={onToggle}
            type="button"
        >
            {/* Icône hamburger (visible quand le menu est fermé) */}
            <div className="nav-icon hamburger-icon">
                <HamburgerIcon />
            </div>
            
            {/* Icône X (visible quand le menu est ouvert) */}
            <div className="nav-icon close-icon">
                <CloseIcon />
            </div>
            
            {/* Texte accessible pour les lecteurs d'écran */}
            <span className="sr-only">
                Menu de navigation
            </span>
        </button>
    );
};

export default MobileMenuToggle;