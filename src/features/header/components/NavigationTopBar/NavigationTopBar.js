'use client';

import React from 'react';
import { useNavigation } from '../../hooks/useNavigation';
import NavigationTopBarItem from '../NavigationTopBarItem/NavigationTopBarItem';
import HamburgerIcon from '../../../../shared/components/HamburgerIcon/HamburgerIcon';
import CloseIcon from '../../../../shared/components/CloseIcon/CloseIcon';
import './NavigationTopBar.scss';

/**
 * Main navigation top bar component for the application.
 * Displays navigation items list with responsive support.
 * 
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onItemClick - Optional callback when a navigation item is clicked
 * @returns {JSX.Element} The rendered navigation top bar component
 */
const NavigationTopBar = ({ navigationData = [], onItemClick }) => {
    // Utilisation du hook personnalisé pour la navigation
    const {
        isMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu
    } = useNavigation();

    return (
        <>
            {/* Bouton toggle pour le menu mobile */}
            <button 
                className="mobile-nav-toggle"
                aria-controls="primary-navigation"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                onClick={toggleMobileMenu}
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

            {/* Menu de navigation */}
            <nav className={`nav-menu ${isMobileMenuOpen ? 'nav-menu--open' : ''}`}>
                <ul 
                    id="primary-navigation" 
                    className="primary-navigation"
                    data-visible={isMobileMenuOpen}
                >
                    {/* Rendu de chaque élément de navigation */}
                    {navigationData.map((item, index) => (
                        <NavigationTopBarItem
                            key={`nav-${item.type || item.name}-${index}`}
                            item={item}
                            index={index}
                            onItemClick={() => {
                                closeMobileMenu();
                                onItemClick && onItemClick(item);
                            }}
                        />
                    ))}
                </ul>
            </nav>

            {/* Overlay pour fermer le menu mobile en cliquant à l'extérieur */}
            {isMobileMenuOpen && (
                <div 
                    className="nav-overlay"
                    onClick={closeMobileMenu}
                    aria-hidden="true"
                />
            )}
        </>
    );
};

export default NavigationTopBar;