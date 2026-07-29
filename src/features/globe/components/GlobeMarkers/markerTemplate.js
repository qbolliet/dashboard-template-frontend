/**
 * Builds the innerHTML of a point badge (pulse halo + dot + optional icon).
 *
 * The badge diameter is not handled here: the engine sets the `--d` custom
 * property on the marker element itself (sizeFor accessor).
 *
 * @param {{color: string, icon: ?string}} spec - Resolved accessor outputs:
 *   `color` is any CSS colour, `icon` an inline SVG string (or null).
 * @returns {string} HTML string consumed by the engine overlay.
 */
export const markerHtml = ({ color, icon }) =>
  // Deux calques : le halo pulsé derrière, la pastille pleine devant ; tous
  // deux teintés par la custom property --c pour rester pilotables en CSS.
  `<span class="globe-marker-pulse" style="--c:${color}"></span>` +
  `<span class="globe-marker-dot" style="--c:${color}">${icon || ''}</span>`;
