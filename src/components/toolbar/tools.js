// =================================================================
// TOOLS — factories de ToolSpec transverses
// =================================================================
// Descripteurs d'outils partagés par PLUSIEURS features : une opération dont la
// sémantique est strictement identique d'une barre à l'autre (même action
// one-shot, même libellé, même pictogramme) est décrite ici une seule fois, pour
// qu'un ajustement de son libellé ou de son icône se propage partout.
//
// ⚠️ RÈGLE : ne mutualiser qu'à sémantique STRICTEMENT identique. Les
// recouvrements seulement apparents (zoom molette, tooltips…) ont des icônes,
// des dépendances de grisage et des mécaniques propres à chaque feature : les
// laisser dans l'assemblage de la feature, la toolbar acceptant des groupes
// libres (cf. HoverToolbar).

// Importation des modules
import { ResetIcon } from '@/components/icons';

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
 * @returns {ToolSpec}
 */
export const resetZoomTool = ({ onClick, disabled, icon }) => ({
  id: 'resetZoom', icon: icon ?? <ResetIcon />, label: 'Réinitialiser le zoom',
  onClick, disabled,
});
