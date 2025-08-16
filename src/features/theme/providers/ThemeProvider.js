'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// Contexte pour le thème
const ThemeContext = createContext();

/**
 * Provider pour la gestion des thèmes de l'application
 * Gère le changement entre thème clair et sombre avec persistance dans le localStorage
 * 
 * @param {Object} children - Les composants enfants
 */
export const ThemeProvider = ({ children }) => {
    // État du thème avec initialisation depuis localStorage ou système
    const [theme, setTheme] = useState(() => {
        // Vérifier si on est côté client (pour éviter les erreurs SSR)
        if (typeof window === 'undefined') return 'light';
        
        // Récupérer le thème sauvegardé
        const savedTheme = localStorage.getItem('dashboard-theme');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            return savedTheme;
        }
        
        // Détecter la préférence système si aucun thème sauvegardé
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    });

    // État pour l'animation de transition du thème
    const [isTransitioning, setIsTransitioning] = useState(false);

    /**
     * Basculer entre les thèmes clair et sombre
     */
    const toggleTheme = () => {
        setIsTransitioning(true);
        
        // Délai court pour activer l'animation
        setTimeout(() => {
            setTheme(prevTheme => {
                const newTheme = prevTheme === 'light' ? 'dark' : 'light';
                return newTheme;
            });
        }, 50);
        
        // Désactiver l'animation après la transition
        setTimeout(() => {
            setIsTransitioning(false);
        }, 300);
    };

    /**
     * Définir un thème spécifique
     * @param {string} newTheme - Le nouveau thème ('light' ou 'dark')
     */
    const setSpecificTheme = (newTheme) => {
        if (newTheme !== 'light' && newTheme !== 'dark') {
            console.warn('Thème non valide. Utilisez "light" ou "dark".');
            return;
        }
        
        if (newTheme !== theme) {
            setIsTransitioning(true);
            
            setTimeout(() => {
                setTheme(newTheme);
            }, 50);
            
            setTimeout(() => {
                setIsTransitioning(false);
            }, 300);
        }
    };

    /**
     * Détecter si le thème système a changé et l'adapter si aucun thème manuel n'est défini
     */
    const syncWithSystemTheme = () => {
        if (typeof window === 'undefined') return;
        
        const hasManualTheme = localStorage.getItem('dashboard-theme-manual');
        if (!hasManualTheme) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const systemTheme = prefersDark ? 'dark' : 'light';
            
            if (systemTheme !== theme) {
                setSpecificTheme(systemTheme);
            }
        }
    };

    // Effet pour appliquer le thème au DOM et le sauvegarder
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Appliquer le thème au body
        document.body.setAttribute('data-theme', theme);
        
        // Sauvegarder le thème dans localStorage
        localStorage.setItem('dashboard-theme', theme);
        
        // Marquer que l'utilisateur a fait un choix manuel
        localStorage.setItem('dashboard-theme-manual', 'true');
        
        // Mettre à jour la meta tag pour la barre d'état sur mobile
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute(
                'content', 
                theme === 'dark' ? '#1a1a1a' : '#ffffff'
            );
        }

        // Émettre un événement personnalisé pour informer les autres composants
        const themeChangeEvent = new CustomEvent('themeChanged', { 
            detail: { theme, isTransitioning } 
        });
        document.dispatchEvent(themeChangeEvent);
        
    }, [theme, isTransitioning]);

    // Effet pour écouter les changements du thème système
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Gestionnaire pour les changements du thème système
        const handleSystemThemeChange = (e) => {
            syncWithSystemTheme();
        };
        
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        
        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, [theme]);

    // Effet pour gérer les classes CSS de transition
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (isTransitioning) {
            document.body.classList.add('theme-transitioning');
        } else {
            document.body.classList.remove('theme-transitioning');
        }
    }, [isTransitioning]);

    // Valeurs du contexte
    const contextValue = {
        // État actuel
        theme,
        isTransitioning,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        
        // Actions
        toggleTheme,
        setTheme: setSpecificTheme,
        syncWithSystemTheme,
        
        // Utilitaires
        getSystemTheme: () => {
            if (typeof window === 'undefined') return 'light';
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * Hook pour utiliser le contexte de thème
 * @returns {Object} Contexte du thème avec toutes les fonctions utiles
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);
    
    if (context === undefined) {
        throw new Error(
            'useTheme doit être utilisé dans un composant enfant de ThemeProvider'
        );
    }
    
    return context;
};

// Export par défaut pour le provider
export default ThemeProvider;