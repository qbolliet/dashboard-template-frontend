'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTheme } from '@/features/theme/hooks/useTheme';
import SunMoonIcon from '@/components/icons/SunMoonIcon/SunMoonIcon';
import './ThemeToggleButton.scss';

// Abonnement vide : l'état d'hydratation ne change qu'une fois (au montage client).
const emptySubscribe = () => () => {};

/**
 * Theme toggle button component for switching between light/dark themes.
 * Displays a sun/moon animation and handles theme transitions.
 * 
 * @returns {JSX.Element} The rendered theme toggle button component
 */
const ThemeToggleButton = () => {
    // Récupération des fonctions et état du thème
    const { theme, toggleTheme } = useTheme();

    // Indicateur visuel de transition local au bouton (n'est plus dans le contexte partagé :
    // seul ce bouton l'affiche, donc pas de re-render de tous les consommateurs de
    // ThemeContext à chaque changement). Le minuteur est en ref pour pouvoir annuler un
    // geste précédent si l'utilisateur re-clique vite (sinon la classe pourrait être retirée
    // en plein milieu de la nouvelle transition).
    const [isTransitioning, setIsTransitioning] = useState(false);
    const transitionTimeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        };
    }, []);

    // Détecte la fin de l'hydratation sans setState-dans-effet : retourne false côté serveur
    // et au premier rendu client (snapshot serveur), puis true une fois hydraté. Évite ainsi
    // toute divergence d'hydration sur les labels dépendant du thème.
    const isMounted = useSyncExternalStore(
        emptySubscribe,
        () => true,   // snapshot client
        () => false,  // snapshot serveur
    );

    // Déterminer les labels d'accessibilité seulement après hydration
    const currentThemeLabel = isMounted ? (theme === 'light' ? 'light' : 'dark') : 'light';
    const nextThemeLabel = isMounted ? (theme === 'light' ? 'dark' : 'light') : 'dark';

    /**
     * Handle button click with visual feedback.
     */
    const handleClick = () => {
        // Ajouter une classe temporaire pour l'animation de clic
        const button = document.querySelector('.theme-toggle');
        button?.classList.add('theme-toggle--clicked');
        
        setTimeout(() => {
            button?.classList.remove('theme-toggle--clicked');
        }, 150);

        // Indicateur de transition local : annule un éventuel minuteur précédent (clics
        // rapprochés) avant de relancer, pour rester cohérent avec la durée réelle de
        // l'animation déclenchée par ThemeProvider (cf. runThemeTransition, 300ms).
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        setIsTransitioning(true);
        transitionTimeoutRef.current = setTimeout(() => {
            setIsTransitioning(false);
        }, 300);

        // Exécuter le changement de thème
        toggleTheme();
    };

    /**
     * Handle keyboard events (Enter and Space).
     * 
     * @param {KeyboardEvent} e - The keyboard event
     */
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <button
            className={`theme-toggle ${isTransitioning ? 'theme-toggle--transitioning' : ''}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            title={isMounted ? `Change to ${nextThemeLabel} theme` : "Toggle theme"}
            aria-label={isMounted ? `Change theme. Current theme : ${currentThemeLabel}. Click to activate the next theme ${nextThemeLabel}.` : "Toggle theme"}
            aria-live="polite"
            aria-pressed={isMounted ? theme === 'dark' : false}
            type="button"
        >
            {/* Icône soleil/lune animée */}
            <SunMoonIcon />

            {/* Indicateur visuel de transition */}
            {isTransitioning && (
                <div className="theme-toggle__transition-indicator" aria-hidden="true">
                    <div className="spinner"></div>
                </div>
            )}

            {/* Texte accessible caché pour les lecteurs d'écran */}
            <span className="sr-only">
                Basculer entre thème clair et sombre
            </span>
        </button>
    );
};

export default ThemeToggleButton;