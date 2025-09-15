'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSidebar } from '../NavigationSideBar/NavigationSideBar';
import './SidebarItem.scss';

/**
 * Individual sidebar navigation item component.
 * Supports both internal and external links with optional icons.
 *
 * @param {Object} item - Navigation item data
 * @param {Function} onItemClick - Callback when the item is clicked
 * @param {number} level - Current nesting level
 * @returns {JSX.Element} The rendered sidebar item
 */
const SidebarItem = ({
    item,
    onItemClick,
    level = 0
}) => {
    // Contexte de la sidebar
    const { isOpen: sidebarIsOpen, hasIcons, isActivePath } = useSidebar();

    // Vérifier si l'item est actif
    const isActive = isActivePath(item.path);

    // Gestion du clic sur l'item
    const handleItemClick = (event) => {
        if (onItemClick) {
            onItemClick(item);
        }
    };

    // Déterminer si c'est un lien externe
    const isExternalLink = item.path && (
        item.path.startsWith('http://') ||
        item.path.startsWith('https://') ||
        item.path.startsWith('mailto:') ||
        item.path.startsWith('tel:')
    );

    // Classes CSS pour l'item
    const itemClasses = [
        'sidebar-item',
        `sidebar-item--level-${level}`,
        isActive ? 'sidebar-item--active' : '',
        sidebarIsOpen ? 'sidebar-item--sidebar-open' : 'sidebar-item--sidebar-collapsed'
    ].filter(Boolean).join(' ');

    // Classes CSS pour le lien
    const linkClasses = [
        'sidebar-item-link',
        isActive ? 'sidebar-item-link--active' : ''
    ].filter(Boolean).join(' ');

    // Propriétés communes pour les liens
    const commonLinkProps = {
        className: linkClasses,
        onClick: handleItemClick,
        title: !sidebarIsOpen ? item.name : undefined, // Tooltip quand sidebar fermée
        'aria-label': item.name
    };

    // Contenu du lien
    const linkContent = (
        <>
            {/* Icône de l'item (si des icônes existent dans la navigation) */}
            {hasIcons && (
                <div className="sidebar-item-icon">
                    {item.icon ? (
                        <Image
                            src={item.icon}
                            alt=""
                            width={20}
                            height={20}
                        />
                    ) : (
                        // Espace réservé pour maintenir l'alignement quand certains items n'ont pas d'icône
                        <div className="sidebar-item-icon-placeholder" />
                    )}
                </div>
            )}

            {/* Texte de l'item (visible quand sidebar ouverte) */}
            {sidebarIsOpen && (
                <span className="sidebar-item-text">
                    {item.name}
                </span>
            )}

            {/* Indicateur de lien externe */}
            {isExternalLink && sidebarIsOpen && (
                <div className="sidebar-item-external-indicator">
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M7 17L17 7" />
                        <path d="M7 7h10v10" />
                    </svg>
                </div>
            )}
        </>
    );

    // Rendu conditionnel basé sur le type de lien
    if (!item.path || item.path === '#') {
        // Pas de lien - rendu comme span
        return (
            <div className={itemClasses}>
                <span className="sidebar-item-span">
                    {linkContent}
                </span>
            </div>
        );
    } else if (isExternalLink) {
        // Lien externe - utiliser un tag <a>
        return (
            <div className={itemClasses}>
                <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...commonLinkProps}
                >
                    {linkContent}
                </a>
            </div>
        );
    } else {
        // Lien interne - utiliser Next.js Link
        return (
            <div className={itemClasses}>
                <Link href={item.path} {...commonLinkProps}>
                    {linkContent}
                </Link>
            </div>
        );
    }
};

export default SidebarItem;