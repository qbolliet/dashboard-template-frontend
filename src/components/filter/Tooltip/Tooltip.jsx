'use client';

// Importation des modules
import { cloneElement, isValidElement, useId, useState } from 'react';
import './Tooltip.scss';

/**
 * Tooltip component displaying a floating label on hover and keyboard focus.
 *
 * Accessibility: follows the WAI-ARIA tooltip pattern — the bubble carries
 * `role="tooltip"` and the trigger is linked to it via `aria-describedby`. The
 * bubble is shown on pointer hover *and* keyboard focus, and dismissed on blur,
 * mouse leave or Escape. The trigger element is expected to be focusable (button,
 * link, input…) for the keyboard path to apply.
 *
 * @param {React.ReactNode} children - The trigger element (should be focusable).
 * @param {string|React.ReactNode} content - Content shown inside the bubble.
 * @param {'top'|'bottom'|'left'|'right'} [position='top'] - Bubble placement.
 * @param {boolean} [disabled=false] - When true, renders children with no tooltip.
 * @param {boolean} [block=false] - When true, the wrapper is block-level (full width),
 *   useful when wrapping full-width elements like criterion rows.
 * @param {string} [className] - Additional class(es) merged on the wrapper.
 * @param {Object} [style] - Additional inline styles merged on the wrapper.
 */
const Tooltip = ({ children, content, position = 'top', disabled = false, block = false, className = '', style }) => {
  // État de visibilité de la bulle
  const [visible, setVisible] = useState(false);
  // Identifiant stable liant le déclencheur (aria-describedby) à la bulle
  const tooltipId = useId();

  // Rendu neutre si désactivé ou sans contenu : pas de wrapper supplémentaire
  if (disabled || !content) return children;

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  // Ne masque pas si le focus se déplace vers un descendant du wrapper (ex. champ
  // → bouton calendrier) : on ne cache qu'en quittant réellement la zone.
  const handleBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) hide();
  };

  // Escape masque la bulle sans déplacer le focus (pattern tooltip WAI-ARIA)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && visible) hide();
  };

  // Lie le déclencheur à la bulle via aria-describedby (si c'est un élément valide)
  const trigger = isValidElement(children)
    ? cloneElement(children, { 'aria-describedby': tooltipId })
    : children;

  return (
    // Wrapper inline — ancre de positionnement absolu + capteur souris/clavier.
    // onFocus/onBlur remontent depuis l'élément focusable enfant (events délégués).
    <span
      className={`tooltip-wrap${block ? ' tooltip-wrap--block' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {trigger}
      {/* Bulle — rendue uniquement si visible, positionnée en absolu selon `position` */}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`tooltip-bubble tooltip-bubble--${position}`}>
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
