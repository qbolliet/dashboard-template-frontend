'use client';

import React from 'react';
import { useTheme } from '../../hooks/useTheme';
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
    
    // Déterminer les labels d'accessibilité
    const currentThemeLabel = theme === 'light' ? 'light' : 'dark';
    const nextThemeLabel = theme === 'light' ? 'dark' : 'light';

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
            title={`Change to ${nextThemeLabel} theme`}
            aria-label={`Change theme. Current theme : ${currentThemeLabel}. Click to activate the next theme ${nextThemeLabel}.`}
            aria-live="polite"
            aria-pressed={theme === 'dark'}
            type="button"
        >
            {/* SVG avec l'icône soleil/lune animée */}
            <svg 
                className="sun-and-moon" 
                aria-hidden="true" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24"
            >
                {/* Masque pour créer l'effet de croissant de lune */}
                <mask id="moon-mask">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    <circle cx="24" cy="10" r="6" fill="black" />
                </mask>
                
                {/* Cercle principal (soleil/lune) */}
                <circle 
                    className="sun" 
                    cx="12" 
                    cy="12" 
                    r="6" 
                    mask="url(#moon-mask)" 
                    fill="currentColor" 
                />
                
                {/* Rayons du soleil */}
                <g className="sun-beams" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </g>
            </svg>

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