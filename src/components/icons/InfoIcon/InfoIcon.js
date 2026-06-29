'use client';

import React from 'react';

/**
 * Info (ⓘ) icon component.
 * Circled-information glyph used for the error validation message in
 * TypeAwareInput.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered info icon SVG.
 */
const InfoIcon = ({
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
            strokeWidth="2.5"
            xmlns="http://www.w3.org/2000/svg"
            className={`info-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
        </svg>
    );
};

export default InfoIcon;
