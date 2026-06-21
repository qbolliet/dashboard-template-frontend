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
const Tooltip = ({ children, content, position = 'top', disabled = false }) => {
  // État de visibilité de la bulle
  const [visible, setVisible] = useState(false);

  // Rendu neutre si désactivé ou sans contenu : pas de wrapper supplémentaire
  if (disabled || !content) return children;

  return (
    // Wrapper inline — sert d'ancre de positionnement absolu pour la bulle
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {/* Bulle — rendue uniquement si visible, positionnée en absolu selon `position` */}
      {visible && (
        <span className={`tooltip-bubble tooltip-bubble--${position}`}>
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
