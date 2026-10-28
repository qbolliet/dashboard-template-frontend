// =================================================================
// CHART TOOLBAR — barre d'outils (haut-droit, révélée au survol)
// =================================================================
// Assemblage fin au-dessus de <HoverToolbar> (toolbar mutualisée chart/table/globe) :
// traduit les props du graphique en GROUPES d'opérations, la révélation et le
// rendu des boutons étant entièrement pris en charge par la primitive. Outils
// intégrés (voronoï, tooltip, réinit. zoom, export SVG/PNG, agrandir) +
// `extraTools` issus de la prop `toolbar` (features configurables + mini-vues).

// Importation des modules
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import HoverToolbar from '@/components/toolbar/HoverToolbar/HoverToolbar';
import { expandTool, resetZoomTool, tooltipTool } from '@/components/toolbar/tools';
import ToolIcon from './ToolIcon/ToolIcon';

// Défauts français, surchargeables par la prop `labels` (cf. src/utils/i18n/mergeLabels.js).
// Les libellés des outils de `extraTools`, eux, viennent des fabriques de
// toolbar-features/, qui acceptent chacune un `config.label`.
const DEFAULT_LABELS = {
  toolbar: 'Outils du graphique',
  voronoiHover: 'Hover proximité (Voronoï)',
  pointTooltip: 'Tooltip sur points',
  exportSvg: 'Exporter en SVG',
  exportPng: 'Exporter en PNG',
  expand: 'Agrandir (pleine largeur)',
  collapse: 'Replier',
};

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
 * @param {Object} [props.labels] - Wording overrides, merged over the French defaults.
 * @returns {JSX.Element}
 */
const ChartToolbar = ({
  expanded, onExpand, voronoi, onVoronoi, tooltips, onTooltips,
  onReset, canReset, onExportSvg, onExportPng, extraTools = [],
  labels: labelOverrides,
}) => {
  const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);
  // Groupes séparés visuellement par la toolbar : features → interaction →
  // export → mise en page. Un groupe vide (extraTools absents) est ignoré.
  const groups = [
    extraTools.map((t) => ({
      id: t.id, icon: ToolIcon[t.icon], label: t.label, active: t.on, onClick: t.onToggle,
    })),
    [
      { id: 'voronoi', icon: ToolIcon.Voronoi, label: labels.voronoiHover, active: voronoi, onClick: onVoronoi },
      // Factory partagée avec le globe : même bouton, même modèle de tooltip.
      tooltipTool({ active: tooltips, onClick: onTooltips, label: labels.pointTooltip }),
      // Sans zoom actif le bouton reste d'apparence normale mais inerte (pas
      // `disabled` : la réinitialisation n'est pas une capacité indisponible).
      // Factory partagée avec le globe ; `icon` conserve le pictogramme du
      // graphique (le défaut <ResetIcon/> a un tracé légèrement différent).
      resetZoomTool({ onClick: canReset ? onReset : undefined, icon: ToolIcon.Reset }),
    ],
    [
      { id: 'svg', icon: ToolIcon.Svg, label: labels.exportSvg, onClick: onExportSvg },
      { id: 'png', icon: ToolIcon.Png, label: labels.exportPng, onClick: onExportPng },
    ],
    // Factory partagée avec le globe : même bouton, même effet sur la légende.
    [expandTool({ expanded, onClick: onExpand, expandLabel: labels.expand, collapseLabel: labels.collapse })],
  ];

  return <HoverToolbar groups={groups} label={labels.toolbar} />;
};

export default ChartToolbar;
