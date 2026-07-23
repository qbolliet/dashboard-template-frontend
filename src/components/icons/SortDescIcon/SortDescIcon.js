'use client';

import React from 'react';

/**
 * Sort-descending icon component.
 * Chevron-down + vertical bar — column header state when sorted descending.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered sort-descending icon SVG.
 */
const SortDescIcon = ({
    className = '',
    width = 16,
    height = 16,
    ...props
}) => {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`sort-desc-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M7 15l5 5 5-5" />
            <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
    );
};

export default SortDescIcon;
