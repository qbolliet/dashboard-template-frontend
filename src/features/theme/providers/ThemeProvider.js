'use client';

import React, { createContext, useState, useContext, useEffect, useEffectEvent, useRef } from 'react';

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

        // Le script anti-FOUC du layout a déjà résolu et posé data-theme sur <html>
        // avant hydratation ; on relit cette valeur pour rester la source unique de vérité
        // et garantir la cohérence entre l'attribut DOM et l'état React.
        const appliedTheme = document.documentElement.dataset.theme;
        if (appliedTheme === 'light' || appliedTheme === 'dark') {
            return appliedTheme;
        }

        // Repli défensif si le script inline n'a pas tourné : même logique d'init.
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }

        // Détecter la préférence système si aucun thème sauvegardé
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    });

    // Minuteurs de la transition en cours (délai avant changement + retrait de la classe).
    // En refs (et non en state) : la classe `theme-transitioning` est purement visuelle
    // (CSS sur <body>) et ne doit pas faire re-render tous les consommateurs du contexte
    // deux fois par toggle — cf. isTransitioning retiré de contextValue plus bas.
    const themeChangeTimeoutRef = useRef(null);
    const endTransitionTimeoutRef = useRef(null);

    /**
     * Applies the transition class on <body>, runs `applyTheme` after a short delay
     * (lets the animation start) then removes the class once the transition ends.
     * Cancels any previous gesture's timers so rapid successive toggles stay correct
     * (otherwise a stale class removal could cut off the transition in progress).
     *
     * @param {Function} applyTheme - Callback that sets the new theme (setTheme).
     */
    const runThemeTransition = (applyTheme) => {
        if (typeof window === 'undefined') return;

        if (themeChangeTimeoutRef.current) clearTimeout(themeChangeTimeoutRef.current);
        if (endTransitionTimeoutRef.current) clearTimeout(endTransitionTimeoutRef.current);

        document.body.classList.add('theme-transitioning');

        // Délai court pour activer l'animation avant le changement de thème.
        themeChangeTimeoutRef.current = setTimeout(() => {
            applyTheme();
        }, 50);

        // Désactiver l'animation après la transition.
        endTransitionTimeoutRef.current = setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 300);
    };

    /**
     * Toggles between light and dark themes.
     */
    const toggleTheme = () => {
        runThemeTransition(() => {
            setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
        });
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
            runThemeTransition(() => setTheme(newTheme));
        }
    };

    // Nettoyage des minuteurs si le provider est démonté en pleine transition.
    useEffect(() => {
        return () => {
            if (themeChangeTimeoutRef.current) clearTimeout(themeChangeTimeoutRef.current);
            if (endTransitionTimeoutRef.current) clearTimeout(endTransitionTimeoutRef.current);
        };
    }, []);

    /**
     * Détecter si le thème système a changé et l'adapter si aucun thème manuel n'est défini
     */
    const syncWithSystemTheme = () => {
        if (typeof window === 'undefined') return;

        const hasManualTheme = localStorage.getItem('theme-manual');
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

        // Appliquer le thème sur <html> (documentElement), au même niveau que les
        // déclarations `:root { … }`. Indispensable : les tokens de feature du type
        // `:root { --x: var(--color-surface) }` sont résolus à l'élément où ils sont
        // déclarés (:root) puis hérités figés ; si l'override [data-theme="dark"]
        // était posé sur <body> (un descendant), ces indirections resteraient gelées
        // en light. Sur <html>, override et déclarations coïncident → réévaluation OK.
        document.documentElement.setAttribute('data-theme', theme);
        
        // Sauvegarder le thème dans localStorage
        localStorage.setItem('theme', theme);
        
        // Marquer que l'utilisateur a fait un choix manuel
        localStorage.setItem('theme-manual', 'true');
        
        // Mettre à jour la meta tag pour la barre d'état sur mobile
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute(
                'content',
                theme === 'dark' ? '#1a1a1a' : '#ffffff'
            );
        }
    }, [theme]);

    // Effect Event : isole la logique non-réactive de l'écoute système.
    // Lit toujours le `theme` courant sans rendre l'effet d'abonnement réactif,
    // ce qui évite de ré-abonner l'écouteur à chaque changement de thème.
    const onSystemThemeChange = useEffectEvent(() => {
        syncWithSystemTheme();
    });

    // Effet pour écouter les changements du thème système : abonnement unique
    // au montage (deps vides) grâce à l'Effect Event ci-dessus.
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleSystemThemeChange = () => {
            onSystemThemeChange();
        };

        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, []);

    // Valeurs du contexte
    const contextValue = {
        // État actuel
        theme,
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