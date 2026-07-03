'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../../../hooks/useNavigation';
import useResizable from '../../../hooks/useResizable';
import { NavTrigger } from '../../NavTrigger';
import TopbarMenu from '../TopbarMenu/TopbarMenu';
import TopbarOverlay from '../TopbarOverlay/TopbarOverlay';
import './TopbarContainer.scss';

// Plage « tablette » (medium) où la topbar s'affiche en tiroir latéral redimensionnable :
// entre le breakpoint small-up (40em) et le breakpoint large (71.8125em). En desktop la
// navigation est inline ; en mobile (< 40em) le tiroir fait 100vw (pas de redimensionnement).
const DRAWER_MEDIA_QUERY = '(min-width: 40em) and (max-width: 71.8125em)';

/**
 * Main navigation container component.
 * Manages mobile menu state and orchestrates all navigation subcomponents.
 *
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onItemClick - Optional callback when a navigation item is clicked
 * @param {string} className - Optional additional CSS class for the container
 * @param {string} ariaLabel - Optional ARIA label for accessibility
 * @param {string} role - Optional ARIA role for accessibility
 * @returns {JSX.Element} The rendered navigation container
 */
const TopbarContainer = ({
    navigationData = [],
    onItemClick,
    className = '',
    ariaLabel = 'Menu de navigation',
    role = 'navigation'
}) => {
    // Utilisation du hook personnalisé pour la navigation
    const {
        isMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu
    } = useNavigation();

    // ===== REDIMENSIONNEMENT DU TIROIR (medium uniquement) =====
    const containerRef = useRef(null);
    // Largeur personnalisée du tiroir en px ; null = valeur du token (--topbar-drawer-width).
    const [drawerWidth, setDrawerWidth] = useState(null);
    // Le tiroir n'est redimensionnable que dans la plage « tablette » (cf. media query).
    const [isDrawerRange, setIsDrawerRange] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(DRAWER_MEDIA_QUERY);
        const update = () => setIsDrawerRange(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    // Bornes alignées sur les tokens --nav-drawer-width-min/max (features/header/_tokens.scss).
    const railHandlers = useResizable({
        direction: 'left',
        min: 200,
        max: 480,
        getCurrentWidth: () =>
            containerRef.current?.querySelector('.topbar-list')?.getBoundingClientRect().width,
        onResize: setDrawerWidth,
    });

    // Gestion du clic sur un élément de navigation
    const handleItemClick = (item) => {
        closeMobileMenu();
        if (onItemClick) {
            onItemClick(item);
        }
    };

    // Classes CSS pour le conteneur
    const containerClasses = [
        'navigation-container',
        className
    ].filter(Boolean).join(' ');

    return (
        <nav
            ref={containerRef}
            className={containerClasses}
            role={role}
            aria-label={ariaLabel}
            // Largeur personnalisée du tiroir (medium uniquement) : héritée par le tiroir
            // (.topbar-list) ET par le rail (calcul de sa position). Voir TopbarContainer.scss.
            style={isDrawerRange && drawerWidth != null
                ? { '--topbar-drawer-width': `${drawerWidth}px` }
                : undefined}
        >
            {/* Bouton toggle pour le menu mobile (composant partagé) */}
            <NavTrigger
                isOpen={isMobileMenuOpen}
                onToggle={toggleMobileMenu}
                className="mobile-nav-toggle"
                ariaControls="primary-navigation"
            />

            {/* Menu de navigation principal */}
            <TopbarMenu
                navigationData={navigationData}
                onItemClick={handleItemClick}
                isOpen={isMobileMenuOpen}
            />

            {/* Rail de redimensionnement du tiroir : bord gauche, en medium et menu ouvert */}
            {isDrawerRange && isMobileMenuOpen && (
                <div
                    className="nav-rail topbar-rail"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Redimensionner le menu"
                    aria-valuemin={200}
                    aria-valuemax={480}
                    tabIndex={0}
                    onPointerDown={railHandlers.onPointerDown}
                    onKeyDown={railHandlers.onKeyDown}
                />
            )}

            {/* Overlay pour fermer le menu mobile */}
            <TopbarOverlay
                isVisible={isMobileMenuOpen}
                onClose={closeMobileMenu}
            />
        </nav>
    );
};

export default TopbarContainer;
