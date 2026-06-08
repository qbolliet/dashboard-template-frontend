'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNavigation } from '../../../hooks/useNavigation';
import DropdownToggleButton from '../DropdownToggleButton/DropdownToggleButton';
import DropdownContent from './DropdownContent';
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

    // Référence vers le bouton toggle (pour y renvoyer le focus à la fermeture clavier)
    const toggleButtonRef = useRef(null);

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
     *
     * Note : Enter/Espace sont déjà gérés nativement par le <button> toggle
     * (déclenchement de onClick). On ne traite donc ici que la touche Échap,
     * pour fermer le dropdown et renvoyer le focus sur le bouton toggle.
     */
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            setIsDropdownOpen(false);
            toggleButtonRef.current?.focus();
        }
    };

    // Déterminer les états CSS pour l'élément
    const isActive = isActivePath(item.path);
    const hasActiveChild = hasActiveChildren(item);
    const hasChildren = item.children && item.children !== null;

    // Classes CSS dynamiques (rôle .nav-row + préfixe .topbar-group)
    const itemClasses = [
        'nav-row',
        'topbar-group',
        isDropdownOpen && 'topbar-group--open',
        isActive && activeClassName,
        itemClassName
    ].filter(Boolean).join(' ');

    // En-tête racine : rôle .nav-link + facette parent + préfixe .topbar-group-header
    const linkClasses = [
        'nav-link',
        'nav-link--parent',
        'topbar-group-header',
        isActive && 'nav-link--active',
        hasActiveChild && 'nav-link--has-active-child'
    ].filter(Boolean).join(' ');

    return (
        <li className={itemClasses} ref={dropdownRef}>
            {/* Lien principal */}
            <Link
                href={item.path}
                className={linkClasses}
                onClick={handleItemClick}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className="nav-text topbar-text">{item.name}</span>
            </Link>

            {/* Bouton dropdown si l'élément a des enfants */}
            {hasChildren && (
                <DropdownToggleButton
                    ref={toggleButtonRef}
                    isOpen={isDropdownOpen}
                    onClick={toggleDropdown}
                    onKeyDown={handleKeyDown}
                    ariaControls={`dropdown-${index}`}
                    ariaLabel={`${isDropdownOpen ? 'Fermer' : 'Ouvrir'} le sous-menu de ${item.name}`}
                />
            )}

            {/* Dropdown avec sous-éléments : le <ul> EST le panneau (plus de wrapper <div>) */}
            {hasChildren && (
                <DropdownContent
                    item={item}
                    id={`dropdown-${index}`}
                    isOpen={isDropdownOpen}
                    onItemClick={handleItemClick}
                    isActivePath={isActivePath}
                    expandedGroups={expandedGroups}
                    toggleGroupExpansion={toggleGroupExpansion}
                />
            )}
        </li>
    );
};

export default DropdownNavigationItem;