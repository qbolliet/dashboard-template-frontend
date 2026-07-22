'use client';

import { createContext, useContext } from 'react';
import { useNavigation } from '../hooks/useNavigation';

// Deux contextes distincts pour découpler l'état « route » de l'état « UI » :
// - NavigationRouteContext : dérivé du pathname (change rarement).
// - NavigationUIContext    : état du menu mobile + breakpoints (change au toggle/resize).
// Un consommateur ne re-render que si SA valeur de contexte change ; les items de
// navigation, abonnés au seul contexte de route, ignorent donc les toggles du menu mobile.
const NavigationRouteContext = createContext(null);
const NavigationUIContext = createContext(null);

/**
 * Provider hosting the single instance of navigation state for the whole header.
 *
 * Mounted once (in Header), it owns the unique `resize` listener and the unique
 * `isMobileMenuOpen` state, then splits them into two contexts so route-dependent
 * consumers stay decoupled from mobile-menu UI updates.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - The subtree that consumes navigation contexts.
 * @returns {JSX.Element} The provider wrapping its children with both contexts.
 */
const NavigationProvider = ({ children }) => {
    // Instance UNIQUE du hook : un seul listener resize, un seul isMobileMenuOpen.
    const {
        currentPath,
        isActivePath,
        hasActiveChildren,
        isMobileMenuOpen,
        isMobile,
        toggleMobileMenu,
        closeMobileMenu
    } = useNavigation();

    // Valeur « route » : ne dépend que du pathname. Le React Compiler mémoïse cet objet
    // et les fonctions qu'il contient sur `currentPath` ; un changement de `isMobileMenuOpen`
    // laisse donc `routeValue` stable → aucun re-render des consommateurs de route.
    const routeValue = {
        pathname: currentPath,
        isActivePath,
        hasActiveChildren
    };

    // Valeur « UI » : état du menu mobile + breakpoint partagé.
    const uiValue = {
        isMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
        isMobile
    };

    return (
        <NavigationRouteContext.Provider value={routeValue}>
            <NavigationUIContext.Provider value={uiValue}>
                {children}
            </NavigationUIContext.Provider>
        </NavigationRouteContext.Provider>
    );
};

/**
 * Access the route-derived navigation context (pathname + active-state helpers).
 *
 * @returns {{pathname: string, isActivePath: Function, hasActiveChildren: Function}} Route context.
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
 * Access the UI navigation context (mobile menu state + responsive breakpoint).
 *
 * @returns {{isMobileMenuOpen: boolean, toggleMobileMenu: Function, closeMobileMenu: Function,
 *   isMobile: boolean}} UI context.
 * @throws {Error} If used outside of a NavigationProvider.
 */
export const useNavigationUI = () => {
    const context = useContext(NavigationUIContext);
    if (context === null) {
        throw new Error('useNavigationUI doit être utilisé dans un NavigationProvider');
    }
    return context;
};

export default NavigationProvider;
