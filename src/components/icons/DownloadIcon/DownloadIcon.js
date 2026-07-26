'use client';

import React from 'react';

/**
 * Download icon component.
 * Used by the table toolbar's CSV / Parquet export buttons.
 *
 * @param {string} className - Additional CSS classes.
 * @param {number} width - Icon width (default: 16, usually overridden by CSS).
 * @param {number} height - Icon height (default: 16, usually overridden by CSS).
 * @param {Object} props - Other props forwarded to the SVG.
 * @returns {JSX.Element} The rendered download icon SVG.
 */
const DownloadIcon = ({
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
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className={`download-icon ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
        </svg>
    );
};

export default DownloadIcon;
