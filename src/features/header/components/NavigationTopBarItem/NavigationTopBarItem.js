'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNavigation } from '../../hooks/useNavigation';
import DropdownToggleButton from '../../../../shared/components/DropdownToggleButton/DropdownToggleButton';
import ChevronDownIcon from '../../../shared/icons/ChevronDownIcon/ChevronDownIcon';
import './NavigationTopBarItem.scss';

/**
 * Individual navigation item component.
 * Handles simple links and dropdowns with sub-menus.
 * 
 * @param {Object} item - The navigation item (contains path, name, children, etc.)
 * @param {number} index - Index of the item in the list
 * @param {Function} onItemClick - Function called when clicking on an item
 * @returns {JSX.Element} The rendered navigation item component
 */
const NavigationTopBarItem = ({ item, index, onItemClick }) => {
    // État local pour gérer l'ouverture du dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // État pour gérer l'ouverture des groupes individuels sur mobile
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    
    // Référence pour gérer les clics à l'extérieur du dropdown
    const dropdownRef = useRef(null);
    
    // Hook personnalisé pour les fonctions utilitaires de navigation
    const { isActivePath, hasActiveChildren } = useNavigation();
    
    /**
     * Handle clicks outside the dropdown to close it.
     * 
     * @param {Event} event - The click event
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
     * Toggle dropdown state.
     */
    const toggleDropdown = () => {
        setIsDropdownOpen(prev => !prev);
    };

    /**
     * Toggle individual group expansion on mobile.
     * 
     * @param {number} groupIndex - Index of the group to toggle
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
     * Close dropdown and call parent close function.
     */
    const handleItemClick = () => {
        setIsDropdownOpen(false);
        onItemClick && onItemClick();
    };

    /**
     * Handle keyboard events for accessibility.
     * 
     * @param {KeyboardEvent} event - The keyboard event
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

    // Déterminer les classes CSS pour l'élément
    const isActive = isActivePath(item.path);
    const hasActiveChild = hasActiveChildren(item);
    const hasChildren = item.children && item.children !== null;

    // Classes CSS dynamiques
    const itemClasses = [
        'nav-item',
        isActive && 'nav-item--active',
        hasActiveChild && 'nav-item--has-active-child',
        hasChildren && 'nav-item--has-dropdown'
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
                    {renderDropdownContent(item, handleItemClick, isActivePath, expandedGroups, toggleGroupExpansion)}
                </div>
            )}
        </li>
    );
};

/**
 * Utility function to render dropdown content.
 * Handles different types of children structures.
 * 
 * @param {Object} item - The parent item
 * @param {Function} onItemClick - Click handler function
 * @param {Function} isActivePath - Function to check if a path is active
 * @param {Set} expandedGroups - Set of expanded group indices for mobile
 * @param {Function} toggleGroupExpansion - Function to toggle group expansion on mobile
 * @returns {JSX.Element} The rendered dropdown content
 */
const renderDropdownContent = (item, onItemClick, isActivePath, expandedGroups, toggleGroupExpansion) => {
    const { children, path: basePath } = item;

    // PRIORITÉ 1 : Vérifier d'abord la structure à deux niveaux (groupes avec sous-éléments réels)
    // Condition : le premier enfant doit avoir des sous-enfants non-null et non-vides
    // pour distinguer "Comptabilité Nationale" (qui a des vrais sous-enfants) de "Finances Publiques" (qui a children: null)
    if (children && Array.isArray(children) && children.length > 0 && 
        children[0] && children[0].hasOwnProperty('children') && 
        children[0].children !== null && 
        Array.isArray(children[0].children) && 
        children[0].children.length > 0) {
        return (
            <div className="nav-dropdown__groups">
                {children.map((group, groupIndex) => {
                    const isGroupExpanded = expandedGroups.has(groupIndex);
                    return (
                        <div key={`group-${groupIndex}`} className={`nav-dropdown__group ${isGroupExpanded ? 'nav-dropdown__group--expanded' : ''}`}>
                            {/* En-tête du groupe avec chevron mobile */}
                            <div className="nav-dropdown__group-header-wrapper">
                                <Link
                                    href={basePath + group.path}
                                    className={`nav-dropdown__group-header ${
                                        isActivePath(basePath + group.path) ? 'nav-dropdown__group-header--active' : ''
                                    }`}
                                    onClick={onItemClick}
                                >
                                    {group.name}
                                </Link>
                                
                                {/* Chevron pour mobile uniquement - géré par CSS */}
                                {group.children && Array.isArray(group.children) && group.children.length > 0 && (
                                    <button
                                        className={`nav-dropdown__group-chevron ${isGroupExpanded ? 'nav-dropdown__group-chevron--expanded' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleGroupExpansion(groupIndex);
                                        }}
                                        aria-expanded={isGroupExpanded}
                                        aria-label={`${isGroupExpanded ? 'Réduire' : 'Développer'} le groupe ${group.name}`}
                                        type="button"
                                    >
                                        <ChevronDownIcon width="12" height="12" />
                                    </button>
                                )}
                            </div>
                        
                            {/* Sous-éléments du groupe - afficher seulement si le groupe a des enfants */}
                            {group.children && Array.isArray(group.children) && group.children.length > 0 && (
                                <ul className={`nav-dropdown__sublist ${isGroupExpanded ? 'nav-dropdown__sublist--expanded' : ''}`}>
                                {group.children.map((subChild, subIndex) => (
                                    <li key={`sub-${subIndex}`} className="nav-dropdown__subitem">
                                        <Link
                                            href={basePath + group.path + subChild.path}
                                            className={`nav-dropdown__sublink ${
                                                isActivePath(basePath + group.path + subChild.path) 
                                                    ? 'nav-dropdown__sublink--active' : ''
                                            }`}
                                            onClick={onItemClick}
                                            aria-current={
                                                isActivePath(basePath + group.path + subChild.path) 
                                                    ? 'page' : undefined
                                            }
                                        >
                                            {subChild.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )})}
            </div>
        );
    }

    // PRIORITÉ 2 : Structure simple à un niveau (liste d'éléments sans sous-éléments)
    // Condition : children doit être un tableau non vide
    if (children && Array.isArray(children) && children.length > 0) {
        return (
            <ul className="nav-dropdown__list">
                {children.map((child, childIndex) => (
                    <li key={`child-${childIndex}`} className="nav-dropdown__item">
                        <Link
                            href={basePath + child.path}
                            className={`nav-dropdown__link ${
                                isActivePath(basePath + child.path) ? 'nav-dropdown__link--active' : ''
                            }`}
                            onClick={onItemClick}
                            aria-current={isActivePath(basePath + child.path) ? 'page' : undefined}
                        >
                            {child.name}
                        </Link>
                    </li>
                ))}
            </ul>
        );
    }

    // Fallback : si la structure children n'est pas reconnue ou est vide
    return null;
};

export default NavigationTopBarItem;