'use client';

import React from 'react';
import NavigationItem from '../NavigationItem/NavigationItem';
import DropdownNavigationItem from '../DropdownNavigationItem/DropdownNavigationItem';
import './NavigationMenu.scss';

/**
 * Navigation menu component.
 * Renders a list of navigation items, choosing the appropriate component based on item type.
 * 
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onItemClick - Function called when a navigation item is clicked
 * @param {boolean} isOpen - Whether the mobile menu is currently open
 * @param {string} className - Optional additional CSS class
 * @returns {JSX.Element} The rendered navigation menu
 */
const NavigationMenu = ({ 
    navigationData = [], 
    onItemClick,
    isOpen = false,
    className = ''
}) => {
    // Fonction pour déterminer si un élément a des enfants
    const hasChildren = (item) => {
        return item.children && item.children !== null;
    };

    // Classes CSS pour le menu
    const menuClasses = [
        'nav-menu',
        isOpen && 'nav-menu--open',
        className
    ].filter(Boolean).join(' ');

    return (
        <nav className={menuClasses}>
            <ul 
                id="primary-navigation" 
                className="primary-navigation"
                data-visible={isOpen}
            >
                {/* Rendu de chaque élément de navigation */}
                {navigationData.map((item, index) => {
                    // Déterminer le type de composant à utiliser
                    if (hasChildren(item)) {
                        return (
                            <DropdownNavigationItem
                                key={`nav-dropdown-${item.type || item.name}-${index}`}
                                item={item}
                                index={index}
                                onItemClick={() => {
                                    if (onItemClick) {
                                        onItemClick(item);
                                    }
                                }}
                            />
                        );
                    } else {
                        return (
                            <NavigationItem
                                key={`nav-${item.type || item.name}-${index}`}
                                item={item}
                                onItemClick={() => {
                                    if (onItemClick) {
                                        onItemClick(item);
                                    }
                                }}
                            />
                        );
                    }
                })}
            </ul>
        </nav>
    );
};

export default NavigationMenu;