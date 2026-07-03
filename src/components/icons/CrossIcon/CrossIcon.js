'use client';

import React from 'react';

/**
 * Cross (✕) icon component.
 * Distinct X-shaped stroke used to remove a tag in the select menu. NOT to be
 * confused with CloseIcon (rotated rects) or ClearIcon (short strokes) which
 * use different geometries.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered cross icon SVG.
 */
const CrossIcon = ({
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
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`cross-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
};

export default CrossIcon;
