'use client';

import { useState } from 'react';
import './Tooltip.scss';

/**
 * Tooltip component displaying a floating label on hover.
 *
 * @param {React.ReactNode} children - The trigger element.
 * @param {string|React.ReactNode} content - Content shown inside the bubble.
 * @param {'top'|'bottom'|'left'|'right'} [position='top'] - Bubble placement.
 * @param {boolean} [disabled=false] - When true, renders children with no tooltip.
 */
export default function Tooltip({ children, content, position = 'top', disabled = false }) {
  const [visible, setVisible] = useState(false);

  if (disabled || !content) return children;

  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className={`tooltip-bubble tooltip-bubble--${position}`}>
          {content}
        </span>
      )}
    </span>
  );
}
