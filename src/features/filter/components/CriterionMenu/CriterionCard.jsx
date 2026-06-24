import './CriterionMenu.scss';

// ── Icône croix — bouton de suppression du critère ──
// strokeWidth élevé (2.4) pour rester lisible à petite taille.
const CrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * Outer shell of a criterion card: accent border, optional removal button and
 * optional grouping parentheses framing the three rows.
 *
 * Purely presentational — no internal state. The parentheses are fully controlled
 * by the parent through `parenLeft` / `parenRight` / `onToggleParen`.
 *
 * @param {string} accent - CSS color of the border (e.g. 'hsl(var(--color-success-500))').
 * @param {boolean} [parentheses] - When true, wraps the card between two paren buttons.
 * @param {boolean} [parenLeft] - Active state of the opening parenthesis.
 * @param {boolean} [parenRight] - Active state of the closing parenthesis.
 * @param {function(('left'|'right')): void} [onToggleParen] - Toggles a parenthesis side.
 * @param {function(): void} [onRemove] - Removes the criterion (renders the × button).
 * @param {boolean} [removable] - Enables the removal button.
 * @param {React.ReactNode} children - The criterion rows.
 * @returns {JSX.Element}
 */
const CriterionCard = ({
  accent,
  parentheses = false,
  parenLeft,
  parenRight,
  onToggleParen,
  onRemove,
  removable = false,
  children,
}) => {
  // Coque de base : bordure colorée par l'accent + halo léger (alpha 1a ≈ 10%)
  const card = (
    <section
      className="criterion-card"
      style={{ borderColor: accent, boxShadow: `0 0 0 1px ${accent}1a` }}>
      {removable && onRemove && (
        <button type="button" className="criterion-remove"
          title="Supprimer le critère" aria-label="Supprimer le critère"
          onClick={onRemove}>
          <CrossIcon />
        </button>
      )}
      <div className="criterion-card__body">{children}</div>
    </section>
  );

  // Mode simple : pas de parenthèses, on rend la carte telle quelle
  if (!parentheses) return card;

  // Mode groupement : deux boutons-parenthèses encadrent la carte. Leur bordure
  // reprend l'accent (la carte perd ses bords latéraux ici) → contour complet coloré.
  return (
    <div className="criterion-paren-wrap">
      <button
        type="button"
        className={`criterion-paren criterion-paren--left ${parenLeft ? 'criterion-paren--active' : ''}`}
        style={{ borderColor: accent }}
        aria-pressed={parenLeft}
        title="Parenthèse ouvrante"
        onClick={() => onToggleParen?.('left')}>
        <svg viewBox="0 0 24 100" preserveAspectRatio="none" fill="currentColor">
          <path d="M17 4 C6 30 6 70 17 96 C11 70 11 30 17 4 Z" />
        </svg>
      </button>
      {card}
      <button
        type="button"
        className={`criterion-paren criterion-paren--right ${parenRight ? 'criterion-paren--active' : ''}`}
        style={{ borderColor: accent }}
        aria-pressed={parenRight}
        title="Parenthèse fermante"
        onClick={() => onToggleParen?.('right')}>
        <svg viewBox="0 0 24 100" preserveAspectRatio="none" fill="currentColor">
          <path d="M7 4 C18 30 18 70 7 96 C13 70 13 30 7 4 Z" />
        </svg>
      </button>
    </div>
  );
};

export default CriterionCard;
