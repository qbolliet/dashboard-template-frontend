// =================================================================
// TOOLBAR BUTTON — bouton d'outil + infobulle + états
// =================================================================
// Bouton portant un pictogramme et une infobulle (révélée au survol du bouton en
// CSS pur). Deux variantes : carré à icône seule (par défaut, rendu du
// graphique) ou icône + libellé mono capitales (`caption`, rendu du tableau).
// `active` reflète l'état ON d'un outil à bascule (aria-pressed), `done` la
// confirmation transitoire d'une action.

// Importation des modules
import './ToolbarButton.scss';

/**
 * A single toolbar button with an icon and a CSS-only tooltip.
 *
 * `active` distinguishes a toggle button (on/off, exposes `aria-pressed`) from
 * a one-shot action button (reset, export…) when left `undefined` — passing
 * `false` would otherwise announce e.g. "Export" as a toggle stuck off.
 *
 * @param {object} props
 * @param {JSX.Element} props.icon - Inline SVG pictogram.
 * @param {string} props.label - Accessible label + tooltip text.
 * @param {string} [props.caption] - Short text rendered next to the icon; its
 *   presence switches the button to the wider captioned variant.
 * @param {boolean} [props.active] - Active (ON) state; omit for non-toggle actions.
 * @param {boolean} [props.done] - Transient confirmation: the caption becomes "✓".
 * @param {boolean} [props.disabled] - Dimmed and not clickable.
 * @param {function(): void} [props.onClick] - Click handler.
 * @returns {JSX.Element}
 */
const ToolbarButton = ({ icon, label, caption, active, done, disabled, onClick }) => (
  <button
    type="button"
    className={
      `toolbar-btn${caption ? ' toolbar-btn--caption' : ''}`
      + `${active ? ' toolbar-btn--active' : ''}${done ? ' toolbar-btn--done' : ''}`
    }
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={active == null ? undefined : active}
  >
    <span className="toolbar-btn-icon">{icon}</span>
    {caption && <span className="toolbar-btn-caption">{done ? '✓' : caption}</span>}
    <span className="toolbar-tooltip">{label}</span>
  </button>
);

export default ToolbarButton;
