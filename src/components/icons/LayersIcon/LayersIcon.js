'use client';

import React from 'react';

/**
 * Layers (stacked planes) icon component.
 * Marks the "hidden column" chip in the table's active-filters row.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered layers icon SVG.
 */
const LayersIcon = ({
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
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`layers-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="m12 3 9 5-9 5-9-5 9-5Z" />
            <path d="m3 13 9 5 9-5" />
        </svg>
    );
};

export default LayersIcon;
