'use client';

import React from 'react';
import './CloseIcon.scss';

/**
 * Close (X) icon perfectly symmetrical with subtle border-radius.
 * Used for closing mobile menu.
 * 
 * @param {string} className - Additional CSS classes
 * @param {string} size - Predefined size ('small', 'normal', 'large')
 * @param {string} variant - Color variant ('navigation', 'danger', 'primary', 'secondary')
 * @param {boolean} hoverable - Whether the icon should have hover effects
 * @param {boolean} active - Whether the icon is in active state
 * @param {Object} props - Other properties to pass to the SVG
 * @returns {JSX.Element} The rendered close icon SVG
 */
const CloseIcon = ({ 
    className = '', 
    size = 'normal',
    variant,
    hoverable = false,
    active = false,
    ...props 
}) => {
    // Classes CSS dynamiques
    const iconClasses = [
        'close-icon',
        size && `close-icon--${size}`,
        variant && `close-icon--${variant}`,
        hoverable && 'close-icon--hoverable',
        active && 'close-icon--active',
        className
    ].filter(Boolean).join(' ');

    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={iconClasses}
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