'use client';

import React from 'react';

/**
 * Sort-none (no active sort) icon component.
 * Two chevrons (up/down) with the lower one dimmed — column header default state.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered sort-none icon SVG.
 */
const SortNoneIcon = ({
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
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`sort-none-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M7 9l5-5 5 5" />
            <path d="M7 15l5 5 5-5" strokeOpacity=".35" />
        </svg>
    );
};

export default SortNoneIcon;
