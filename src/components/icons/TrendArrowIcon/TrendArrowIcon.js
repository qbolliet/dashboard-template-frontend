import React from 'react';

// Tracés par direction (viewBox 24) — flèche diagonale montante/descendante ou droite plate.
const PATHS = {
    up: 'M7 17 17 7M17 7H8M17 7v9',
    down: 'M7 7 17 17M17 17H8M17 17V8',
    flat: 'M5 12h14M14 7l5 5-5 5',
};

/**
 * Trend arrow icon (up / down / flat) sized by the parent's CSS.
 *
 * @param {('up'|'down'|'flat')} direction - Arrow direction (default: 'up').
 * @param {string} className - Additional CSS classes.
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered trend arrow icon SVG.
 */
const TrendArrowIcon = ({
    direction = 'up',
    className = '',
    ...props
}) => {
    // Repli sur 'up' si une direction inconnue est fournie
    const d = PATHS[direction] || PATHS.up;

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`trend-arrow-icon trend-arrow-icon--${direction} ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d={d} />
        </svg>
    );
};

export default TrendArrowIcon;
