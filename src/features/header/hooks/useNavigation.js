'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Custom hook for managing navigation state and utilities.
 * Provides mobile menu state and useful functions for navigation components.
 * 
 * @returns {Object} Object containing navigation data and functions
 */
export const useNavigation = () => {
    // État pour gérer l'affichage du menu mobile
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Breakpoint partagé, dérivé d'un unique listener resize (voir plus bas).
    // Initialisé à false pour garantir la cohérence SSR/hydratation : le premier
    // rendu client reproduit le rendu serveur, puis l'effet met à jour la valeur.
    // Le seuil lui-même n'est pas codé en dur ici : il est lu depuis la custom
    // property --breakpoint-small (voir plus bas), dont la source de vérité est
    // src/styles/utils/breakpoints.scss.
    // - isMobile : ≤ breakpoint "small" — tiroir sidebar plein écran, focus-trap.
    const [isMobile, setIsMobile] = useState(false);

    // Récupération du chemin actuel avec Next.js
    const pathname = usePathname();

    // Fermer le menu mobile quand on change de page.
    const [previousPathname, setPreviousPathname] = useState(pathname);
    if (pathname !== previousPathname) {
        setPreviousPathname(pathname);
        setIsMobileMenuOpen(false);
    }

    /**
     * Toggle mobile menu state.
     */
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(prev => !prev);
    };

    /**
     * Close mobile menu.
     */
    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    /**
     * Check if a path is currently active.
     * 
     * @param {string} path - The path to check
     * @returns {boolean} True if the path is active
     */
    const isActivePath = (path) => {
        if (path === '/') {
            return pathname === '/';
        }
        return pathname.startsWith(path);
    };

    /**
     * Check if an item has active children.
     * 
     * @param {Object} item - The navigation item to check
     * @returns {boolean} True if the item has active children
     */
    const hasActiveChildren = (item) => {
        if (!item.children) return false;
        
        // Vérification pour les enfants simples (tableau d'objets)
        if (Array.isArray(item.children)) {
            return item.children.some(child => 
                pathname.startsWith(item.path + child.path)
            );
        }
        
        // Vérification pour les enfants complexes (objets avec sous-enfants)
        return Object.values(item.children).some(group => 
            Array.isArray(group) && group.some(child => 
                pathname.startsWith(item.path + child.path)
            )
        );
    };

    // Listener resize UNIQUE partagé par toute la navigation (monté une seule fois via
    // le NavigationProvider). Il recalcule le breakpoint et referme le menu mobile dès
    // qu'on repasse en desktop, comportement historique conservé.
    useEffect(() => {
        // Lecture des seuils depuis les custom properties CSS (définies dans
        // typography.scss à partir de breakpoints.scss) plutôt que des nombres en dur,
        // pour ne jamais désynchroniser JS et SCSS.
        const rootStyle = getComputedStyle(document.documentElement);
        const mobileBreakpoint = parseInt(rootStyle.getPropertyValue('--breakpoint-small'), 10);
        // Seuil au-delà duquel le tiroir topbar/sidebar n'existe plus (cf. TopbarContainer.scss,
        // qui repasse en navigation inline desktop via breakpoint('large')).
        const drawerBreakpoint = parseInt(rootStyle.getPropertyValue('--breakpoint-medium'), 10);

        const handleResize = () => {
            const width = window.innerWidth;
            setIsMobile(width <= mobileBreakpoint);
            // Au-delà du seuil du tiroir, le menu mobile n'a plus lieu d'être : on le referme.
            if (width > drawerBreakpoint) {
                setIsMobileMenuOpen(false);
            }
        };

        // Mesure initiale au montage (les états démarrent à false pour l'hydratation).
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Gestion du défilement du body - empêche le défilement de la page quand le menu mobile est ouvert
    // Compense la disparition de la scrollbar pour éviter le décalage horizontal du bouton toggle
    useEffect(() => {
        if (isMobileMenuOpen) {
            // Calculer la largeur de la scrollbar avant de la masquer
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            
            // Sauvegarder les styles actuels
            const originalOverflow = window.getComputedStyle(document.body).overflow;
            const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;
            
            // Empêcher le défilement et compenser la largeur de la scrollbar
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = `${scrollbarWidth}px`;
            
            // Nettoyer au démontage ou à la fermeture du menu
            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.paddingRight = originalPaddingRight;
            };
        }
    }, [isMobileMenuOpen]);

    return {
        // Données
        currentPath: pathname,
        isMobileMenuOpen,
        isMobile,

        // Fonctions d'action
        toggleMobileMenu,
        closeMobileMenu,

        // Fonctions utilitaires
        isActivePath,
        hasActiveChildren
    };
};