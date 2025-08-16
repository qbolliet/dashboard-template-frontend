'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Custom hook for managing navigation state and utilities.
 * Provides mobile menu state and useful functions for navigation components.
 * 
 * @param {Array} navigationData - Optional navigation data array, if not provided returns hook utilities only
 * @returns {Object} Object containing navigation data and functions
 */
export const useNavigation = (navigationData = null) => {
    // État pour gérer l'affichage du menu mobile
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Récupération du chemin actuel avec Next.js
    const pathname = usePathname();

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

    // Fermer le menu mobile quand on change de page
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Fermer le menu mobile lors du redimensionnement de la fenêtre
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        // Données
        currentPath: pathname,
        isMobileMenuOpen,
        
        // Fonctions d'action
        toggleMobileMenu,
        closeMobileMenu,
        
        // Fonctions utilitaires
        isActivePath,
        hasActiveChildren
    };
};