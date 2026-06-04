'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSidebar } from '../NavigationSideBar/NavigationSideBar';
import { AccessibleIcon } from '@/features/accessibility';
import SidebarItem from '../SidebarItem/SidebarItem';
import './SidebarGroup.scss';

/**
 * Collapsible sidebar group component for navigation items with children.
 * Supports nested navigation and icon display.
 *
 * @param {Object} item - Navigation item with children
 * @param {Function} onItemClick - Callback when a navigation item is clicked
 * @param {number} level - Current nesting level
 * @returns {JSX.Element} The rendered sidebar group
 */
const SidebarGroup = ({
    item,
    onItemClick,
    level = 0
}) => {
    // État pour gérer l'expansion du groupe
    const [isExpanded, setIsExpanded] = useState(false);

    // Contexte de la sidebar
    const { isOpen: sidebarIsOpen, hasIcons, isActivePath, hasActiveChildren } = useSidebar();

    // useId garantit un ID stable entre le rendu SSR et l'hydratation client
    const contentId = `sidebar-group-content-${useId()}`;

    // Vérifier si l'item ou ses enfants sont actifs
    const isActive = isActivePath(item.path);
    const hasActiveChild = hasActiveChildren(item);
    const shouldShowAsActive = isActive || hasActiveChild;

    // Toggle de l'expansion
    const toggleExpanded = () => {
        setIsExpanded(prev => !prev);
    };

    // Gestion du clic sur l'item (zone principale seulement)
    const handleItemClick = (event) => {
        // Si c'est un lien avec une URL valide, laisser le comportement par défaut
        if (item.path && item.path !== '#' && !item.path.startsWith('javascript:')) {
            if (onItemClick) {
                onItemClick(item);
            }
            return;
        }

        // Sinon, empêcher la navigation et juste toggle l'expansion
        event.preventDefault();
        toggleExpanded();
    };

    // Gestion du clic sur le chevron (toujours toggle)
    const handleChevronClick = (event) => {
        event.preventDefault();
        event.stopPropagation(); // Empêche la propagation vers le trigger principal
        toggleExpanded();
    };

    // Gestion des raccourcis clavier
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (item.path && item.path !== '#') {
                handleItemClick(event);
            } else {
                toggleExpanded();
            }
        }
        if (event.key === 'ArrowRight' && !isExpanded) {
            setIsExpanded(true);
        }
        if (event.key === 'ArrowLeft' && isExpanded) {
            setIsExpanded(false);
        }
    };

    // Classes CSS pour le groupe
    const groupClasses = [
        'sidebar-group',
        `sidebar-group--level-${level}`,
        shouldShowAsActive ? 'sidebar-group--active' : '',
        isExpanded ? 'sidebar-group--expanded' : 'sidebar-group--collapsed',
        sidebarIsOpen ? 'sidebar-group--sidebar-open' : 'sidebar-group--sidebar-collapsed'
    ].filter(Boolean).join(' ');

    // Classes CSS pour le trigger
    const triggerClasses = [
        'sidebar-group-trigger',
        shouldShowAsActive ? 'sidebar-group-trigger--active' : ''
    ].filter(Boolean).join(' ');

    // Déterminer si on a des enfants à afficher
    const hasChildren = item.children && item.children.length > 0;

    // Fonction récursive pour rendre le contenu imbriqué (inspirée de DropdownContentRenderer)
    const renderNestedContent = (children, currentLevel) => {
        if (!children || !Array.isArray(children) || children.length === 0) {
            return null;
        }

        return children.map((child, index) => {
            // Si l'enfant a des sous-enfants, créer un groupe imbriqué
            if (child.children && Array.isArray(child.children) && child.children.length > 0) {
                return (
                    <SidebarGroup
                        key={child.id || index}
                        item={child}
                        onItemClick={onItemClick}
                        level={currentLevel}
                    />
                );
            } else {
                // Sinon, créer un item simple
                return (
                    <SidebarItem
                        key={child.id || index}
                        item={child}
                        onItemClick={onItemClick}
                        level={currentLevel}
                    />
                );
            }
        });
    };

    // Déterminer le composant wrapper (Link, button ou div)
    const TriggerComponent = item.path && item.path !== '#' ? Link : 'button';
    const triggerProps = item.path && item.path !== '#'
        ? { href: item.path }
        : { type: 'button', onClick: handleItemClick };

    return (
        <li className={groupClasses}>
            {/* Trigger principal du groupe */}
            <TriggerComponent
                {...triggerProps}
                className={triggerClasses}
                onKeyDown={handleKeyDown}
                aria-expanded={isExpanded}
                aria-controls={hasChildren ? contentId : undefined}
                aria-label={item.name}
                title={!sidebarIsOpen ? item.name : undefined} // Tooltip quand sidebar fermée
            >
                {/* Icône de l'item (si disponible et si des icônes existent dans la navigation) */}
                {hasIcons && item.icon && (
                    <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                        className="sidebar-group-icon"
                    />
                )}

                {/* Texte du groupe (visible quand sidebar ouverte) */}
                {sidebarIsOpen && (
                    <span className="sidebar-group-text">
                        {item.name}
                    </span>
                )}
            </TriggerComponent>

            {/* Indicateur d'expansion (chevron) - clickable séparément */}
            {sidebarIsOpen && hasChildren && (
                <button
                    type="button"
                    className="sidebar-group-chevron-button"
                    onClick={handleChevronClick}
                    aria-label={isExpanded ? 'Fermer le groupe' : 'Ouvrir le groupe'}
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                >
                    <AccessibleIcon
                        icon={
                            <svg
                                className="sidebar-group-chevron-icon"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        }
                        label={isExpanded ? 'Fermer' : 'Ouvrir'}
                        decorative={true}
                    />
                </button>
            )}

            {/* Contenu collapsible - supportant plusieurs niveaux */}
            {isExpanded && hasChildren && sidebarIsOpen && (
                <ul id={contentId} className="sidebar-group-content">
                    {renderNestedContent(item.children, level + 1)}
                </ul>
            )}
        </li>
    );
};

export default SidebarGroup;