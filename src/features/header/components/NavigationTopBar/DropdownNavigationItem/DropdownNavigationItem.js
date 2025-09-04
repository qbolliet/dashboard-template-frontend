'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNavigation } from '../../../hooks/useNavigation';
import DropdownToggleButton from '../../../../../components/ui/DropdownToggleButton/DropdownToggleButton';
import ChevronDownIcon from '../../../../../components/icons/ChevronDownIcon/ChevronDownIcon';
import { renderDropdownContent } from './DropdownContentRenderer';
import './DropdownNavigationItem.scss';

/**
 * Dropdown navigation item component.
 * Handles navigation items with sub-menus and complex dropdown structures.
 * 
 * @param {Object} item - The navigation item (contains path, name, children, etc.)
 * @param {number} index - Index of the item in the list
 * @param {Function} onItemClick - Function called when clicking on an item
 * @param {string} itemClassName - Optional additional CSS class for the item
 * @param {string} activeClassName - Optional CSS class for active state
 * @returns {JSX.Element} The rendered dropdown navigation item
 */
const DropdownNavigationItem = ({ 
    item, 
    index, 
    onItemClick,
    itemClassName = '',
    activeClassName = ''
}) => {
    // États locaux pour gérer l'ouverture des dropdowns
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    
    // Référence pour gérer les clics à l'extérieur du dropdown
    const dropdownRef = useRef(null);
    
    // Hook personnalisé pour les fonctions utilitaires de navigation
    const { isActivePath, hasActiveChildren } = useNavigation();
    
    /**
     * Gère les clics à l'extérieur du dropdown pour le fermer.
     */
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsDropdownOpen(false);
        }
    };

    // Effet pour écouter les clics à l'extérieur
    useEffect(() => {
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isDropdownOpen]);

    /**
     * Basculer l'état du dropdown.
     */
    const toggleDropdown = () => {
        setIsDropdownOpen(prev => !prev);
    };

    /**
     * Basculer l'expansion d'un groupe individuel sur mobile.
     */
    const toggleGroupExpansion = (groupIndex) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupIndex)) {
                newSet.delete(groupIndex);
            } else {
                newSet.add(groupIndex);
            }
            return newSet;
        });
    };

    /**
     * Fermer le dropdown et appeler la fonction parent.
     */
    const handleItemClick = () => {
        setIsDropdownOpen(false);
        if (onItemClick) {
            onItemClick();
        }
    };

    /**
     * Gérer les événements clavier pour l'accessibilité.
     */
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            setIsDropdownOpen(false);
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleDropdown();
        }
    };

    // Déterminer les états CSS pour l'élément
    const isActive = isActivePath(item.path);
    const hasActiveChild = hasActiveChildren(item);
    const hasChildren = item.children && item.children !== null;

    // Classes CSS dynamiques
    const itemClasses = [
        'nav-item',
        'nav-item--dropdown',
        isActive && 'nav-item--active',
        hasActiveChild && 'nav-item--has-active-child',
        hasChildren && 'nav-item--has-dropdown',
        isActive && activeClassName,
        itemClassName
    ].filter(Boolean).join(' ');

    const linkClasses = [
        'nav-link',
        isActive && 'nav-link--active',
        hasActiveChild && 'nav-link--has-active-child'
    ].filter(Boolean).join(' ');

    return (
        <li className={itemClasses} ref={dropdownRef}>
            {/* En-tête de l'élément de navigation */}
            <div className="nav-item__header">
                {/* Lien principal */}
                <Link 
                    href={item.path}
                    className={linkClasses}
                    onClick={handleItemClick}
                    aria-current={isActive ? 'page' : undefined}
                >
                    {item.name}
                </Link>

                {/* Bouton dropdown si l'élément a des enfants */}
                {hasChildren && (
                    <DropdownToggleButton
                        isOpen={isDropdownOpen}
                        onClick={toggleDropdown}
                        onKeyDown={handleKeyDown}
                        ariaControls={`dropdown-${index}`}
                        ariaLabel={`${isDropdownOpen ? 'Fermer' : 'Ouvrir'} le sous-menu de ${item.name}`}
                    />
                )}
            </div>

            {/* Dropdown avec sous-éléments */}
            {hasChildren && (
                <div 
                    id={`dropdown-${index}`}
                    className={`nav-dropdown ${isDropdownOpen ? 'nav-dropdown--open' : ''}`}
                    aria-hidden={!isDropdownOpen}
                >
                    {renderDropdownContent(
                        item, 
                        handleItemClick, 
                        isActivePath, 
                        expandedGroups, 
                        toggleGroupExpansion,
                        ChevronDownIcon
                    )}
                </div>
            )}
        </li>
    );
};

export default DropdownNavigationItem;