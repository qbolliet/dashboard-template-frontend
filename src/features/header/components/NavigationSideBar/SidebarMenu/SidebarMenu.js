'use client';

import React from 'react';
import SidebarGroup from '../SidebarGroup/SidebarGroup';
import SidebarItem from '../SidebarItem/SidebarItem';
import './SidebarMenu.scss';

/**
 * Sidebar menu component that renders navigation items.
 * Handles both grouped and individual navigation items.
 *
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onItemClick - Callback when a navigation item is clicked
 * @param {number} level - Current nesting level (for styling purposes)
 * @returns {JSX.Element} The rendered sidebar menu
 */
const SidebarMenu = ({
    navigationData = [],
    onItemClick,
    level = 0
}) => {
    // Vérification des données de navigation
    if (!navigationData || navigationData.length === 0) {
        return null;
    }

    // Classes CSS pour le menu
    const menuClasses = [
        'sidebar-menu',
        `sidebar-menu--level-${level}`
    ].filter(Boolean).join(' ');

    // Fonction pour déterminer si un item doit être rendu comme groupe
    const shouldRenderAsGroup = (item) => {
        // Un item est un groupe s'il a des enfants, peu importe son type
        return item.children && Array.isArray(item.children) && item.children.length > 0;
    };

    // Fonction pour déterminer si un item doit être rendu comme lien simple
    const shouldRenderAsItem = (item) => {
        return !shouldRenderAsGroup(item);
    };

    return (
        <nav className={menuClasses} aria-label="Navigation latérale principale">
            <ul className="sidebar-menu-list">
                {navigationData.map((item, index) => {
                    // Rendu conditionnel basé sur le type d'item
                    if (shouldRenderAsGroup(item)) {
                        return (
                            <SidebarGroup
                                key={item.id || index}
                                item={item}
                                onItemClick={onItemClick}
                                level={level}
                            />
                        );
                    } else if (shouldRenderAsItem(item)) {
                        return (
                            <SidebarItem
                                key={item.id || index}
                                item={item}
                                onItemClick={onItemClick}
                                level={level}
                            />
                        );
                    }

                    return null;
                })}
            </ul>
        </nav>
    );
};

export default SidebarMenu;