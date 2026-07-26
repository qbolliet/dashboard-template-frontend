// =================================================================
// CHART TOOLBAR — barre d'outils (haut-droit, révélée au survol)
// =================================================================
// Assemblage fin au-dessus de <HoverToolbar> (toolbar mutualisée chart/table) :
// traduit les props du graphique en GROUPES d'opérations, la révélation et le
// rendu des boutons étant entièrement pris en charge par la primitive. Outils
// intégrés (voronoï, tooltip, réinit. zoom, export SVG/PNG, agrandir) +
// `extraTools` issus de la prop `toolbar` (features configurables + mini-vues).

// Importation des modules
import HoverToolbar from '@/components/toolbar/HoverToolbar/HoverToolbar';
import ToolIcon from './ToolIcon/ToolIcon';

/**
 * Hover-revealed toolbar. Feature/minimap buttons (`extraTools`) come first, then
 * the built-in tools (proximity hover, tooltip, reset zoom, export, expand).
 *
 * @param {object} props
 * @param {boolean} props.expanded - Expanded (full-width) state.
 * @param {function(): void} props.onExpand - Toggles expanded mode.
 * @param {boolean} props.voronoi - Proximity-hover ON state.
 * @param {function(): void} props.onVoronoi - Toggles proximity hover.
 * @param {boolean} props.tooltips - Tooltip ON state.
 * @param {function(): void} props.onTooltips - Toggles tooltip.
 * @param {function(): void} props.onReset - Resets the zoom.
 * @param {boolean} props.canReset - Whether a zoom is active (reset available).
 * @param {function(): void} props.onExportSvg - Exports the chart to SVG.
 * @param {function(): void} props.onExportPng - Exports the chart to PNG.
 * @param {Array<{id: string, icon: string, label: string, on: boolean, onToggle: function(): void}>} [props.extraTools]
 *   Feature + minimap buttons (icon = ToolIcon key).
 * @returns {JSX.Element}
 */
const ChartToolbar = ({
  expanded, onExpand, voronoi, onVoronoi, tooltips, onTooltips,
  onReset, canReset, onExportSvg, onExportPng, extraTools = [],
}) => {
  // Groupes séparés visuellement par la toolbar : features → interaction →
  // export → mise en page. Un groupe vide (extraTools absents) est ignoré.
  const groups = [
    extraTools.map((t) => ({
      id: t.id, icon: ToolIcon[t.icon], label: t.label, active: t.on, onClick: t.onToggle,
    })),
    [
      { id: 'voronoi', icon: ToolIcon.Voronoi, label: 'Hover proximité (Voronoï)', active: voronoi, onClick: onVoronoi },
      { id: 'tooltips', icon: ToolIcon.Tooltip, label: 'Tooltip sur points', active: tooltips, onClick: onTooltips },
      // Sans zoom actif le bouton reste d'apparence normale mais inerte (pas
      // `disabled` : la réinitialisation n'est pas une capacité indisponible).
      { id: 'reset', icon: ToolIcon.Reset, label: 'Réinitialiser le zoom', onClick: canReset ? onReset : undefined },
    ],
    [
      { id: 'svg', icon: ToolIcon.Svg, label: 'Exporter en SVG', onClick: onExportSvg },
      { id: 'png', icon: ToolIcon.Png, label: 'Exporter en PNG', onClick: onExportPng },
    ],
    [
      {
        id: 'expand',
        icon: expanded ? ToolIcon.Compress : ToolIcon.Expand,
        label: expanded ? 'Replier' : 'Agrandir (pleine largeur)',
        active: expanded,
        onClick: onExpand,
      },
    ],
  ];

  return <HoverToolbar groups={groups} label="Outils du graphique" />;
};

export default ChartToolbar;
