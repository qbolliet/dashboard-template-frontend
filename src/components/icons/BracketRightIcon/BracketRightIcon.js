'use client';

import React from 'react';

/**
 * Right grouping-bracket icon (closing parenthesis glyph).
 * Used by CriterionCard to frame a card in grouping mode.
 *
 * @param {string} className - Additional CSS classes.
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered right-bracket icon SVG.
 */
const BracketRightIcon = ({ className = '', ...props }) => {
    return (
        <svg
            viewBox="0 0 24 100"
            preserveAspectRatio="none"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={`bracket-right-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M7 4 C18 30 18 70 7 96 C13 70 13 30 7 4 Z" />
        </svg>
    );
};

export default BracketRightIcon;
