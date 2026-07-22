// =================================================================
// HOVER TOOLBAR — barre d'outils flottante (haut-droit, révélée au survol)
// =================================================================
// Barre absolue en haut à droite de l'hôte, révélée en CSS PUR au survol / focus
// de l'ancêtre portant la classe `hover-toolbar-host` (aucun état React de
// visibilité). Les opérations arrivent en GROUPES : un séparateur vertical est
// intercalé automatiquement entre deux groupes non vides, ce qui laisse un
// développeur tiers composer des barres arbitraires (graphique : voronoï /
// tooltip / zoom / export ; tableau : reset / exports / copies ; …).

// Importation des modules
import { Fragment } from 'react';
import ToolbarButton from '../ToolbarButton/ToolbarButton';
import './HoverToolbar.scss';

/**
 * @typedef {object} ToolSpec
 * @property {string} id - Stable React key.
 * @property {JSX.Element} icon - Inline SVG pictogram.
 * @property {string} label - Accessible label + tooltip text.
 * @property {string} [caption] - Short text rendered next to the icon (mono,
 *   uppercase). Omitted = square icon-only button.
 * @property {boolean} [active] - ON state of a toggle tool (aria-pressed);
 *   omitted for one-shot actions.
 * @property {boolean} [done] - Transient confirmation: the caption becomes "✓".
 * @property {boolean} [disabled] - Dimmed, not clickable.
 * @property {function(): void} [onClick] - Click handler.
 */

/**
 * Floating toolbar revealed by CSS only, on hover/focus of the ancestor carrying
 * the `hover-toolbar-host` class.
 *
 * @param {object} props
 * @param {Array<ToolSpec[]>} props.groups - Tool groups; a vertical separator is
 *   rendered between each pair of non-empty groups. Free-form list.
 * @param {string} props.label - aria-label of the role="toolbar" container.
 * @param {JSX.Element} [props.children] - Extra buttons composed by hand
 *   (escape hatch; rendered after the groups).
 * @returns {JSX.Element}
 */
const HoverToolbar = ({ groups = [], label, children }) => {
  // Seuls les groupes peuplés comptent : un groupe vide ne doit pas laisser
  // derrière lui un séparateur orphelin (cas des `extraTools` absents).
  const filledGroups = groups.filter((group) => group && group.length > 0);

  return (
    <div className="toolbar" role="toolbar" aria-label={label}>
      {filledGroups.map((group, index) => (
        <Fragment key={group[0].id}>
          {index > 0 && <span className="toolbar-sep" />}
          {group.map(({ id, ...tool }) => <ToolbarButton key={id} {...tool} />)}
        </Fragment>
      ))}
      {children}
    </div>
  );
};

export default HoverToolbar;
