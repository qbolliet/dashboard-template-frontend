import { CrossIcon, BracketLeftIcon, BracketRightIcon } from '@/components/icons';
import './CriterionCard.scss';

/**
 * Outer shell of a criterion card: accent border (driven by the `--criterion-accent`
 * custom property), an optional removal button, optional grouping brackets framing the
 * rows, and an optional validity footer.
 *
 * Purely presentational — no internal state. The brackets are fully controlled by the
 * parent through `bracketLeft` / `bracketRight` / `onToggleBracket`. The dynamic accent
 * is passed as a single CSS variable so the border/shadow rules live in the stylesheet.
 *
 * @param {string} accent - CSS color fed to `--criterion-accent` (border + ring + brackets).
 * @param {boolean} [valid] - Validity shown by the footer (Valide / Non valide).
 * @param {boolean} [footer] - When true (and `validate`), renders the validity footer.
 * @param {boolean} [validate] - Gates the footer rendering.
 * @param {boolean} [parentheses] - When true, wraps the card between two bracket buttons.
 * @param {boolean} [bracketLeft] - Active state of the opening bracket.
 * @param {boolean} [bracketRight] - Active state of the closing bracket.
 * @param {function(('left'|'right')): void} [onToggleBracket] - Toggles a bracket side.
 * @param {function(): void} [onRemove] - Removes the criterion (renders the × button).
 * @param {boolean} [removable] - Enables the removal button.
 * @param {React.ReactNode} children - The criterion rows.
 * @returns {JSX.Element}
 */
const CriterionCard = ({
  accent,
  valid = false,
  footer = false,
  validate = false,
  parentheses = false,
  bracketLeft,
  bracketRight,
  onToggleBracket,
  onRemove,
  removable = false,
  children,
}) => {
  // Coque de base — l'accent dynamique n'est transmis que par variable CSS ;
  // les règles border-color/box-shadow vivent dans CriterionCard.scss.
  const card = (
    <section className="criterion-card" style={{ '--criterion-accent': accent }}>
      {removable && onRemove && (
        <button type="button" className="criterion-remove"
          title="Supprimer le critère" aria-label="Supprimer le critère"
          onClick={onRemove}>
          <CrossIcon />
        </button>
      )}
      <div className="criterion-card__body">{children}</div>
      {footer && validate && (
        <footer className="criterion-card__footer">
          <span className="criterion-card__pill">
            <span className="criterion-card__dot" aria-hidden="true" />
            {valid ? 'Valide' : 'Non valide'}
          </span>
        </footer>
      )}
    </section>
  );

  // Mode simple : pas de crochets, on rend la carte telle quelle.
  if (!parentheses) return card;

  // Mode groupement : deux boutons-crochets encadrent la carte. L'accent est porté
  // par le wrap → hérité par la carte ET les crochets via la variable CSS.
  return (
    <div className="criterion-bracket-wrap" style={{ '--criterion-accent': accent }}>
      <button
        type="button"
        className={`criterion-bracket criterion-bracket--left ${bracketLeft ? 'criterion-bracket--active' : ''}`}
        aria-pressed={bracketLeft}
        title="Crochet ouvrant"
        onClick={() => onToggleBracket?.('left')}>
        <BracketLeftIcon />
      </button>
      {card}
      <button
        type="button"
        className={`criterion-bracket criterion-bracket--right ${bracketRight ? 'criterion-bracket--active' : ''}`}
        aria-pressed={bracketRight}
        title="Crochet fermant"
        onClick={() => onToggleBracket?.('right')}>
        <BracketRightIcon />
      </button>
    </div>
  );
};

export default CriterionCard;
