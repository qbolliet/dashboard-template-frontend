'use client';

import { createContext, useContext } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import useAriaAnnounce from '@/hooks/accessibility/useAriaAnnounce';

// Deux contextes distincts pour découpler l'état « route » de l'état « UI » :
// - NavigationRouteContext : dérivé du pathname (change rarement).
// - NavigationUIContext    : état du menu mobile + breakpoints (change au toggle/resize).
// Un consommateur ne re-render que si SA valeur de contexte change ; les items de
// navigation, abonnés au seul contexte de route, ignorent donc les toggles du menu mobile.
const NavigationRouteContext = createContext(null);
const NavigationUIContext = createContext(null);
// Troisième contexte, ajouté par P5.4 : les LIBELLÉS du header.
//
// Pourquoi un contexte plutôt que des props : la sidebar et la topbar comptent une
// quinzaine de composants imbriqués sur quatre niveaux (SidebarMenu > SidebarGroup >
// SidebarNode > SidebarItem). Faire descendre un objet `labels` de main en main
// traverserait des composants qui n'en affichent aucun, et chaque ajout de libellé
// toucherait toute la chaîne.
//
// Pourquoi cela ne casse PAS l'isolation du registry : ce provider fait partie de
// l'unité `header`, il est installé avec elle. Un composant qui l'utilise n'acquiert
// aucune dépendance nouvelle — contrairement à ce qu'un provider d'i18n global
// imposerait. La règle du template reste entière : chaque unité distribuable porte ses
// propres défauts et n'exige aucun provider EXTÉRIEUR.
//
// Contexte séparé des deux autres, et non fusionné : les libellés ne changent jamais
// après le montage, alors que l'état UI change à chaque toggle. Les mélanger ferait
// re-rendre tous les consommateurs de libellés à chaque ouverture du menu mobile.
const NavigationLabelsContext = createContext(null);

/**
 * Provider hosting the single instance of navigation state for the whole header.
 *
 * Mounted once (in Header), it owns the unique `resize` listener and the unique
 * `isMobileMenuOpen` state, then splits them into two contexts so route-dependent
 * consumers stay decoupled from mobile-menu UI updates.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.labels - Merged header labels, already defaulted by `<Header>`.
 *   Namespaced per unit (`header`, `sidebar`, `topbar`, `navTrigger`, `searchBar`,
 *   `sidebarSwitcher`), mirroring the dictionary.
 * @param {React.ReactNode} props.children - The subtree that consumes navigation contexts.
 * @returns {JSX.Element} The provider wrapping its children with all three contexts.
 */
const NavigationProvider = ({ labels, children }) => {
    // Instance UNIQUE du hook : un seul listener resize, un seul isMobileMenuOpen.
    const {
        currentPath,
        isActivePath,
        isCurrentPath,
        hasActiveChildren,
        isMobileMenuOpen,
        isMobile,
        isSidebarOpen,
        toggleMobileMenu,
        closeMobileMenu,
        setSidebarOpen
    } = useNavigation();

    const announce = useAriaAnnounce();

    // Bascule de la sidebar. Composée ICI et non dans le hook parce qu'elle a besoin des
    // libellés, et exposée par le contexte pour que le déclencheur du header et la sidebar
    // elle-même empruntent le MÊME chemin : c'est ce qui garantit que l'annonce part quel
    // que soit le bouton actionné.
    //
    // L'annonce est émise hors de l'updater de setState : un updater doit rester pur, et
    // React l'invoque deux fois en mode strict — l'annonce y serait doublée. Dans un
    // gestionnaire de clic, `isSidebarOpen` est à jour, la forme fonctionnelle n'apporte rien.
    const toggleSidebar = () => {
        const nextState = !isSidebarOpen;
        setSidebarOpen(nextState);
        announce(nextState ? labels?.sidebar?.opened : labels?.sidebar?.closed, 'polite');
    };

    // Valeur « route » : ne dépend que du pathname. Le React Compiler mémoïse cet objet
    // et les fonctions qu'il contient sur `currentPath` ; un changement de `isMobileMenuOpen`
    // laisse donc `routeValue` stable → aucun re-render des consommateurs de route.
    const routeValue = {
        pathname: currentPath,
        isActivePath,
        isCurrentPath,
        hasActiveChildren
    };

    // Valeur « UI » : état du menu mobile, ouverture de la sidebar, breakpoint partagé.
    const uiValue = {
        isMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
        isMobile,
        isSidebarOpen,
        toggleSidebar
    };

    return (
        <NavigationLabelsContext.Provider value={labels}>
            <NavigationRouteContext.Provider value={routeValue}>
                <NavigationUIContext.Provider value={uiValue}>
                    {children}
                </NavigationUIContext.Provider>
            </NavigationRouteContext.Provider>
        </NavigationLabelsContext.Provider>
    );
};

/**
 * Access the route-derived navigation context (pathname + active-state helpers).
 *
 * @returns {{pathname: string, isActivePath: Function, isCurrentPath: Function, hasActiveChildren: Function}} Route context.
 * @throws {Error} If used outside of a NavigationProvider.
 */
export const useNavigationRoute = () => {
    const context = useContext(NavigationRouteContext);
    if (context === null) {
        throw new Error('useNavigationRoute doit être utilisé dans un NavigationProvider');
    }
    return context;
};

/**
 * Access the UI navigation context (mobile menu state, sidebar state, breakpoint).
 *
 * `toggleSidebar` is the single entry point for opening or closing the sidebar: it both
 * flips the state and announces the new one to screen readers. Never flip `isSidebarOpen`
 * through another path, or the announcement is lost.
 *
 * @returns {{isMobileMenuOpen: boolean, toggleMobileMenu: Function, closeMobileMenu: Function,
 *   isMobile: boolean, isSidebarOpen: boolean, toggleSidebar: Function}} UI context.
 * @throws {Error} If used outside of a NavigationProvider.
 */
export const useNavigationUI = () => {
    const context = useContext(NavigationUIContext);
    if (context === null) {
        throw new Error('useNavigationUI doit être utilisé dans un NavigationProvider');
    }
    return context;
};

/**
 * Access the header label dictionary.
 *
 * @param {string} namespace - Namespace to read, e.g. 'sidebar' or 'topbar'.
 * @returns {Object<string, *>} The namespace's labels. Never `undefined`: a namespace
 *   the provider does not carry yields an empty object, so a caller reading a missing
 *   key gets `undefined` for that key alone rather than a crash. `<Header>` guarantees
 *   completeness by merging over its own defaults before providing them.
 * @throws {Error} If used outside of a NavigationProvider.
 */
export const useNavigationLabels = (namespace) => {
    const context = useContext(NavigationLabelsContext);
    if (context === null) {
        throw new Error('useNavigationLabels doit être utilisé dans un NavigationProvider');
    }
    return context[namespace] ?? {};
};

export default NavigationProvider;
