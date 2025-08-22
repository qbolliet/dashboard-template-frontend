'use client';

import React from 'react';

/**
 * Close (X) icon perfectly symmetrical with subtle border-radius.
 * Used for closing mobile menu.
 * 
 * @param {string} className - Additional CSS classes
 * @param {Object} props - Other properties to pass to the SVG
 * @returns {JSX.Element} The rendered close icon SVG
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