'use client';

import React from 'react';

/**
 * Icône X (fermeture) parfaitement symétrique avec border-radius subtils
 * Utilisée pour fermer le menu mobile
 * 
 * @param {string} className - Classes CSS supplémentaires
 * @param {Object} props - Autres propriétés à passer au SVG
 * @returns {JSX.Element} L'icône X SVG
 */
const CloseIcon = ({ className = '', ...props }) => {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`close-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            {/* Ligne diagonale de gauche à droite avec border-radius subtil */}
            <rect
                x="8.5"
                y="0.5"
                width="3"
                height="19"
                rx="1.5"
                fill="currentColor"
                transform="rotate(45 10 10)"
            />
            
            {/* Ligne diagonale de droite à gauche avec border-radius subtil */}
            <rect
                x="8.5"
                y="0.5"
                width="3"
                height="19"
                rx="1.5"
                fill="currentColor"
                transform="rotate(-45 10 10)"
            />
        </svg>
    );
};

export default CloseIcon;