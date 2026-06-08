'use client';

import React from 'react';
import Link from 'next/link';
import { useNavigation } from '../../../hooks/useNavigation';
import './NavigationItem.scss';

/**
 * Simple navigation item component for basic links.
 * Handles single-level navigation items without dropdowns.
 * 
 * @param {Object} item - The navigation item (contains path, name, etc.)
 * @param {Function} onItemClick - Function called when the item is clicked
 * @param {string} itemClassName - Optional additional CSS class for the item
 * @param {string} activeClassName - Optional CSS class for active state
 * @returns {JSX.Element} The rendered navigation item
 */
const NavigationItem = ({ 
    item, 
    onItemClick,
    itemClassName = '',
    activeClassName = ''
}) => {
    // Hook personnalisé pour les fonctions utilitaires de navigation
    const { isActivePath } = useNavigation();
    
    // Déterminer si le lien est actif
    const isActive = isActivePath(item.path);
    
    // Gestion du clic
    const handleClick = () => {
        if (onItemClick) {
            onItemClick();
        }
    };
    
    // Classes CSS dynamiques (rôle .nav-item + préfixe .topbar-item)
    const itemClasses = [
        'nav-item',
        'topbar-item',
        isActive && activeClassName,
        itemClassName
    ].filter(Boolean).join(' ');

    // Lien feuille : rôle .nav-link + facette feuille + préfixe .topbar-link
    const linkClasses = [
        'nav-link',
        'nav-link--leaf',
        'topbar-link',
        isActive && 'nav-link--active'
    ].filter(Boolean).join(' ');

    return (
        <li className={itemClasses}>
            <Link 
                href={item.path}
                className={linkClasses}
                onClick={handleClick}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className="nav-text topbar-text">{item.name}</span>
            </Link>
        </li>
    );
};

export default NavigationItem;