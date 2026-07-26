'use client';

import React from 'react';

/**
 * Chart (bar chart) icon component.
 * Represents a data/chart view, used by the tabs example page and reusable
 * anywhere a generic chart glyph is needed.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered chart icon SVG.
 */
const ChartIcon = ({
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
            className={`chart-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M3 3v18h18" />
            <rect x="7" y="11" width="3" height="6" rx="0.5" />
            <rect x="12.5" y="7" width="3" height="10" rx="0.5" />
            <rect x="18" y="4" width="3" height="13" rx="0.5" />
        </svg>
    );
};

export default ChartIcon;
