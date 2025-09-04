'use client';

import React from 'react';
import './NavigationOverlay.scss';

/**
 * Navigation overlay component.
 * Displays a semi-transparent overlay behind the mobile menu to close it when clicked.
 * 
 * @param {boolean} isVisible - Whether the overlay should be visible
 * @param {Function} onClose - Function called when the overlay is clicked
 * @param {string} className - Optional additional CSS class
 * @returns {JSX.Element|null} The rendered overlay or null if not visible
 */
const NavigationOverlay = ({ 
    isVisible = false, 
    onClose,
    className = ''
}) => {
    // Ne pas rendre l'overlay s'il n'est pas visible
    if (!isVisible) {
        return null;
    }

    // Classes CSS pour l'overlay
    const overlayClasses = [
        'nav-overlay',
        className
    ].filter(Boolean).join(' ');

    return (
        <div 
            className={overlayClasses}
            onClick={onClose}
            aria-hidden="true"
        />
    );
};

export default NavigationOverlay;