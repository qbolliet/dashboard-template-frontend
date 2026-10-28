/**
 * Builds the innerHTML of a point marker: an optional pulse halo behind the dot,
 * and the dot itself with an optional icon.
 *
 * Neither the diameter, the colour nor the variant is handled here: the engine
 * sets the `--d` and `--c` custom properties and the `globe-marker--badge` /
 * `globe-marker--dot` class on the marker element itself, and both children
 * inherit them. Going through the CSSOM rather than interpolating a `style="…"`
 * attribute makes attribute escaping structurally impossible to get wrong.
 *
 * @param {{icon: ?string, pulse: boolean}} spec - Resolved marker spec: `icon` is
 *   an inline SVG string (or null), TRUSTED HTML injected as-is, never escaped (the
 *   host owns whatever its `iconFor` accessor returns); `pulse` adds the animated
 *   halo.
 * @returns {string} HTML string consumed by the engine overlay.
 */
export const markerHtml = ({ icon, pulse }) =>
  // Deux calques : le halo pulsé derrière (s'il est demandé), la pastille pleine
  // devant ; tous deux teintés par la custom property --c héritée du marqueur
  // parent, pour rester pilotables en CSS.
  (pulse ? `<span class="globe-marker-pulse"></span>` : '') +
  `<span class="globe-marker-dot">${icon || ''}</span>`;
