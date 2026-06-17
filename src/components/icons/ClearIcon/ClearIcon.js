'use client';

import React from 'react';

/**
 * Clear/close icon component.
 * Provides a reusable X-shaped clear icon for the application.
 * 
 * @param {string} className - Additional CSS classes
 * @param {number} width - Icon width (default: 14)
 * @param {number} height - Icon height (default: 14)
 * @param {Object} props - Other props to pass to the SVG
 * @returns {JSX.Element} The rendered clear icon SVG
 */
const ClearIcon = ({ 
    className = '', 
    width = 14, 
    height = 14,
    ...props 
}) => {
    return (
        <svg 
            width={width}
            height={height}
            viewBox="0 0 14 14" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`clear-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            {/* Ligne diagonale de haut-gauche à bas-droite */}
            <path 
                d="M10.5 3.5L3.5 10.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            
            {/* Ligne diagonale de bas-gauche à haut-droite */}
            <path 
                d="M3.5 3.5L10.5 10.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default ClearIcon;