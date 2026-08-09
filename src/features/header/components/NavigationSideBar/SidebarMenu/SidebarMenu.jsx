'use client';

import React from 'react';
import SidebarNode from '../SidebarNode/SidebarNode';
import { useNavigationLabels } from '@/features/header/providers/NavigationProvider';
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
    // Libellés fournis par <Header>, déjà fusionnés sur ses défauts : ce composant est
    // trop profond dans l'arbre pour les recevoir en prop sans traverser trois niveaux
    // qui n'en affichent aucun (cf. l'en-tête de NavigationProvider).
    const labels = useNavigationLabels('sidebar');

    // Vérification des données de navigation
    if (!navigationData || navigationData.length === 0) {
        return null;
    }

    // Classes CSS pour le menu
    const menuClasses = [
        'sidebar-menu',
        `sidebar-menu--level-${level}`
    ].filter(Boolean).join(' ');

    return (
        <nav className={menuClasses} aria-label={labels.menu}>
            <ul className="sidebar-list">
                {/* SidebarNode choisit groupe ou item selon la présence d'enfants */}
                {navigationData.map((item, index) => (
                    <SidebarNode
                        key={item.id || index}
                        item={item}
                        onItemClick={onItemClick}
                        level={level}
                    />
                ))}
            </ul>
        </nav>
    );
};

export default SidebarMenu;