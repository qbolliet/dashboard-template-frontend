'use client';

import React from 'react';

/**
 * Icône hamburger avec border-radius subtils
 * Utilisée pour le bouton de menu mobile
 * 
 * @param {string} className - Classes CSS supplémentaires
 * @param {Object} props - Autres propriétés à passer au SVG
 * @returns {JSX.Element} L'icône hamburger SVG
 */
const HamburgerIcon = ({ className = '', ...props }) => {
    return (
        <svg
            width="20"
            height="16"
            viewBox="0 0 20 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`hamburger-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            {/* Ligne supérieure avec border-radius subtil */}
            <rect
                x="0"
                y="0"
                width="20"
                height="2"
                rx="1"
                fill="currentColor"
            />
            
            {/* Ligne du milieu avec border-radius subtil */}
            <rect
                x="0"
                y="7"
                width="20"
                height="2"
                rx="1"
                fill="currentColor"
            />
            
            {/* Ligne inférieure avec border-radius subtil */}
            <rect
                x="0"
                y="14"
                width="20"
                height="2"
                rx="1"
                fill="currentColor"
            />
        </svg>
    );
};

export default HamburgerIcon;