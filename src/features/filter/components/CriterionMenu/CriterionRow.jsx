// Importation de la Tooltip
import Tooltip from '@/components/filter/Tooltip/Tooltip';

/**
 * Single row of a criterion card: an optional label (with step badge) above its
 * field content. When the label is hidden, the content is wrapped in a tooltip
 * so the row stays self-documenting.
 *
 * Purely presentational — no internal state.
 *
 * @param {string} label - Row label (e.g. "Variable").
 * @param {number} [step] - Step number rendered in the badge beside the label.
 * @param {boolean} [hidden] - When true, the row renders nothing.
 * @param {boolean} [showLabel] - When false, hides the label and tooltips the content.
 * @param {string} [tooltipText] - Tooltip content used when the label is hidden.
 * @param {React.ReactNode} children - The field content.
 * @returns {?JSX.Element}
 */
const CriterionRow = ({
  label,
  step,
  hidden = false,
  showLabel = true,
  tooltipText,
  children,
}) => {
  // Ligne masquée (ex : opération cachée) → rien à rendre
  if (hidden) return null;

  return (
    <div className="criterion-row">
      {showLabel && (
        <div className="criterion-row__label">
          <span>{label}</span>
          {step != null && <span className="criterion-step">{step}</span>}
        </div>
      )}
      {/* Sans label, le champ est enveloppé d'un tooltip (block = pleine largeur) */}
      {showLabel ? children : <Tooltip block content={tooltipText}>{children}</Tooltip>}
    </div>
  );
};

export default CriterionRow;
