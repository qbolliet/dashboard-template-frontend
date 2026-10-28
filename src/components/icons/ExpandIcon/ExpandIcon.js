'use client';

import React from 'react';

/**
 * Expand (four outward corners) icon component.
 * Used by the shared "expand / collapse" toolbar tool (chart and globe).
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered expand icon SVG.
 */
const ExpandIcon = ({
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
            className={`expand-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
    );
};

export default ExpandIcon;
