'use client';

import React from 'react';
import './DropdownToggleButton.scss';

/**
 * Dropdown toggle button component for opening/closing dropdowns.
 * Simple design matching the original component with CSS background images.
 * 
 * @param {boolean} isDropdownOpen - State of the dropdown (open/closed)
 * @param {Function} onClick - Function called on click
 * @param {number} index - Index for unique identification
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Whether the button is disabled
 * @returns {JSX.Element} The rendered dropdown toggle button component
 */
const DropdownToggleButton = ({ 
    isDropdownOpen, 
    onClick, 
    index,
    className = '',
    disabled = false
}) => {
    return (
        <button
            onClick={onClick}
            aria-haspopup="true"
            aria-controls={`dropdown-${index}`}
            aria-expanded={isDropdownOpen ? 'true' : 'false'}
            className={`dropdown-toggle-button ${className || ''}`}
            tabIndex="0"
            aria-label="Toggle dropdown"
            disabled={disabled}
        >
            <span className="sr-only">Dropdown menu</span>
        </button>
    );
};

export default DropdownToggleButton;