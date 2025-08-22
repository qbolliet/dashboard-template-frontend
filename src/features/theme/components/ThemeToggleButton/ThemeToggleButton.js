'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import SunMoonIcon from '../../../shared/icons/SunMoonIcon/SunMoonIcon';
import './ThemeToggleButton.scss';

/**
 * Theme toggle button component for switching between light/dark themes.
 * Displays a sun/moon animation and handles theme transitions.
 * 
 * @returns {JSX.Element} The rendered theme toggle button component
 */
const ThemeToggleButton = () => {
    // Récupération des fonctions et état du thème
    const { theme, toggleTheme, isTransitioning } = useTheme();
    
    // État pour éviter les erreurs d'hydration
    const [isMounted, setIsMounted] = useState(false);
    
    // Effet pour marquer le composant comme monté
    useEffect(() => {
        setIsMounted(true);
    }, []);
    
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