'use client';

import React from 'react';
import './HamburgerIcon.scss';

/**
 * Hamburger icon with subtle border-radius.
 * Used for mobile menu button.
 * 
 * @param {string} className - Additional CSS classes
 * @param {string} size - Predefined size ('small', 'normal', 'large')
 * @param {string} variant - Color variant ('navigation', 'primary', 'secondary')
 * @param {boolean} hoverable - Whether the icon should have hover effects
 * @param {boolean} active - Whether the icon is in active state
 * @param {Object} props - Other properties to pass to the SVG
 * @returns {JSX.Element} The rendered hamburger icon SVG
 */
const HamburgerIcon = ({ 
    className = '', 
    size = 'normal',
    variant,
    hoverable = false,
    active = false,
    ...props 
}) => {
    // Classes CSS dynamiques
    const iconClasses = [
        'hamburger-icon',
        size && `hamburger-icon--${size}`,
        variant && `hamburger-icon--${variant}`,
        hoverable && 'hamburger-icon--hoverable',
        active && 'hamburger-icon--active',
        className
    ].filter(Boolean).join(' ');

    return (
        <svg
            width="20"
            height="16"
            viewBox="0 0 20 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={iconClasses}
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