'use client';

import React, { createContext, useState, useContext, useEffect, useEffectEvent, useRef } from 'react';

// Contexte pour le thème
const ThemeContext = createContext();

/**
 * Writes the `data-theme` attribute on `<html>`.
 *
 * Called twice on purpose, and the order matters. React flushes passive effects
 * CHILD-FIRST, so a descendant that reads a themed CSS token with
 * `getComputedStyle` inside its own effect would still see the PREVIOUS theme if
 * the attribute were only written by the provider's `[theme]` effect (that was
 * the globe's one-theme-behind WebGL palette bug). The gesture path therefore
 * writes the attribute SYNCHRONOUSLY, before the state update that triggers the
 * re-render; the `[theme]` effect rewrites the same value idempotently and stays
 * the source of truth for mount/restore and persistence.
 *
 * @param {string} nextTheme - Theme to apply ('light' or 'dark').
 * @returns {void}
 */
const applyThemeAttribute = (nextTheme) => {
    // Sur <html> (documentElement), au même niveau que les déclarations `:root { … }` —
    // cf. le commentaire détaillé de l'effet [theme] plus bas.
    document.documentElement.setAttribute('data-theme', nextTheme);
};

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

    // Miroir hors rendu du dernier thème DEMANDÉ (et non du dernier thème commité).
    // Remplace l'updater fonctionnel `setTheme(prev => …)` utilisé auparavant : la cible
    // doit être connue AVANT le rendu pour pouvoir poser `data-theme` de façon synchrone
    // (cf. applyThemeAttribute), et un updater doit rester pur — il est double-invoqué en
    // StrictMode, donc on ne peut pas y toucher au DOM. Le ref est mis à jour au moment du
    // GESTE : deux clics rapprochés calculent bien light → dark puis dark → light, même si
    // le premier setTheme n'est pas encore commité.
    const pendingThemeRef = useRef(theme);

    /**
     * Applies the transition class on <body>, switches to `nextTheme` after a short
     * delay (lets the animation start) then removes the class once the transition
     * ends. Only the end-of-transition timer is cancelled/rescheduled on a new
     * gesture; the theme-change timers are cumulative so rapid successive toggles
     * each still flip the theme (see below).
     *
     * @param {string} nextTheme - Theme to switch to ('light' or 'dark').
     */
    const runThemeTransition = (nextTheme) => {
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
            // ORDRE CRITIQUE : l'attribut DOM d'abord, l'état React ensuite. Le rendu (et
            // la purge des effets enfants, qui relisent les tokens CSS) n'a lieu qu'après
            // ce callback : le DOM est donc déjà à jour quand un descendant appelle
            // getComputedStyle depuis son propre effet.
            applyThemeAttribute(nextTheme);
            setTheme(nextTheme);
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
        // Cible calculée sur le ref, pas sur le state : un second clic pendant qu'un
        // basculement est en vol doit repartir du thème DEMANDÉ, pas du thème encore affiché.
        const nextTheme = pendingThemeRef.current === 'light' ? 'dark' : 'light';
        pendingThemeRef.current = nextTheme;
        runThemeTransition(nextTheme);
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

        // Comparaison au thème DEMANDÉ (ref) et non au thème commité (state) : sinon un appel
        // pendant qu'un basculement est en vol relancerait une transition vers un thème déjà ciblé.
        if (newTheme !== pendingThemeRef.current) {
            pendingThemeRef.current = newTheme;
            runThemeTransition(newTheme);
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
        //
        // Sur le chemin d'un GESTE utilisateur, runThemeTransition a déjà posé cette même
        // valeur avant le rendu (obligatoire : les effets enfants lisent les tokens avant
        // que celui du parent ne tourne). Cette réécriture est donc idempotente ; l'effet
        // reste le chemin de restauration au montage et le filet de sécurité pour tout
        // changement d'état qui ne passerait pas par runThemeTransition.
        applyThemeAttribute(theme);
        
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