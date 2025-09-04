'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import NavigationContainer from '../NavigationTopBar/NavigationContainer/NavigationContainer';
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
        <header className="primary-header">
            {/* Conteneur de gauche : Logo + Navigation */}
            <div className="left-container">
                {/* Logo de l'application */}
                <Link href="/" className="logo-link">
                    <Image src='/logo.svg' alt="Logo du site" className="logo" width={40} height={40} />
                </Link>
                
                {/* Navigation principale */}
                <NavigationContainer 
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