/**
 * Builds the innerHTML of a point badge (pulse halo + dot + optional icon).
 *
 * Neither the badge diameter nor its colour is handled here: the engine sets the
 * `--d` and `--c` custom properties on the marker element itself (sizeFor /
 * colorFor accessors), and both children inherit them. Going through the CSSOM
 * rather than interpolating a `style="…"` attribute makes attribute escaping
 * structurally impossible to get wrong.
 *
 * @param {{icon: ?string}} spec - Resolved accessor output: `icon` is an inline
 *   SVG string (or null). TRUSTED HTML — injected as-is, never escaped; the host
 *   owns whatever its `iconFor` accessor returns.
 * @returns {string} HTML string consumed by the engine overlay.
 */
export const markerHtml = ({ icon }) =>
  // Deux calques : le halo pulsé derrière, la pastille pleine devant ; tous
  // deux teintés par la custom property --c héritée du marqueur parent, pour
  // rester pilotables en CSS.
  `<span class="globe-marker-pulse"></span>` +
  `<span class="globe-marker-dot">${icon || ''}</span>`;
