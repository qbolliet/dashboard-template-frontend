'use client';

import React, { createContext, useContext, useEffect, useEffectEvent, useRef, useSyncExternalStore } from 'react';
import {
    applyThemeAttribute,
    THEME_MANUAL_KEY,
    applyThemeColorMeta,
    getServerTheme,
    getSystemTheme,
    persistTheme,
    readTheme,
    subscribeTheme,
} from '@/features/theme/utils/themeStore';

// Contexte pour le thème
const ThemeContext = createContext();

// =================================================================
// SOURCE DE VÉRITÉ : l'attribut data-theme de <html>
// =================================================================
// Le thème N'EST PLUS un `useState`. Le script d'amorçage de src/app/layout.tsx pose
// `data-theme` sur <html> avant le premier paint ; ce fournisseur le lit via
// `useSyncExternalStore` (cf. utils/themeStore.js) avec un snapshot SERVEUR fixe à `light`.
//
// Pourquoi : le HTML statique est rendu en `light`. Un état initialisé depuis l'attribut
// donnait `dark` dès le premier rendu client, donc une divergence d'hydratation que React
// signale SANS la corriger (le DOM restait `light`, l'état était `dark` : premier clic
// perdu sur les aperçus, C4). Avec useSyncExternalStore, l'hydratation rend `light` comme le
// serveur, puis React re-rend aussitôt avec la valeur réelle, sans avertissement.
//
// Conséquence pour la persistance : elle ne peut PLUS vivre dans un effet `[theme]` — au
// commit d'hydratation il tournerait avec la valeur serveur et écraserait localStorage
// ET l'attribut. Elle est écrite sur le chemin du GESTE (runThemeTransition).

/**
 * Provider pour la gestion des thèmes de l'application
 * Gère le changement entre thème clair et sombre avec persistance dans le localStorage
 * 
 * @param {Object} children - Les composants enfants
 */
export const ThemeProvider = ({ children }) => {
    // Thème courant : lu depuis le DOM, jamais copié dans un état local.
    const theme = useSyncExternalStore(subscribeTheme, readTheme, getServerTheme);

    // Minuteurs de la transition en cours (délai avant changement + retrait de la classe).
    // En refs (et non en state) : la classe `theme-transitioning` est purement visuelle
    // (CSS sur <body>) et ne doit pas faire re-render tous les consommateurs du contexte
    // deux fois par toggle — cf. isTransitioning retiré de contextValue plus bas.
    // themeChangeTimeoutsRef est un Set (et non un ref unique) car ces minuteurs sont
    // CUMULATIFS : chaque clic doit produire son propre basculement de thème, cf.
    // runThemeTransition ci-dessous.
    const themeChangeTimeoutsRef = useRef(new Set());
    const endTransitionTimeoutRef = useRef(null);

    // Dernier thème DEMANDÉ et pas encore appliqué (null = aucun basculement en vol).
    // Deux clics rapprochés calculent bien light → dark puis dark → light même si le premier
    // minuteur n'a pas encore posé l'attribut. Au repos, la cible se déduit du DOM
    // (cf. requestedTheme) — et non d'un ref initialisé au rendu, qui vaudrait la valeur
    // serveur `light` à l'hydratation et rendrait le premier clic inopérant.
    const pendingThemeRef = useRef(null);

    /**
     * Returns the theme that is displayed, or about to be once in-flight toggles land.
     *
     * @returns {string} 'light' or 'dark'.
     */
    const requestedTheme = () => pendingThemeRef.current ?? readTheme();

    /**
     * Applies the transition class on <body>, switches to `nextTheme` after a short
     * delay (lets the animation start) then removes the class once the transition
     * ends. Only the end-of-transition timer is cancelled/rescheduled on a new
     * gesture; the theme-change timers are cumulative so rapid successive toggles
     * each still flip the theme (see below).
     *
     * @param {string} nextTheme - Theme to switch to ('light' or 'dark').
     * @param {boolean} persist - Whether the choice is stored (true for a user gesture,
     *   false when following the system preference).
     */
    const runThemeTransition = (nextTheme, persist) => {
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
            // ORDRE CRITIQUE : l'attribut DOM d'abord, le rendu React ensuite. Le store
            // (MutationObserver) ne notifie qu'APRÈS cette écriture, donc le rendu — et la
            // purge des effets enfants, qui relisent les tokens CSS — voit déjà le DOM à
            // jour quand un descendant appelle getComputedStyle depuis son propre effet.
            applyThemeAttribute(nextTheme);
            applyThemeColorMeta(nextTheme);
            if (persist) persistTheme(nextTheme);

            // Plus aucun basculement en vol : le DOM reflète la dernière demande, la
            // cible des gestes suivants se relit donc dessus.
            if (themeChangeTimeoutsRef.current.size === 0) pendingThemeRef.current = null;
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
        // Cible calculée sur le thème DEMANDÉ : un second clic pendant qu'un basculement
        // est en vol doit repartir de lui, pas du thème encore affiché.
        const nextTheme = requestedTheme() === 'light' ? 'dark' : 'light';
        pendingThemeRef.current = nextTheme;
        runThemeTransition(nextTheme, true);
    };

    /**
     * Définir un thème spécifique
     * @param {string} newTheme - Le nouveau thème ('light' ou 'dark')
     * @param {boolean} [persist] - Mémoriser le choix (défaut : oui, c'est un choix explicite).
     */
    const setSpecificTheme = (newTheme, persist = true) => {
        if (newTheme !== 'light' && newTheme !== 'dark') {
            console.warn('Thème non valide. Utilisez "light" ou "dark".');
            return;
        }

        // Comparaison au thème DEMANDÉ et non au thème affiché : sinon un appel pendant
        // qu'un basculement est en vol relancerait une transition vers un thème déjà ciblé.
        if (newTheme !== requestedTheme()) {
            pendingThemeRef.current = newTheme;
            runThemeTransition(newTheme, persist);
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

        let hasManualTheme = null;
        try {
            hasManualTheme = localStorage.getItem(THEME_MANUAL_KEY);
        } catch {
            // Stockage inaccessible : aucun choix manuel mémorisable, on suit le système.
        }

        // Suivre le système n'est PAS un choix de l'utilisateur : on n'enregistre rien.
        if (!hasManualTheme) setSpecificTheme(getSystemTheme(), false);
    };

    // Montage uniquement : si le script d'amorçage n'a pas posé `data-theme` (stockage
    // bloqué, script absent), on matérialise la valeur résolue par readTheme() pour que le CSS
    // et React s'accordent. On lit le DOM / le stockage, on ne recopie aucun état ; et on ne
    // persiste rien ici (cf. l'en-tête : la valeur d'hydratation est celle du serveur).
    useEffect(() => {
        const resolved = readTheme();
        if (!document.documentElement.dataset.theme) applyThemeAttribute(resolved);
        applyThemeColorMeta(resolved);
    }, []);

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
        setTheme: (newTheme) => setSpecificTheme(newTheme),
        syncWithSystemTheme,
        
        // Utilitaires
        getSystemTheme,
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