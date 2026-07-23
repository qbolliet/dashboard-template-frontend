// Importation des modules
import './Badge.scss';

/**
 * Status pill: a colored dot plus a label. Color is driven entirely by the
 * semantic `variant` prop and resolved in SCSS — no color strings in JS.
 *
 * @param {object} props
 * @param {'success'|'warning'|'neutral'} [props.variant='neutral'] - Semantic state.
 * @param {JSX.Element|string} props.children - Badge label.
 * @returns {JSX.Element}
 */
const Badge = ({ variant = 'neutral', children }) => (
  <span className={`badge badge--${variant}`}>{children}</span>
);

export default Badge;
