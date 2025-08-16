'use client';

import React from 'react';
import Link from 'next/link';
import Navigation from '../Navigation/Navigation';
import SearchBar from '../SearchBar/SearchBar';
import ThemeToggleButton from '../../../theme/components/ThemeToggleButton/ThemeToggleButton';
import './Header.scss';

/**
 * Main header component for the application.
 * Contains logo, navigation, search bar and theme toggle.
 * 
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onNavigationItemClick - Optional callback when a navigation item is clicked
 * @returns {JSX.Element} The rendered header component
 */
const Header = ({ navigationData = [], onNavigationItemClick }) => {
    return (
        <header className="primary-header flex">
            {/* Conteneur de gauche : Logo + Navigation */}
            <div className="left-container">
                {/* Logo de l'application */}
                <Link href="/">
                    <img src="/logo.svg" alt="website logo" className="logo"/>
                </Link>
                
                {/* Navigation principale */}
                <Navigation 
                    navigationData={navigationData}
                    onItemClick={onNavigationItemClick}
                />
            </div>

            {/* Conteneur de droite : Barre de recherche + Toggle thème */}
            <div className="right-container">
                {/* Barre de recherche */}
                <SearchBar />
                
                {/* Bouton de basculement entre thème clair/sombre */}
                <ThemeToggleButton />
            </div>
        </header>
    );
};

export default Header;