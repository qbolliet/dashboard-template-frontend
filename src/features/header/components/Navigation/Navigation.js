'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from 'next/navigation';
import NavigationDropdown from '../NavigationDropdown/NavigationDropdown';
import MobileMenuToggle from '../MobileMenuToggle/MobileMenuToggle';
import './Navigation.scss';

/**
 * Main navigation component with mobile-responsive dropdown functionality.
 * Handles both desktop and mobile navigation states.
 * 
 * @param {Array} navigationData - Array of navigation items from JSON config
 * @param {Function} onItemClick - Optional callback when navigation item is clicked
 * @returns {JSX.Element} The rendered navigation component
 */
const Navigation = ({ navigationData = [], onItemClick }) => {
    // État pour gérer l'affichage du menu mobile
    const [toggleClick, setToggleClick] = useState(false);
    // État pour gérer l'hydratation
    const [isHydrated, setIsHydrated] = useState(false);
    
    const router = useRouter();
    const pathname = usePathname();
    
    // Gérer l'hydratation côté client
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Utiliser pathname seulement après hydratation, sinon utiliser '/'
    const currentPath = isHydrated ? pathname : '/';

    /**
     * Handle navigation item click.
     * 
     * @param {string} path - The navigation path to navigate to
     */
    const handleNavigationClick = (path) => {
        router.push(path);
        if (onItemClick) {
            onItemClick(path);
        }
        // Fermer le menu mobile si ouvert
        setToggleClick(false);
    };

    return (
        <>
            {/* Bouton hamburger pour mobile */}
            <MobileMenuToggle 
                isOpen={toggleClick}
                onToggle={() => setToggleClick(!toggleClick)}
            />
            
            {/* Menu de navigation */}
            <nav className={toggleClick ? 'nav-menu show' : 'nav-menu'}>
                <ul 
                    id="primary-navigation" 
                    className="primary-navigation flex" 
                    data-visible={toggleClick ? "true" : "false"}
                >
                    {navigationData.map((item, index) => (
                        <NavigationDropdown 
                            key={index}
                            item={item} 
                            index={index} 
                            currentPath={currentPath} 
                            onNavigationClick={handleNavigationClick}
                            isHydrated={isHydrated}
                        />
                    ))}
                </ul>
            </nav>
        </>
    );
};

export default Navigation;