'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSidebar } from '../NavigationSideBar/NavigationSideBar';
import { AccessibleIcon } from '@/features/accessibility';
import { ChevronIcon } from '@/components/icons';
import SidebarNode from '../SidebarNode/SidebarNode';
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

    // Lazy-mount + keep-mounted : le sous-arbre n'est monté qu'au premier dépliage,
    // puis conservé. Le DOM initial reste léger (les branches jamais ouvertes ne sont
    // pas montées) sans payer de montage/démontage RÉPÉTÉ ensuite. Une fois monté,
    // l'apparition/disparition redevient purement CSS (cf. grille du parent dans
    // SidebarGroup.scss). `hasBeenExpanded` ne redescend jamais à false.
    // Verrou (latch) : passe à true au premier dépliage et n'en redescend jamais.
    const [hasBeenExpanded, setHasBeenExpanded] = useState(false);
    if (isExpanded && !hasBeenExpanded) {
        setHasBeenExpanded(true);
    }

    // Contexte de la sidebar
    const { isOpen: sidebarIsOpen, hasIcons, isActivePath, hasActiveChildren } = useSidebar();

    // useId garantit un ID stable entre le rendu SSR et l'hydratation client
    const contentId = `sidebar-group-content-${useId()}`;

    // Vérifier si l'item ou ses enfants sont actifs
    const isActive = isActivePath(item.path);
    const hasActiveChild = hasActiveChildren(item);
    const shouldShowAsActive = isActive || hasActiveChild;

    // Dérivations partagées : un lien réel (chemin valide non placeholder) et la présence d'enfants.
    const isLink = Boolean(item.path && item.path !== '#');
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

    // Toggle de l'expansion
    const toggleExpanded = () => {
        setIsExpanded(prev => !prev);
    };

    // Gestion du clic sur l'item (zone principale seulement)
    const handleItemClick = (event) => {
        // Lien réellement navigable : laisser le comportement par défaut + notifier le parent
        if (isLink && !item.path.startsWith('javascript:')) {
            if (onItemClick) {
                onItemClick(item);
            }
            return;
        }

        // Sinon (placeholder / javascript:), empêcher la navigation et juste toggle l'expansion
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
            if (isLink) {
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

    // Classes CSS pour le groupe (rôle .nav-row + préfixe .sidebar-group)
    const groupClasses = [
        'nav-row',
        'sidebar-group',
        `sidebar-group--level-${level}`,
        shouldShowAsActive ? 'sidebar-group--active' : '',
        isExpanded ? 'sidebar-group--expanded' : 'sidebar-group--collapsed',
        sidebarIsOpen ? 'sidebar-group--sidebar-open' : 'sidebar-group--sidebar-collapsed'
    ].filter(Boolean).join(' ');

    // Classes CSS pour le trigger (rôle .nav-link + facette parent + préfixe .sidebar-group-header)
    const triggerClasses = [
        'nav-link',
        'nav-link--parent',
        'sidebar-group-header',
        shouldShowAsActive ? 'sidebar-group-header--active' : ''
    ].filter(Boolean).join(' ');

    // Déterminer le composant wrapper (Link pour un lien réel, sinon button)
    const TriggerComponent = isLink ? Link : 'button';
    const triggerProps = isLink
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
                        className="sidebar-icon"
                    />
                )}

                {/* Texte du groupe : toujours monté ; masqué en mode rail via le CSS
                    (.sidebar-group--sidebar-collapsed .sidebar-text → display:none).
                    Source de vérité unique côté style, et transition fluide au toggle. */}
                <span className="nav-text sidebar-text">
                    {item.name}
                </span>
            </TriggerComponent>

            {/* Indicateur d'expansion (chevron) - clickable séparément */}
            {sidebarIsOpen && hasChildren && (
                <button
                    type="button"
                    className="nav-toggle sidebar-toggle"
                    onClick={handleChevronClick}
                    aria-label={isExpanded ? 'Fermer le groupe' : 'Ouvrir le groupe'}
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                >
                    <AccessibleIcon
                        icon={
                            <ChevronIcon
                                direction="right"
                                className="sidebar-toggle-icon"
                                width={16}
                                height={16}
                            />
                        }
                        label={isExpanded ? 'Fermer' : 'Ouvrir'}
                        decorative={true}
                    />
                </button>
            )}

            {/* Contenu collapsible - supportant plusieurs niveaux via SidebarNode.
                Monté au premier dépliage puis conservé (cf. hasBeenExpanded) : tant qu'il
                est monté, l'apparition/disparition est pilotée par le CSS (la grille du
                parent anime grid-template-rows 0fr ↔ 1fr, auto-dimensionnée).
                `inert` (replié) sort le contenu de l'ordre de tabulation ET de l'arbre
                d'accessibilité — indispensable puisqu'il reste dans le DOM. */}
            {hasChildren && sidebarIsOpen && (isExpanded || hasBeenExpanded) && (
                <ul
                    id={contentId}
                    className="sidebar-group-content"
                    inert={!isExpanded}
                >
                    {item.children.map((child, index) => (
                        <SidebarNode
                            key={child.id || index}
                            item={child}
                            onItemClick={onItemClick}
                            level={level + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

export default SidebarGroup;