'use client';

import React from 'react';
import { useNavigation } from '../../../hooks/useNavigation';
import MobileMenuToggle from '../MobileMenuToggle/MobileMenuToggle';
import NavigationMenu from '../NavigationMenu/NavigationMenu';
import NavigationOverlay from '../NavigationOverlay/NavigationOverlay';
import './NavigationContainer.scss';

/**
 * Main navigation container component.
 * Manages mobile menu state and orchestrates all navigation subcomponents.
 * 
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onItemClick - Optional callback when a navigation item is clicked
 * @param {string} className - Optional additional CSS class for the container
 * @param {string} ariaLabel - Optional ARIA label for accessibility
 * @param {string} role - Optional ARIA role for accessibility
 * @returns {JSX.Element} The rendered navigation container
 */
const NavigationContainer = ({ 
    navigationData = [], 
    onItemClick,
    className = '',
    ariaLabel = 'Menu de navigation',
    role = 'navigation'
}) => {
    // Utilisation du hook personnalisé pour la navigation
    const {
        isMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu
    } = useNavigation();

    // Gestion du clic sur un élément de navigation
    const handleItemClick = (item) => {
        closeMobileMenu();
        if (onItemClick) {
            onItemClick(item);
        }
    };

    // Classes CSS pour le conteneur
    const containerClasses = [
        'navigation-container',
        className
    ].filter(Boolean).join(' ');

    return (
        <nav className={containerClasses} role={role} aria-label={ariaLabel}>
            {/* Bouton toggle pour le menu mobile */}
            <MobileMenuToggle
                isOpen={isMobileMenuOpen}
                onToggle={toggleMobileMenu}
            />

            {/* Menu de navigation principal */}
            <NavigationMenu
                navigationData={navigationData}
                onItemClick={handleItemClick}
                isOpen={isMobileMenuOpen}
            />

            {/* Overlay pour fermer le menu mobile */}
            <NavigationOverlay
                isVisible={isMobileMenuOpen}
                onClose={closeMobileMenu}
            />
        </nav>
    );
};

export default NavigationContainer;