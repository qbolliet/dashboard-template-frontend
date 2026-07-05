// =================================================================
// TOOLBAR BUTTON — bouton d'outil + infobulle + état actif
// =================================================================
// Bouton carré portant un pictogramme et une infobulle (révélée au survol du
// bouton en CSS pur). `active` reflète l'état ON de l'outil (aria-pressed).

// Importation des modules
import './ToolbarButton.scss';

/**
 * A single toolbar button with an icon and a CSS-only tooltip.
 *
 * @param {object} props
 * @param {JSX.Element} props.icon - Inline SVG pictogram.
 * @param {string} props.label - Accessible label + tooltip text.
 * @param {boolean} [props.active] - Active (ON) state.
 * @param {function(): void} [props.onClick] - Click handler.
 * @returns {JSX.Element}
 */
const ToolbarButton = ({ icon, label, active, onClick }) => (
  <button
    type="button"
    className={`chart-toolbar-btn${active ? ' chart-toolbar-btn--active' : ''}`}
    onClick={onClick}
    aria-label={label}
    aria-pressed={!!active}
  >
    <span className="chart-toolbar-btn-icon">{icon}</span>
    <span className="chart-toolbar-tooltip">{label}</span>
  </button>
);

export default ToolbarButton;
