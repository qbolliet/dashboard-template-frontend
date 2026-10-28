// Importation des modules
import { escapeHtml } from '@/utils/html/escapeHtml';

// Ces gabarits produisent du HTML BRUT injecté par innerHTML : un libellé traduit y
// passe donc par escapeHtml comme n'importe quelle donnée. C'est le seul endroit du
// dépôt où un texte du dictionnaire n'atteint pas le DOM par JSX.
const DEFAULT_LABELS = {
  flowIntensity: 'Intensité du flux',
};

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
 * Arc tooltip: "A → B" header + flow-intensity row (value × 100, rounded), then
 * one row per hue field (`arcHue` keys of the flow, e.g. transport mode).
 *
 * Both endpoint labels, the hue titles and the hue values are HTML-escaped (see
 * {@link pointTooltipHtml}): they all come from the host's data or props.
 *
 * @param {{value?: number}} arc - Hovered flow; `value` ∈ [0,1], default 0.5.
 * @param {{label: string}} fromPoint - Origin point of the flow.
 * @param {{label: string}} toPoint - Destination point of the flow.
 * @param {{flowIntensity: string}} [labels] - Wording; defaults to the French label.
 * @param {Array<{key: string, label: string}>} [fields] - Hue fields to list; a
 *   field the flow does not carry is skipped.
 * @returns {string} HTML string injected in the engine tooltip.
 */
export const arcTooltipHtml = (arc, fromPoint, toPoint, labels = DEFAULT_LABELS, fields = []) => {
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
    `<div class="globe-tt-row"><span class="globe-tt-k">${escapeHtml(labels.flowIntensity)}</span><span class="globe-tt-v">${v}</span></div>` +
    // Une ligne par canal hue actif, même gabarit que l'intensité. `fields` peut
    // arriver null depuis la config du moteur : `?? []` plutôt qu'un défaut de
    // paramètre, qui ne couvre que `undefined`.
    (fields ?? [])
      .filter(({ key }) => arc[key] != null)
      .map(({ key, label }) =>
        `<div class="globe-tt-row"><span class="globe-tt-k">${escapeHtml(label)}</span><span class="globe-tt-v">${escapeHtml(arc[key])}</span></div>`)
      .join('')
  );
};
