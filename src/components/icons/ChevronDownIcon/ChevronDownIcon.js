'use client';

import React from 'react';
import './ChevronDownIcon.scss';

/**
 * Chevron down icon component.
 * Provides a reusable chevron pointing downward for dropdown indicators.
 * 
 * @param {string} className - Additional CSS classes
 * @param {number} width - Icon width (default: 16)
 * @param {number} height - Icon height (default: 16)
 * @param {string} size - Predefined size ('small', 'normal', 'large')
 * @param {string} variant - Color variant ('primary', 'secondary', 'tertiary')
 * @param {boolean} rotated - Whether the icon should be rotated 180deg
 * @param {boolean} hoverable - Whether the icon should have hover effects
 * @param {Object} props - Other props to pass to the SVG
 * @returns {JSX.Element} The rendered chevron down icon SVG
 */
const ChevronDownIcon = ({ 
    className = '', 
    width = 16, 
    height = 16,
    size = 'normal',
    variant,
    rotated = false,
    hoverable = false,
    ...props 
}) => {
    // Classes CSS dynamiques
    const iconClasses = [
        'chevron-down-icon',
        size && `chevron-down-icon--${size}`,
        variant && `chevron-down-icon--${variant}`,
        rotated && 'chevron-down-icon--rotated',
        hoverable && 'chevron-down-icon--hoverable',
        className
    ].filter(Boolean).join(' ');

    return (
        <svg 
            width={width}
            height={height}
            viewBox="0 0 16 16" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={iconClasses}
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