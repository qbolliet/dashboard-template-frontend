// =================================================================
// CHART TOOLBAR — barre d'outils (haut-droit, révélée au survol)
// =================================================================
// Barre absolue en haut à droite du graphique, révélée en CSS PUR au survol /
// focus du frame (aucun état React de visibilité). Outils intégrés (voronoï,
// tooltip, réinit. zoom, export SVG/PNG, agrandir) + `extraTools` issus de la
// prop `toolbar` (features configurables + mini-vues).

// Importation des modules
import { Fragment } from 'react';
import ToolIcon from './ToolIcon/ToolIcon';
import ToolbarButton from './ToolbarButton/ToolbarButton';
import './ChartToolbar.scss';

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
}) => (
  <div className="chart-toolbar" role="toolbar" aria-label="Outils du graphique">
    {extraTools.length > 0 && (
      <Fragment>
        {extraTools.map((t) => (
          <ToolbarButton key={t.id} icon={ToolIcon[t.icon]} label={t.label} active={t.on} onClick={t.onToggle} />
        ))}
        <span className="chart-toolbar-sep" />
      </Fragment>
    )}
    <ToolbarButton icon={ToolIcon.Voronoi} label="Hover proximité (Voronoï)" active={voronoi} onClick={onVoronoi} />
    <ToolbarButton icon={ToolIcon.Tooltip} label="Tooltip sur points" active={tooltips} onClick={onTooltips} />
    <ToolbarButton icon={ToolIcon.Reset} label="Réinitialiser le zoom" onClick={canReset ? onReset : undefined} />
    <span className="chart-toolbar-sep" />
    <ToolbarButton icon={ToolIcon.Svg} label="Exporter en SVG" onClick={onExportSvg} />
    <ToolbarButton icon={ToolIcon.Png} label="Exporter en PNG" onClick={onExportPng} />
    <span className="chart-toolbar-sep" />
    <ToolbarButton
      icon={expanded ? ToolIcon.Compress : ToolIcon.Expand}
      label={expanded ? 'Replier' : 'Agrandir (pleine largeur)'}
      active={expanded} onClick={onExpand}
    />
  </div>
);

export default ChartToolbar;
