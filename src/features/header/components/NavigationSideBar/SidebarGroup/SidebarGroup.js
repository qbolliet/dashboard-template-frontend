'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSidebar } from '../NavigationSideBar/NavigationSideBar';
import SidebarMenu from '../SidebarMenu/SidebarMenu';
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
    const { isOpen: sidebarIsOpen, isActivePath, hasActiveChildren } = useSidebar();

    // Vérifier si l'item ou ses enfants sont actifs
    const isActive = isActivePath(item.path);
    const hasActiveChild = hasActiveChildren(item);
    const shouldShowAsActive = isActive || hasActiveChild;

    // Toggle de l'expansion
    const toggleExpanded = () => {
        setIsExpanded(prev => !prev);
    };

    // Gestion du clic sur l'item
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

    // Déterminer le composant wrapper (Link ou div)
    const TriggerComponent = item.path && item.path !== '#' ? Link : 'button';
    const triggerProps = item.path && item.path !== '#'
        ? { href: item.path }
        : { type: 'button', onClick: handleItemClick };

    return (
        <div className={groupClasses}>
            {/* Trigger du groupe */}
            <TriggerComponent
                {...triggerProps}
                className={triggerClasses}
                onKeyDown={handleKeyDown}
                aria-expanded={isExpanded}
                aria-label={item.name}
                title={!sidebarIsOpen ? item.name : undefined} // Tooltip quand sidebar fermée
            >
                {/* Icône de l'item (si disponible) */}
                {item.icon && (
                    <div className="sidebar-group-icon">
                        <Image
                            src={item.icon}
                            alt=""
                            width={20}
                            height={20}
                        />
                    </div>
                )}

                {/* Texte du groupe (visible quand sidebar ouverte) */}
                {sidebarIsOpen && (
                    <span className="sidebar-group-text">
                        {item.name}
                    </span>
                )}

                {/* Indicateur d'expansion (chevron) */}
                {sidebarIsOpen && item.children && item.children.length > 0 && (
                    <div className="sidebar-group-chevron">
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
                    </div>
                )}
            </TriggerComponent>

            {/* Contenu collapsible */}
            {isExpanded && item.children && item.children.length > 0 && sidebarIsOpen && (
                <div className="sidebar-group-content">
                    <SidebarMenu
                        navigationData={item.children}
                        onItemClick={onItemClick}
                        level={level + 1}
                    />
                </div>
            )}
        </div>
    );
};

export default SidebarGroup;