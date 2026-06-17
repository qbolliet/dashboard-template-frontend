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
        
        // Fonctions d'action
        toggleMobileMenu,
        closeMobileMenu,
        
        // Fonctions utilitaires
        isActivePath,
        hasActiveChildren
    };
};