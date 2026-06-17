'use client';

import React, { useState, createContext, useContext, useEffect, useId, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useNavigation } from '../../../hooks/useNavigation';
import useResizable from '../../../hooks/useResizable';
import SidebarSwitcher from '../SidebarSwitcher/SidebarSwitcher';
import SidebarMenu from '../SidebarMenu/SidebarMenu';
import { useFocusTrap, useAriaAnnounce } from '@/features/accessibility';
import './NavigationSideBar.scss';

// Context pour gérer l'état de la sidebar
const SidebarContext = createContext();

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar doit être utilisé dans un SidebarProvider');
    }
    return context;
};

// Utilitaire pour détecter si des icônes sont présentes dans les données de navigation
const hasIconsInNavigationData = (navigationData) => {
    if (!navigationData || !Array.isArray(navigationData)) {
        return false;
    }

    // Fonction récursive pour parcourir tous les niveaux
    const checkForIcons = (items) => {
        for (const item of items) {
            // Si l'item a une icône, on a trouvé au moins une icône
            if (item.icon) {
                return true;
            }

            // Vérifier récursivement les enfants
            if (item.children && Array.isArray(item.children)) {
                if (checkForIcons(item.children)) {
                    return true;
                }
            }
        }
        return false;
    };

    return checkForIcons(navigationData);
};

/**
 * Main sidebar navigation component.
 * Provides collapsible sidebar with navigation menu and optional switcher.
 *
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onItemClick - Optional callback when a navigation item is clicked
 * @param {boolean} useSwitcher - Whether to display a switcher for first-level navigation
 * @param {boolean} defaultOpen - Whether the sidebar is open by default
 * @param {string} className - Optional additional CSS class for the sidebar
 * @returns {JSX.Element} The rendered navigation sidebar
 */
