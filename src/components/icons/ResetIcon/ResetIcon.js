'use client';

import React from 'react';

/**
 * Reset (counter-clockwise arrow) icon component.
 * Used by the table toolbar's "reset filters/sort/columns" button.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered reset icon SVG.
 */
const ResetIcon = ({
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
            className={`reset-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M3 12a9 9 0 1 0 2.6-6.3" />
            <path d="M3 3v4.5h4.5" />
        </svg>
    );
};

export default ResetIcon;
