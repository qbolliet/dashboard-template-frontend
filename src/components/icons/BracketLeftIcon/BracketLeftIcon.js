'use client';

import React from 'react';

/**
 * Left grouping-bracket icon (opening parenthesis glyph).
 * Used by CriterionCard to frame a card in grouping mode.
 *
 * @param {string} className - Additional CSS classes.
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered left-bracket icon SVG.
 */
const BracketLeftIcon = ({ className = '', ...props }) => {
    return (
        <svg
            viewBox="0 0 24 100"
            preserveAspectRatio="none"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={`bracket-left-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M17 4 C6 30 6 70 17 96 C11 70 11 30 17 4 Z" />
        </svg>
    );
};

export default BracketLeftIcon;
