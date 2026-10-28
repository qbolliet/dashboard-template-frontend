// =================================================================
// TOOLS — factories de ToolSpec transverses
// =================================================================
// Descripteurs d'outils partagés par PLUSIEURS features : une opération dont la
// sémantique est strictement identique d'une barre à l'autre (même action
// one-shot, même libellé, même pictogramme) est décrite ici une seule fois, pour
// qu'un ajustement de son libellé ou de son icône se propage partout.
//
// ⚠️ RÈGLE : ne mutualiser qu'à sémantique STRICTEMENT identique. Les
// recouvrements seulement apparents (zoom molette…) ont des icônes,
// des dépendances de grisage et des mécaniques propres à chaque feature : les
// laisser dans l'assemblage de la feature, la toolbar acceptant des groupes
// libres (cf. HoverToolbar).

// Importation des modules
import { CompressIcon, ExpandIcon, ResetIcon, TooltipIcon } from '@/components/icons';

// Libellé par défaut de l'outil partagé : une seule chaîne, une prop suffit à la
// surcharger — un objet `labels` serait une cérémonie inutile.
const DEFAULT_RESET_LABEL = 'Réinitialiser le zoom';

/**
 * Shared "reset zoom" ToolSpec factory — consumed by the chart and the globe
 * toolbars so the operation keeps one id, one label and one icon everywhere.
 *
 * @param {object} config
 * @param {function(): void} [config.onClick] - Reset action (may be undefined to
 *   keep the button inert without the disabled style — current chart behaviour).
 * @param {boolean} [config.disabled] - Greyed-out state (globe never uses it;
 *   available for consumers that prefer an explicit disabled look).
 * @param {JSX.Element} [config.icon] - Icon override (defaults to <ResetIcon/>).
 * @param {string} [config.label] - Wording override; defaults to the French label.
 * @returns {ToolSpec}
 */
export const resetZoomTool = ({ onClick, disabled, icon, label = DEFAULT_RESET_LABEL }) => ({
  id: 'resetZoom', icon: icon ?? <ResetIcon />, label,
  onClick, disabled,
});

// Libellés par défaut de l'outil « agrandir » : deux faces d'un même bouton.
const DEFAULT_EXPAND_LABEL = 'Agrandir (pleine largeur)';
const DEFAULT_COLLAPSE_LABEL = 'Replier';

/**
 * Shared "expand / collapse" ToolSpec factory — consumed by the chart and the
 * globe toolbars. Expanded, the visualization takes the full width of its frame
 * and its legend moves above it; collapsed, the legend sits on its right.
 *
 * @param {object} config
 * @param {boolean} config.expanded - Current state; drives icon, label and
 *   `aria-pressed`.
 * @param {function(): void} config.onClick - Toggles the state.
 * @param {boolean} [config.disabled] - Greyed-out state (e.g. no legend to move).
 * @param {string} [config.label] - Wording override; defaults to the expand /
 *   collapse label matching `expanded`.
 * @param {string} [config.expandLabel] - Wording of the collapsed state.
 * @param {string} [config.collapseLabel] - Wording of the expanded state.
 * @returns {ToolSpec}
 */
export const expandTool = ({
  expanded, onClick, disabled, label,
  expandLabel = DEFAULT_EXPAND_LABEL, collapseLabel = DEFAULT_COLLAPSE_LABEL,
}) => ({
  id: 'expand',
  icon: expanded ? <CompressIcon /> : <ExpandIcon />,
  label: label ?? (expanded ? collapseLabel : expandLabel),
  active: expanded,
  onClick, disabled,
});

// Libellé par défaut de l'outil « tooltips » : bascule à une seule face (l'état
// est porté par aria-pressed), comme sur le chart d'origine.
const DEFAULT_TOOLTIP_LABEL = 'Tooltips au survol';

/**
 * Shared "tooltips" ToolSpec factory — consumed by the chart and the globe
 * toolbars. The tooltip content model is the same on both (see
 * src/components/tooltip/DataTooltip): one id, one icon, one toggle.
 *
 * @param {object} config
 * @param {boolean} config.active - Tooltips ON; drives `aria-pressed`.
 * @param {function(): void} config.onClick - Toggles the tooltips.
 * @param {boolean} [config.disabled] - Greyed-out state (e.g. nothing to hover).
 * @param {string} [config.label] - Wording override; defaults to the French label.
 * @returns {ToolSpec}
 */
export const tooltipTool = ({ active, onClick, disabled, label = DEFAULT_TOOLTIP_LABEL }) => ({
  id: 'tooltips', icon: <TooltipIcon />, label,
  active, onClick, disabled,
});
