'use client';

import React from 'react';

// Tracés par direction (viewBox 24, chevron centré sur le viewBox).
// Le tracé `right` est géométriquement identique à l'ancien chevron inline de
// SidebarGroup (`m9 18 6-6-6-6`) : mêmes trois points, ordre inversé.
const PATHS = {
  up: 'm18 15-6-6-6 6',
  down: 'm6 9 6 6 6-6',
  left: 'm15 6-6 6 6 6',
  right: 'm9 6 6 6-6 6',
};

/**
 * Chevron icon component with a selectable direction.
 * Single primitive covering the up/down (select menus) and left/right
 * (calendar navigation, sidebar groups) needs. Orientation is driven by a
 * distinct path per direction — no internal CSS transform — so external CSS
 * rotations (e.g. SidebarGroup's rotate(90deg)) compose cleanly.
 *
 * @param {('up'|'down'|'left'|'right')} direction - Chevron orientation (default: 'down').
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered chevron icon SVG.
 */
const ChevronIcon = ({
    direction = 'down',
    className = '',
    width = 16,
    height = 16,
    ...props
}) => {
    // Repli sur 'down' si une direction inconnue est fournie
    const d = PATHS[direction] || PATHS.down;

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
            className={`chevron-icon chevron-icon--${direction} ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d={d} />
        </svg>
    );
};

export default ChevronIcon;
