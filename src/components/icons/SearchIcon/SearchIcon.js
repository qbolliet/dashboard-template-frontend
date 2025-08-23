'use client';

import React from 'react';
import './SearchIcon.scss';

/**
 * Search icon component.
 * Provides a reusable search icon SVG for the application.
 * 
 * @param {string} className - Additional CSS classes
 * @param {number} width - Icon width (default: 16)
 * @param {number} height - Icon height (default: 16) 
 * @param {Object} props - Other props to pass to the SVG
 * @returns {JSX.Element} The rendered search icon SVG
 */
const SearchIcon = ({ 
    className = '', 
    width = 16, 
    height = 16,
    ...props 
}) => {
    return (
        <svg 
            width={width}
            height={height}
            viewBox="0 0 16 16" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`search-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            {/* Cercle de recherche avec trait de contour */}
            <path 
                d="M6.5 12C9.53757 12 12 9.53757 12 6.5C12 3.46243 9.53757 1 6.5 1C3.46243 1 1 3.46243 1 6.5C1 9.53757 3.46243 12 6.5 12Z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            
            {/* Manche de la loupe */}
            <path 
                d="M15 15L10.5 10.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default SearchIcon;