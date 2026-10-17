'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNavigationRoute, useNavigationLabels } from '@/features/header/providers/NavigationProvider';
import { interpolate } from '@/utils/i18n/interpolate';
import TopbarToggleButton from '../TopbarToggleButton/TopbarToggleButton';
import TopbarNode from '../TopbarNode/TopbarNode';
import './TopbarGroup.scss';

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
const TopbarGroup = ({
    item,
    index,
    onItemClick,
    itemClassName = '',
    activeClassName = ''
}) => {
    // Libellés distribués par <Header> via NavigationProvider.
    const labels = useNavigationLabels('topbar');
    // États locaux pour gérer l'ouverture des dropdowns
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState(new Set());

    // Référence pour gérer les clics à l'extérieur du dropdown
    const dropdownRef = useRef(null);

    // Référence vers le bouton toggle (pour y renvoyer le focus à la fermeture clavier)
    const toggleButtonRef = useRef(null);

    // Contexte de route : ne dépend que du pathname (stable au toggle du menu mobile).
    const { isActivePath, isCurrentPath, hasActiveChildren } = useNavigationRoute();

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
    // Dossier : un nœud sans chemin n'a pas de page. Son libellé devient le déclencheur du
    // menu (un <button>), et le chevron séparé, redondant, disparaît.
    const isLink = Boolean(item.path);

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
            {/* Lien principal, ou bouton de dépliage pour un dossier */}
            {isLink ? (
                <Link
                    href={item.path}
                    className={linkClasses}
                    onClick={handleItemClick}
                    aria-current={isCurrentPath(item.path) ? 'page' : undefined}
                >
                    <span className="nav-text topbar-text">{item.name}</span>
                </Link>
            ) : (
                <button
                    type="button"
                    className={linkClasses}
                    onClick={toggleDropdown}
                    onKeyDown={handleKeyDown}
                    aria-expanded={isDropdownOpen}
                    aria-controls={`dropdown-${index}`}
                >
                    <span className="nav-text topbar-text">{item.name}</span>
                </button>
            )}

            {/* Bouton dropdown si l'élément a des enfants (le libellé d'un dossier l'est déjà) */}
            {hasChildren && isLink && (
                <TopbarToggleButton
                    ref={toggleButtonRef}
                    isOpen={isDropdownOpen}
                    onClick={toggleDropdown}
                    onKeyDown={handleKeyDown}
                    ariaControls={`dropdown-${index}`}
                    ariaLabel={interpolate(
                        isDropdownOpen ? labels.closeSubmenu : labels.openSubmenu,
                        { name: item.name },
                    )}
                />
            )}

            {/* Dropdown avec sous-éléments : le <ul> EST le panneau (plus de wrapper <div>) */}
            {hasChildren && (
                <TopbarNode
                    item={item}
                    id={`dropdown-${index}`}
                    isOpen={isDropdownOpen}
                    onItemClick={handleItemClick}
                    isActivePath={isActivePath}
                    isCurrentPath={isCurrentPath}
                    expandedGroups={expandedGroups}
                    toggleGroupExpansion={toggleGroupExpansion}
                />
            )}
        </li>
    );
};

export default TopbarGroup;
