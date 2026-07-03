'use client';

import React from 'react';

/**
 * Plus icon component.
 * Add-glyph for the "add criterion" button of the MultiCriterionMenu.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered plus icon SVG.
 */
const PlusIcon = ({
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
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`plus-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
};

export default PlusIcon;
