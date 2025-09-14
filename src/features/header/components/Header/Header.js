'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import NavigationContainer from '../NavigationTopBar/NavigationContainer/NavigationContainer';
import { NavigationSideBar, SidebarTrigger } from '../NavigationSideBar';
import SearchBar from '../SearchBar/SearchBar';
import ThemeToggleButton from '../../../theme/components/ThemeToggleButton/ThemeToggleButton';
import { useNavigation } from '../../hooks/useNavigation';
import './Header.scss';

/**
 * Main header component for the application.
 * Supports both topbar and sidebar navigation modes.
 *
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onNavigationItemClick - Optional callback when a navigation item is clicked
 * @param {string} navigationType - Type of navigation ('topbar' or 'sidebar')
 * @param {boolean} useSwitcher - Whether to use switcher in sidebar mode
 * @param {string} currentPageTitle - Title of current page (for sidebar breadcrumb)
 * @returns {JSX.Element} The rendered header component
 */
const Header = ({
    navigationData = [],
    onNavigationItemClick,
    navigationType = 'topbar',
    useSwitcher = false,
    currentPageTitle
}) => {
    // État pour la sidebar (si mode sidebar)
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Hook de navigation
    const navigationHook = useNavigation();
    const pathname = usePathname();

    // Fonction pour générer le titre de la page courante
    const getCurrentPageTitle = () => {
        if (currentPageTitle) {
            return currentPageTitle;
        }

        // Essayer de trouver le titre basé sur le chemin actuel
        const findTitleInNavigation = (items, currentPath) => {
            for (const item of items) {
                if (item.path === currentPath) {
                    return item.name;
                }
                if (item.children) {
                    const childTitle = findTitleInNavigation(item.children, currentPath);
                    if (childTitle) {
                        return childTitle;
                    }
                }
            }
            return null;
        };

        return findTitleInNavigation(navigationData, pathname) || 'Page';
    };

    // Toggle de la sidebar
    const handleSidebarToggle = () => {
        setSidebarOpen(prev => !prev);
    };

    const isSidebarMode = navigationType === 'sidebar';

    return (
        <>
            {/* Sidebar de navigation (si mode sidebar) */}
            {isSidebarMode && (
                <NavigationSideBar
                    navigationData={navigationData}
                    onItemClick={onNavigationItemClick}
                    useSwitcher={useSwitcher}
                    defaultOpen={sidebarOpen}
                    key={`sidebar-${sidebarOpen}`} // Force re-render on state change
                />
            )}

            {/* Header principal */}
            <header className={`primary-header ${isSidebarMode ? 'primary-header--sidebar-mode' : ''}`}>
                {/* Conteneur de gauche : Logo/Trigger + Navigation/Breadcrumb */}
                <div className="left-container">
                    {isSidebarMode ? (
                        <>
                            {/* Trigger pour ouvrir/fermer la sidebar */}
                            <SidebarTrigger
                                isOpen={sidebarOpen}
                                onToggle={handleSidebarToggle}
                            />

                            {/* Titre de la page courante (breadcrumb) */}
                            <div className="current-page-title">
                                <span>{getCurrentPageTitle()}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Logo de l'application */}
                            <Link href="/" className="logo-link">
                                <Image src='/logo.svg' alt="Logo du site" className="logo" width={40} height={40} />
                            </Link>

                            {/* Navigation principale */}
                            <NavigationContainer
                                navigationData={navigationData}
                                onItemClick={onNavigationItemClick}
                            />
                        </>
                    )}
                </div>

                {/* Conteneur de droite : Barre de recherche + Toggle thème */}
                <div className="right-container">
                    {/* Barre de recherche */}
                    <SearchBar />

                    {/* Bouton de basculement entre thème clair/sombre */}
                    <ThemeToggleButton />
                </div>
            </header>
        </>
    );
};

export default Header;