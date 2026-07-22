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
    // themeChangeTimeoutsRef est un Set (et non un ref unique) car ces minuteurs sont
    // CUMULATIFS : chaque clic doit produire son propre basculement de thème, cf.
    // runThemeTransition ci-dessous.
    const themeChangeTimeoutsRef = useRef(new Set());
    const endTransitionTimeoutRef = useRef(null);

    /**
     * Applies the transition class on <body>, runs `applyTheme` after a short delay
     * (lets the animation start) then removes the class once the transition ends.
     * Only the end-of-transition timer is cancelled/rescheduled on a new gesture;
     * the theme-change timers are cumulative so rapid successive toggles each still
     * flip the theme (see param doc).
     *
     * @param {Function} applyTheme - Callback that sets the new theme (setTheme).
     */
    const runThemeTransition = (applyTheme) => {
        if (typeof window === 'undefined') return;

        // Seule la minuterie de FIN de transition (retrait de la classe CSS) est
        // annulée-reprogrammée : elle ne pilote qu'un effet visuel global, donc un
        // nouveau clic peut légitimement repousser sa propre fin d'animation.
        // La minuterie de CHANGEMENT de thème, elle, ne doit JAMAIS être annulée par
        // un clic suivant : sinon deux clics à moins de 50 ms d'intervalle annulent
        // le premier setTheme et ne produisent qu'un SEUL basculement au lieu de deux
        // (un interrupteur double-clic doit ramener au thème initial). On suit donc
        // plusieurs minuteurs de changement en parallèle, dans un Set.
        if (endTransitionTimeoutRef.current) clearTimeout(endTransitionTimeoutRef.current);

        document.body.classList.add('theme-transitioning');

        // Délai court pour activer l'animation avant le changement de thème.
        const changeTimeout = setTimeout(() => {
            themeChangeTimeoutsRef.current.delete(changeTimeout);
            applyTheme();
        }, 50);
        themeChangeTimeoutsRef.current.add(changeTimeout);

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

    // Nettoyage des minuteurs si le provider est démonté en pleine transition :
    // tous les basculements en attente doivent être annulés, pas seulement le dernier.
    // Le Set lui-même (contrairement à son contenu) n'est jamais réassigné après le
    // montage : le copier dans une variable locale ici est donc équivalent à lire
    // `themeChangeTimeoutsRef.current` au démontage, tout en satisfaisant la règle
    // react-hooks/exhaustive-deps.
    useEffect(() => {
        const timeouts = themeChangeTimeoutsRef.current;
        return () => {
            timeouts.forEach((id) => clearTimeout(id));
            timeouts.clear();
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