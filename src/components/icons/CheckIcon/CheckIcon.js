'use client';

import React from 'react';

/**
 * Check (✓) icon component.
 * Shared checkmark used by select-menu options/checkboxes and the success
 * validation message. The stroke width is exposed so call sites can preserve
 * their exact rendering (3 by default, 2.5 for the validation message).
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {number} strokeWidth - SVG stroke width (default: 3).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered check icon SVG.
 */
const CheckIcon = ({
    className = '',
    width = 16,
    height = 16,
    strokeWidth = 3,
    ...props
}) => {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`check-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
};

export default CheckIcon;
