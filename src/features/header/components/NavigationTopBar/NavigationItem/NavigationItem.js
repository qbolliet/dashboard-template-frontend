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
    
    // Classes CSS dynamiques
    const itemClasses = [
        'nav-item',
        'nav-item--simple',
        isActive && 'nav-item--active',
        isActive && activeClassName,
        itemClassName
    ].filter(Boolean).join(' ');

    const linkClasses = [
        'nav-link',
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
                {item.name}
            </Link>
        </li>
    );
};

export default NavigationItem;