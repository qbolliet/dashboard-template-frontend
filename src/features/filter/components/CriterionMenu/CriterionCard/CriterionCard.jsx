import { CrossIcon, BracketLeftIcon, BracketRightIcon } from '@/components/icons';
import './CriterionCard.scss';

/**
 * Outer shell of a criterion card: accent border driven by a semantic validity state,
 * an optional removal button, optional grouping brackets framing the rows, and an
 * optional validity footer.
 *
 * Purely presentational — no internal state. The brackets are fully controlled by the
 * parent through `bracketLeft` / `bracketRight` / `onToggleBracket`. The `state` prop
 * maps to modifier classes; the actual colors live in CriterionCard.scss (design-system
 * layering: no color values flow through JS).
 *
 * @param {'neutral'|'valid'|'invalid'} [state] - Validity accent of the card
 *   (border + ring + brackets + footer pill). 'neutral' keeps the default border.
 * @param {boolean} [valid] - Validity wording of the footer (Valide / Non valide).
 * @param {boolean} [footer] - Renders the validity footer.
 * @param {boolean} [parentheses] - When true, wraps the card between two bracket buttons.
 * @param {boolean} [bracketLeft] - Active state of the opening bracket.
 * @param {boolean} [bracketRight] - Active state of the closing bracket.
 * @param {function(('left'|'right')): void} [onToggleBracket] - Toggles a bracket side.
 * @param {function(): void} [onRemove] - Removes the criterion; its presence renders
 *   the × button.
 * @param {string} [className] - Additional class(es) merged on the root element.
 * @param {Object} [style] - Additional inline styles merged on the root element.
 * @param {React.ReactNode} children - The criterion rows.
 * @returns {JSX.Element}
 */
const CriterionCard = ({
  state = 'neutral',
  valid = false,
  footer = false,
  parentheses = false,
  bracketLeft,
  bracketRight,
  onToggleBracket,
  onRemove,
  className = '',
  style,
  children,
}) => {
  // Classe d'état — appliquée à la carte ET au wrap (la carte pose sa propre valeur
  // par défaut de --criterion-accent : la classe doit la surcharger localement).
  const stateClass = state !== 'neutral' ? state : '';

  // Coque de base — l'accent dynamique est porté par les classes d'état ; les règles
  // border-color/box-shadow et le mapping couleur vivent dans CriterionCard.scss.
  const card = (
    <section
      className={[
        'criterion-card',
        stateClass && `criterion-card--${stateClass}`,
        !parentheses && className,
      ].filter(Boolean).join(' ')}
      style={parentheses ? undefined : style}>
      {onRemove && (
        <button type="button" className="criterion-remove"
          title="Supprimer le critère" aria-label="Supprimer le critère"
          onClick={onRemove}>
          <CrossIcon />
        </button>
      )}
      <div className="criterion-card__body">{children}</div>
      {footer && (
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
  // par le wrap → hérité par les crochets via la variable CSS.
  return (
    <div
      className={[
        'criterion-bracket-wrap',
        stateClass && `criterion-bracket-wrap--${stateClass}`,
        className,
      ].filter(Boolean).join(' ')}
      style={style}>
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