const NavigationSideBar = ({
    navigationData = [],
    onItemClick,
    useSwitcher = false,
    defaultOpen = false,
    className = ''
}) => {
    // État pour gérer l'ouverture/fermeture de la sidebar
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // Hook pour les annonces aux lecteurs d'écran
    const announce = useAriaAnnounce();

    // useId garantit un ID stable entre le rendu SSR et l'hydratation client
    const sidebarId = `navigation-sidebar-${useId()}`;

    // Détecter le mode mobile (pour activer le focus trap)
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Fonction pour détecter le mode mobile (correspond au breakpoint-down small)
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 639); // 639px = breakpoint small
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Hook pour piéger le focus dans la sidebar en mode mobile
    const focusTrapRef = useFocusTrap({
        active: isMobile && isOpen,
        returnFocus: true,
        autoFocus: true
    });

    // ===== REDIMENSIONNEMENT PAR GLISSER (rail du bord droit) =====
    // Largeur ouverte personnalisée en px ; null = valeur du token responsive
    // (--sidebar-width-open). Désactivé en mobile (tiroir 100vw).
    const [openWidth, setOpenWidth] = useState(null);
    const asideRef = useRef(null);

    // Ref combinée : alimente le focus trap ET la mesure de largeur pour le rail.
    const setAsideRef = useCallback((node) => {
        asideRef.current = node;
        if (focusTrapRef) {
            focusTrapRef.current = node;
        }
    }, [focusTrapRef]);

    // Bornes alignées sur les tokens --nav-drawer-width-min/max (features/header/_tokens.scss).
    const railHandlers = useResizable({
        direction: 'right',
        min: 200,
        max: 480,
        getCurrentWidth: () => asideRef.current?.getBoundingClientRect().width,
        onResize: setOpenWidth,
    });

    // Synchroniser l'état avec la prop defaultOpen quand elle change
    useEffect(() => {
        setIsOpen(defaultOpen);
    }, [defaultOpen]);

    // Verrouiller le scroll de la page quand la sidebar est ouverte en mode mobile
    // (le tiroir occupe tout l'écran sous le header ; on évite que la page défile derrière).
    useEffect(() => {
        if (isMobile && isOpen) {
            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = previousOverflow;
            };
        }
    }, [isMobile, isOpen]);

    // Plus besoin de gérer les classes CSS du body car la sidebar est maintenant intégrée dans le header

    // État pour gérer l'item sélectionné dans le switcher
    const [selectedSwitcherItem, setSelectedSwitcherItem] = useState(
        useSwitcher && navigationData.length > 0 ? navigationData[0] : null
    );

    // Hook de navigation existant
    const navigationHook = useNavigation();

    // Détecter si des icônes sont présentes dans les données de navigation
    const hasIcons = React.useMemo(() => {
        if (useSwitcher && selectedSwitcherItem) {
            // Si on utilise le switcher, vérifier les icônes dans l'item sélectionné
            return hasIconsInNavigationData(selectedSwitcherItem.children || []);
        }
        // Sinon, vérifier dans toutes les données de navigation
        return hasIconsInNavigationData(navigationData);
    }, [navigationData, useSwitcher, selectedSwitcherItem]);

    // Toggle de la sidebar avec annonce aux lecteurs d'écran
    const toggleSidebar = () => {
        setIsOpen(prev => {
            const newState = !prev;
            // Annoncer le changement d'état aux lecteurs d'écran
            announce(
                newState ? 'Navigation latérale ouverte' : 'Navigation latérale fermée',
                'polite'
            );
            return newState;
        });
    };

    // Gestion du changement d'item dans le switcher
    const handleSwitcherChange = (item) => {
        setSelectedSwitcherItem(item);
        // Trouver le premier chemin navigable dans la nouvelle branche
        const firstNavigablePath = findFirstNavigablePath(item);
        if (firstNavigablePath && onItemClick) {
            onItemClick({ ...item, path: firstNavigablePath });
        }
    };

    // Fonction pour trouver le premier chemin navigable dans un arbre de navigation
    const findFirstNavigablePath = (item) => {
        if (item.path && item.path !== '#' && item.path !== '/') {
            return item.path;
        }

        if (item.children && item.children.length > 0) {
            for (const child of item.children) {
                const childPath = findFirstNavigablePath(child);
                if (childPath) {
                    return childPath;
                }
            }
        }

        return null;
    };

    // Déterminer quelles données de navigation afficher
    const displayNavigationData = useSwitcher && selectedSwitcherItem
        ? selectedSwitcherItem.children || []
        : navigationData;

    // Classes CSS pour la sidebar
    const sidebarClasses = [
        'navigation-sidebar',
        isOpen ? 'navigation-sidebar--open' : 'navigation-sidebar--collapsed',
        hasIcons ? 'navigation-sidebar--has-icons' : 'navigation-sidebar--no-icons',
        className
    ].filter(Boolean).join(' ');

    // Valeur du contexte de la sidebar
    const sidebarContextValue = {
        isOpen,
        hasIcons,
        toggleSidebar,
        sidebarId, // Ajout de l'ID pour aria-controls
        ...navigationHook
    };

    return (
        <SidebarContext.Provider value={sidebarContextValue}>
            <aside
                ref={setAsideRef}
                id={sidebarId}
                className={sidebarClasses}
                data-sidebar-open={isOpen}
                aria-label="Navigation latérale"
                // Largeur personnalisée appliquée en custom property (desktop/tablette uniquement).
                style={openWidth != null && !isMobile
                    ? { '--sidebar-width-open': `${openWidth}px` }
                    : undefined}
            >
                {/* Header de la sidebar avec logo ou switcher */}
                <header className="sidebar-header">
                    {useSwitcher && navigationData.length > 0 ? (
                        // Mode switcher : afficher le switcher avec logo intégré
                        <SidebarSwitcher
                            items={navigationData}
                            selectedItem={selectedSwitcherItem}
                            onSelectionChange={handleSwitcherChange}
                        />
                    ) : (
                        // Mode normal : logo affiché uniquement sidebar ouverte. Masquage par
                        // garde JS (et non CSS) : en mode rail le conteneur déborderait de
                        // l'aside étroit (aucun overflow:hidden au desktop), et un display:none
                        // n'apporterait aucune transition (masquage non animable).
                        isOpen && (
                            <div className="sidebar-logo-container">
                                <Image
                                    src='/logo.svg'
                                    alt="Logo du site"
                                    width={40}
                                    height={40}
                                    className="sidebar-logo"
                                />
                                <span className="sidebar-logo-text">
                                    Mon Site
                                </span>
                            </div>
                        )
                    )}
                </header>

                {/* Contenu principal de la sidebar */}
                <SidebarMenu
                    navigationData={displayNavigationData}
                    onItemClick={onItemClick}
                    level={0} // Le premier niveau d'items reste de niveau 0, même en mode switcher
                />

                {/* Rail de redimensionnement (bord droit) — désactivé en mobile (100vw) */}
                {!isMobile && (
                    <div
                        className="nav-rail nav-rail--right"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Redimensionner la barre latérale"
                        aria-valuemin={200}
                        aria-valuemax={480}
                        tabIndex={0}
                        onPointerDown={railHandlers.onPointerDown}
                        onKeyDown={railHandlers.onKeyDown}
                    />
                )}
            </aside>
        </SidebarContext.Provider>
    );
};

export default NavigationSideBar;