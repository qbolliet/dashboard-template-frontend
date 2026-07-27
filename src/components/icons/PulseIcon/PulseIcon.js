'use client';

import React from 'react';

/**
 * Pulse (heartbeat line) icon component.
 * Represents live/activity monitoring, used by the tabs example page and
 * reusable anywhere a generic pulse glyph is needed.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered pulse icon SVG.
 */
const PulseIcon = ({
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
            className={`pulse-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M3 12h4l2.5-7 5 14 2.5-7H21" />
        </svg>
    );
};

export default PulseIcon;
