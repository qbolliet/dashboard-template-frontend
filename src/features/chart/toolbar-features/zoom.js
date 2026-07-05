// =================================================================
// FEATURE — zoom (zoom à la molette)
// =================================================================
// Descripteur d'interaction intégrée : quand l'outil est ON, la molette zoome
// l'axe principal (2-D pour heatmap/density). Le rendu effectif du zoom vit dans
// useBrushZoom (gaté par `zoomOn`).

/**
 * Wheel-zoom feature factory.
 *
 * @param {object} [config] - { defaultOn, label }.
 * @returns {object} Feature descriptor (isZoom).
 */
export function zoom(config = {}) {
  return {
    id: 'zoom',
    kind: 'zoom',
    label: config.label || 'Zoom à la molette',
    icon: 'zoom',
    roles: ['interaction'],
    supports: () => true,
    defaultOn: !!config.defaultOn,
    isZoom: true,
    config,
  };
}
