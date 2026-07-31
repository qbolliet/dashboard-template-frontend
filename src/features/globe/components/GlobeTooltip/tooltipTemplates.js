// Importation des modules
import { escapeHtml } from '@/utils/html/escapeHtml';

/**
 * Default point tooltip: label + optional sub + optional value.
 *
 * Used only when the host does not provide a `tooltipFor` accessor.
 *
 * Every field read from the point is HTML-escaped: points come from the host's
 * data source, so they are untrusted by construction.
 *
 * @param {{label: string, sub?: string, value?: (number|string)}} point - Hovered point.
 * @returns {string} HTML string injected in the engine tooltip.
 */
export const pointTooltipHtml = (point) =>
  // Lignes optionnelles : sous-titre et valeur ne sont émis que s'ils existent,
  // pour ne pas laisser d'élément vide occuper de la hauteur. Les gardes portent
  // sur la valeur BRUTE — c'est de l'affichage conditionnel, pas de la sécurité :
  // l'échappement, lui, est systématique.
  `<div class="globe-tt-title">${escapeHtml(point.label)}</div>` +
  (point.sub ? `<div class="globe-tt-sub">${escapeHtml(point.sub)}</div>` : '') +
  (point.value != null ? `<div class="globe-tt-val">${escapeHtml(point.value)}</div>` : '');

/**
 * Arc tooltip: "A → B" header + flow-intensity row (value × 100, rounded).
 *
 * Both endpoint labels are HTML-escaped (see {@link pointTooltipHtml}).
 *
 * @param {{value?: number}} arc - Hovered flow; `value` ∈ [0,1], default 0.5.
 * @param {{label: string}} fromPoint - Origin point of the flow.
 * @param {{label: string}} toPoint - Destination point of the flow.
 * @returns {string} HTML string injected in the engine tooltip.
 */
export const arcTooltipHtml = (arc, fromPoint, toPoint) => {
  // Intensité ramenée sur une échelle 0-100, arrondie : lisible sans unité.
  // Math.round renvoie TOUJOURS un nombre (NaN au pire) : `v` ne peut pas porter
  // de balisage, il est donc le seul à ne pas passer par escapeHtml.
  const v = Math.round((arc.value ?? 0.5) * 100);
  return (
    `<div class="globe-tt-head">` +
      `<span class="globe-tt-node">${escapeHtml(fromPoint.label)}</span>` +
      `<span class="globe-tt-arrow">→</span>` +
      `<span class="globe-tt-node">${escapeHtml(toPoint.label)}</span>` +
    `</div>` +
    `<div class="globe-tt-row"><span class="globe-tt-k">Intensité du flux</span><span class="globe-tt-v">${v}</span></div>`
  );
};
