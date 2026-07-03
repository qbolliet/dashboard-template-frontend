// =================================================================
// useSeriesHover — état de survol partagé marks ↔ légende ↔ tooltip
// =================================================================
// Importation des modules
import { useState } from 'react';

/**
 * Shared hover state for a chart, threaded between the legend, the marks and the
 * tooltip.
 *
 * - `hovered` — the legend-hovered series/channel value (fades the other series);
 * - `voronoiRow` — the data row currently under the cursor (drives the active
 *   mark + tooltip);
 * - `ciHover` — the hovered confidence-band level (isolates one CI level without
 *   fading the series). Exposé dès la v1 pour la future légende d'IC ; inutilisé
 *   tant que les features (toolbar-features/) ne sont pas branchées.
 *
 * @returns {{
 *   hovered: *, setHovered: Function,
 *   voronoiRow: ?object, setVoronoiRow: Function,
 *   ciHover: ?object, setCiHover: Function,
 * }} Hover state and setters.
 */
export function useSeriesHover() {
  const [hovered, setHovered] = useState(null);
  const [voronoiRow, setVoronoiRow] = useState(null);
  const [ciHover, setCiHover] = useState(null);
  return { hovered, setHovered, voronoiRow, setVoronoiRow, ciHover, setCiHover };
}
