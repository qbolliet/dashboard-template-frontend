'use client';

import React from 'react';
import './SunMoonIcon.scss';

/**
 * Animated sun and moon icon component.
 * Displays a sun/moon animation that transitions based on theme.
 * 
 * @param {string} className - Additional CSS classes
 * @param {number} width - Icon width (default: 24)
 * @param {number} height - Icon height (default: 24)
 * @param {Object} props - Other props to pass to the SVG
 * @returns {JSX.Element} The rendered sun/moon icon SVG
 */
const SunMoonIcon = ({ 
    className = '', 
    width = 24, 
    height = 24,
    ...props 
}) => {
    return (
        <svg 
            className={`sun-and-moon ${className}`}
            aria-hidden="true" 
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {/* Masque pour créer l'effet de croissant de lune */}
            <mask id="moon-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white"/>
                <circle cx="24" cy="10" r="6" fill="black"/>
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
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </g>
        </svg>
    );
};

export default SunMoonIcon;