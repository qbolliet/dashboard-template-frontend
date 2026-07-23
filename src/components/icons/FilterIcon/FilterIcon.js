'use client';

import React from 'react';

/**
 * Filter (funnel) icon component.
 * Triggers the column value-filter popover in the table header.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered filter icon SVG.
 */
const FilterIcon = ({
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
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`filter-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M3 5h18l-7 9v6l-4-2v-4z" />
        </svg>
    );
};

export default FilterIcon;
