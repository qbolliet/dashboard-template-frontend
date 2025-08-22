'use client';

import React from 'react';

/**
 * Chevron down icon component.
 * Provides a reusable chevron pointing downward for dropdown indicators.
 * 
 * @param {string} className - Additional CSS classes
 * @param {number} width - Icon width (default: 16)
 * @param {number} height - Icon height (default: 16)
 * @param {Object} props - Other props to pass to the SVG
 * @returns {JSX.Element} The rendered chevron down icon SVG
 */
const ChevronDownIcon = ({ 
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
            className={`chevron-down-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            {/* Chevron pointant vers le bas */}
            <path 
                d="M4 6L8 10L12 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default ChevronDownIcon;