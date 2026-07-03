// Importation de la Tooltip
import Tooltip from '@/components/filter/Tooltip/Tooltip';
import './CriterionRow.scss';

/**
 * Single row of a criterion card: an optional label (with step badge) above its
 * field content. When the label is hidden, the content is wrapped in a tooltip
 * so the row stays self-documenting.
 *
 * Purely presentational — no internal state.
 *
 * @param {string} label - Row label (e.g. "Variable").
 * @param {number} [step] - Step number rendered in the badge beside the label.
 * @param {boolean} [showLabel] - When false, hides the label and tooltips the content.
 * @param {string} [tooltipText] - Tooltip content used when the label is hidden.
 * @param {string} [htmlFor] - Field control id; when provided, the label is rendered
 *   as a real <label htmlFor> (accessible name of the control).
 * @param {React.ReactNode} children - The field content.
 * @returns {JSX.Element}
 */
const CriterionRow = ({
  label,
  step,
  showLabel = true,
  tooltipText,
  htmlFor,
  children,
}) => {
  // Vrai <label> quand l'id du contrôle est connu, sinon simple <div> stylé
  const LabelTag = htmlFor ? 'label' : 'div';

  return (
    <div className="criterion-row">
      {showLabel && (
        <LabelTag className="criterion-row__label" htmlFor={htmlFor}>
          <span>{label}</span>
          {step != null && <span className="criterion-step">{step}</span>}
        </LabelTag>
      )}
      {/* Sans label, le champ est enveloppé d'un tooltip (block = pleine largeur) */}
      {showLabel ? children : <Tooltip block content={tooltipText}>{children}</Tooltip>}
    </div>
  );
};

export default CriterionRow;
