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

    // Classes CSS pour l'item (rôle .nav-item + préfixe .sidebar-item)
    const itemClasses = [
        'nav-item',
        'sidebar-item',
        `sidebar-item--level-${level}`,
        isActive ? 'sidebar-item--active' : '',
        sidebarIsOpen ? 'sidebar-item--sidebar-open' : 'sidebar-item--sidebar-collapsed'
    ].filter(Boolean).join(' ');

    // Classes CSS pour le lien (rôle .nav-link + facette feuille + préfixe .sidebar-link)
    const linkClasses = [
        'nav-link',
        'nav-link--leaf',
        'sidebar-link',
        isActive ? 'sidebar-link--active' : ''
    ].filter(Boolean).join(' ');

    // Propriétés communes pour les liens
    const commonLinkProps = {
        className: linkClasses,
        onClick: handleItemClick,
        title: !sidebarIsOpen ? item.name : undefined, // Tooltip quand sidebar fermée
        'aria-label': item.name,
        ...(isActive && { 'aria-current': 'page' }) // Indiquer la page actuelle
    };

    // Contenu du lien
    const linkContent = (
        <>
            {/* Icône de l'item (si des icônes existent dans la navigation) */}
            {hasIcons && item.icon && (
                <Image
                    src={item.icon}
                    alt=""
                    width={20}
                    height={20}
                    className="sidebar-icon"
                />
            )}

            {/* Texte de l'item : toujours monté ; masqué en mode rail via le CSS
                (.sidebar-item--sidebar-collapsed .sidebar-text → display:none). */}
            <span className="nav-text sidebar-text">
                {item.name}
            </span>

            {/* Indicateur de lien externe : idem, masqué en rail par le CSS. */}
            {isExternalLink && (
                <svg
                    className="sidebar-external-indicator"
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
            )}
        </>
    );

    // Rendu conditionnel basé sur le type de lien
    if (!item.path || item.path === '#') {
        // Pas de lien - rendu comme span
        return (
            <li className={itemClasses}>
                <span className="nav-link nav-link--leaf sidebar-link sidebar-link--static">
                    {linkContent}
                </span>
            </li>
        );
    } else if (isExternalLink) {
        // Lien externe - utiliser un tag <a>
        return (
            <li className={itemClasses}>
                <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...commonLinkProps}
                >
                    {linkContent}
                </a>
            </li>
        );
    } else {
        // Lien interne - utiliser Next.js Link
        return (
            <li className={itemClasses}>
                <Link href={item.path} {...commonLinkProps}>
                    {linkContent}
                </Link>
            </li>
        );
    }
};

export default SidebarItem;