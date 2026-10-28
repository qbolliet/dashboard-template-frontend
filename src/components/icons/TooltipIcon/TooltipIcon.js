'use client';

import React from 'react';

/**
 * Tooltip (speech bubble) icon component.
 * Used by the shared "tooltips" toolbar tool (chart and globe).
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered tooltip icon SVG.
 */
const TooltipIcon = ({
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
            className={`tooltip-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M21 12a7 7 0 0 1-7 7l-1 3-1-3a7 7 0 0 1-6-7 7 7 0 1 1 15 0z" />
            <circle cx="9.5" cy="12" r=".8" fill="currentColor" />
            <circle cx="14.5" cy="12" r=".8" fill="currentColor" />
        </svg>
    );
};

export default TooltipIcon;
