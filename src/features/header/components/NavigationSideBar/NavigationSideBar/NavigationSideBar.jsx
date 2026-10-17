'use client';

import { useState, createContext, useContext, useEffect, useId, useRef } from 'react';
import Image from 'next/image';
import { useNavigationRoute, useNavigationUI, useNavigationLabels } from '@/features/header/providers/NavigationProvider';
import useResizable from '@/features/header/hooks/useResizable';
import SidebarSwitcher from '../SidebarSwitcher/SidebarSwitcher';
import SidebarMenu from '../SidebarMenu/SidebarMenu';
import { useFocusTrap } from '@/hooks/accessibility';
import { hasIconsInNavigationData } from '@/features/header/utils/hasIconsInNavigationData';
import { withBasePath } from '@/utils/url/withBasePath';
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

/**
 * Main sidebar navigation component.
 * Provides collapsible sidebar with navigation menu and optional switcher.
 *
 * The open/closed state is NOT owned here: it lives in `NavigationProvider`, so that the
 * header trigger and the sidebar drive the very same state — and the very same screen
 * reader announcement. There is deliberately no `defaultOpen` prop any more; a `defaultOpen`
 * used to seed a local state that then had to be resynchronised on every change, and that
 * second copy is exactly what let a toggle slip through without announcing itself.
 *
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onItemClick - Optional callback when a navigation item is clicked
 * @param {boolean} useSwitcher - Whether to display a switcher for first-level navigation
 * @param {string} [siteTitle] - Site name shown next to the logo. Comes from the manifest
 *   via `<Header>`; the component used to hardcode it.
 * @param {string} className - Optional additional CSS class for the sidebar
 * @returns {JSX.Element} The rendered navigation sidebar
 */
const NavigationSideBar = ({
    navigationData = [],
    onItemClick,
    useSwitcher = false,
    siteTitle,
    className = ''
}) => {
    // Libellés distribués par <Header> via NavigationProvider.
    const labels = useNavigationLabels('sidebar');

    // useId garantit un ID stable entre le rendu SSR et l'hydratation client
    const sidebarId = `navigation-sidebar-${useId()}`;

    // Fonctions de route (pathname) et breakpoint mobile, fournis par le contexte partagé
    // du NavigationProvider — plus de listener resize propre à la sidebar (isMobile ≤639px).
    // L'ouverture et sa bascule viennent de la même source : `toggleSidebar` porte
    // l'annonce aux lecteurs d'écran, il n'y a plus de chemin qui puisse la contourner.
    const { isActivePath, isCurrentPath, hasActiveChildren } = useNavigationRoute();
    const { isMobile, isSidebarOpen: isOpen, toggleSidebar } = useNavigationUI();

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
    const setAsideRef = (node) => {
        asideRef.current = node;
        if (focusTrapRef) {
            focusTrapRef.current = node;
        }
    };

    // Bornes alignées sur les tokens --nav-drawer-width-min/max (features/header/_tokens.scss).
    const railHandlers = useResizable({
        direction: 'right',
        min: 200,
        max: 480,
        getCurrentWidth: () => asideRef.current?.getBoundingClientRect().width,
        onResize: setOpenWidth,
        // Pendant le drag, la largeur est écrite directement sur l'aside (même variable
        // que celle posée en style inline ci-dessous) : pas de re-render par pixel.
        elementRef: asideRef,
        cssProperty: '--sidebar-width-open',
    });

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

    // Détecter si des icônes sont présentes dans les données de navigation.
    const hasIcons = (() => {
        if (useSwitcher && selectedSwitcherItem) {
            // Si on utilise le switcher, vérifier les icônes dans l'item sélectionné
            return hasIconsInNavigationData(selectedSwitcherItem.children || []);
        }
        // Sinon, vérifier dans toutes les données de navigation
        return hasIconsInNavigationData(navigationData);
    })();

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

    // Valeur du contexte de la sidebar : champs explicites (plus de spread de useNavigation).
    // Les fonctions de route proviennent du contexte partagé et sont ré-exposées ici pour que
    // SidebarItem / SidebarGroup les consomment via useSidebar sans changement.
    const sidebarContextValue = {
        isOpen,
        hasIcons,
        toggleSidebar,
        sidebarId, // Ajout de l'ID pour aria-controls
        isActivePath,
        isCurrentPath,
        hasActiveChildren
    };

    return (
        <SidebarContext.Provider value={sidebarContextValue}>
            <aside
                ref={setAsideRef}
                id={sidebarId}
                className={sidebarClasses}
                data-sidebar-open={isOpen}
                aria-label={labels.panel}
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
                                    src={withBasePath('/logo.svg')}
                                    alt={labels.logoAlt}
                                    width={40}
                                    height={40}
                                    className="sidebar-logo"
                                />
                                {/* Nom du site issu du manifeste. Il était écrit
                                    « Mon Site » en dur ici — la seule chaîne de marque
                                    du dépôt qui doublonnait config/site.config.json. */}
                                <span className="sidebar-logo-text">
                                    {siteTitle}
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
                        aria-label={labels.resize}
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