/**
 * Default point tooltip: label + optional sub + optional value.
 *
 * Used only when the host does not provide a `tooltipFor` accessor.
 *
 * @param {{label: string, sub?: string, value?: (number|string)}} point - Hovered point.
 * @returns {string} HTML string injected in the engine tooltip.
 */
export const pointTooltipHtml = (point) =>
  // Lignes optionnelles : sous-titre et valeur ne sont émis que s'ils existent,
  // pour ne pas laisser d'élément vide occuper de la hauteur.
  `<div class="globe-tt-title">${point.label}</div>` +
  (point.sub ? `<div class="globe-tt-sub">${point.sub}</div>` : '') +
  (point.value != null ? `<div class="globe-tt-val">${point.value}</div>` : '');

/**
 * Arc tooltip: "A → B" header + flow-intensity row (value × 100, rounded).
 *
 * @param {{value?: number}} arc - Hovered flow; `value` ∈ [0,1], default 0.5.
 * @param {{label: string}} fromPoint - Origin point of the flow.
 * @param {{label: string}} toPoint - Destination point of the flow.
 * @returns {string} HTML string injected in the engine tooltip.
 */
export const arcTooltipHtml = (arc, fromPoint, toPoint) => {
  // Intensité ramenée sur une échelle 0-100, arrondie : lisible sans unité.
  const v = Math.round((arc.value ?? 0.5) * 100);
  return (
    `<div class="globe-tt-head">` +
      `<span class="globe-tt-node">${fromPoint.label}</span>` +
      `<span class="globe-tt-arrow">→</span>` +
      `<span class="globe-tt-node">${toPoint.label}</span>` +
    `</div>` +
    `<div class="globe-tt-row"><span class="globe-tt-k">Intensité du flux</span><span class="globe-tt-v">${v}</span></div>`
  );
};
