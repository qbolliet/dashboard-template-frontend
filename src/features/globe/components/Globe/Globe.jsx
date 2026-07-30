'use client';

// =================================================================
// GLOBE — racine de la feature (SEULE frontière cliente)
// =================================================================
// Partage des rôles, strict et sans zone grise :
//   • React possède le CADRE (bordure, fond spatial, hauteur — rendu côté
//     serveur, donc zéro CLS), l'état des interrupteurs et la toolbar ;
//   • le moteur Three.js possède TOUT le contenu du stage (canvas WebGL,
//     overlay des pastilles, tooltip), qu'il positionne à chaque frame en
//     impératif — jamais d'état React par frame.
// La communication est descendante : un geste de toolbar met à jour l'état du
// bouton PUIS appelle le setter du moteur. Rien ne remonte du moteur vers React.

// Importation des modules
import { useRef, useState } from 'react';
import useGlobeEngine, { prefersReducedMotion } from '../../hooks/useGlobeEngine';
import GlobeToolbar, { TOOL_KEYS } from '../GlobeToolbar/GlobeToolbar';
import './Globe.scss';
// Styles du DOM injecté par le moteur : les pastilles et la tooltip ne sont
// rendues par aucun composant React, leurs feuilles doivent donc être tirées
// par la frontière cliente qui monte le moteur — sans quoi elles ne seraient
// jamais incluses dans le bundle CSS de la page.
import '../GlobeMarkers/GlobeMarkers.scss';
import '../GlobeTooltip/GlobeTooltip.scss';

// Table des bascules : clé d'outil → champ d'état miroir + setter du moteur.
// Les deux outils « one-shot » (mode, resetZoom) n'y figurent pas : ils ont
// chacun leur branche dédiée dans handleToolAction.
const TOGGLES = {
  wheelZoom: { field: 'wheelZoom', setter: 'setWheelZoom' },
  points: { field: 'showPoints', setter: 'setShowPoints' },
  rotate: { field: 'autoRotate', setter: 'setAutoRotate' },
  tooltips: { field: 'tooltips', setter: 'setTooltips' },
  arcs: { field: 'showArcs', setter: 'setShowArcs' },
  arcsDynamic: { field: 'arcsDynamic', setter: 'setArcsDynamic' },
};

/**
 * WebGL earth globe (Three.js): realistic day/night textures blended with the
 * theme, mouse drag, slow auto-rotation, wheel zoom, conditional data points
 * with tooltips, great-circle flow arcs (static or animated), and an animated
 * globe ⇄ flat-map morph that preserves center and zoom. A hover toolbar
 * (top-right zone) toggles every behaviour.
 *
 * ### HTML trust boundary
 * The tooltip and the point badges are injected with `innerHTML` by the engine,
 * so the split is explicit and uniform:
 * - **Data** — everything read off the `points` / `arcs` objects (`label`, `sub`,
 *   `value`) is HTML-escaped by the feature's default templates. Untrusted input
 *   (a database row served through the GraphQL API) is safe as-is.
 * - **Accessors** — `iconFor` and `tooltipFor` return TRUSTED HTML, injected
 *   verbatim. They are host code, not data: `iconFor` returns inline SVG and could
 *   not be escaped anyway. An accessor that interpolates data must escape it
 *   itself with `escapeHtml`, re-exported by this feature
 *   (`import { escapeHtml } from '@/features/globe'`).
 *
 * @param {object} props
 * @param {Array<{id: string, label: string, lat: number, lon: number,
 *   value?: number, sub?: string}>} [props.points] - Points to place (fixed at mount).
 *   `label`/`sub`/`value` are escaped by the default tooltip template.
 * @param {Array<{from: string, to: string, value?: number}>} [props.arcs] - Flows;
 *   from/to = point ids, value ∈ [0,1] drives thickness/opacity/speed.
 * @param {?function(Object): string} [props.iconFor] - Returns an inline SVG string
 *   centered in the point badge — conditional on any point value. TRUSTED HTML:
 *   injected as-is (see the trust boundary above).
 * @param {?function(Object): string} [props.colorFor] - Returns the badge CSS color.
 *   Applied through `element.style.setProperty('--c', …)` on the marker element,
 *   never interpolated into markup. Default: the --globe-marker-accent token.
 * @param {?function(Object): number} [props.sizeFor] - Returns the badge diameter in px
 *   (default: --globe-marker-size token, 22px).
 * @param {?function(Object): string} [props.tooltipFor] - Tooltip HTML for a point.
 *   TRUSTED HTML: injected as-is, so escape any data interpolated into it.
 *   Default: tooltipTemplates.point (label + sub + value, all escaped).
 * @param {'globe'|'plane'} [props.defaultMode='globe'] - Initial projection.
 * @param {boolean} [props.defaultAutoRotate=true] - Slow permanent rotation at start
 *   (forced off when the user prefers reduced motion).
 * @param {boolean} [props.defaultWheelZoom=true] - Wheel zoom enabled at start.
 * @param {boolean} [props.defaultShowPoints=true] - Points visible at start.
 * @param {boolean} [props.defaultShowArcs=true] - Arcs visible at start.
 * @param {boolean} [props.defaultTooltips=true] - Hover tooltips enabled at start.
 * @param {boolean} [props.defaultArcsDynamic=true] - Animated (comet) arcs at start.
 * @param {string[]} [props.toolbar=TOOL_KEYS] - Exposed tool keys (order-insensitive:
 *   grouping is fixed). Empty array = no toolbar, no hover zone.
 * @param {number} [props.height=460] - Frame height in px (inline style).
 * @param {string} [props.ariaLabel='Globe terrestre interactif'] - Accessible name
 *   of the WebGL stage.
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
const Globe = ({
  points = [],
  arcs = [],
  iconFor = null,
  colorFor = null,
  sizeFor = null,
  tooltipFor = null,
  defaultMode = 'globe',
  defaultAutoRotate = true,
  defaultWheelZoom = true,
  defaultShowPoints = true,
  defaultShowArcs = true,
  defaultTooltips = true,
  defaultArcsDynamic = true,
  toolbar = TOOL_KEYS,
  height = 460,
  ariaLabel = 'Globe terrestre interactif',
  className,
}) => {
  const stageRef = useRef(null);

  // État unique des interrupteurs, initialisé depuis les props `default*`.
  // Basse fréquence (un clic de toolbar) : un objet suffit, aucun besoin d'un
  // state par bascule.
  const [st, setSt] = useState(() => ({
    mode: defaultMode,
    // Accessibilité : si l'utilisateur préfère les mouvements réduits, la
    // rotation permanente démarre à l'arrêt (le bouton reste disponible pour la
    // relancer). La lecture est faite ICI, dans l'initialiseur paresseux, et non
    // dans un effet : un setState post-montage est proscrit, et l'état React
    // doit être cohérent avec l'option envoyée au moteur dès le premier rendu
    // client. Effet de bord assumé : le HTML serveur rend le défaut (true), donc
    // l'`aria-pressed` du bouton « rotation » peut diverger à l'hydratation —
    // écart bénin et strictement local à ce bouton.
    autoRotate: defaultAutoRotate && !prefersReducedMotion(),
    wheelZoom: defaultWheelZoom,
    showPoints: defaultShowPoints,
    showArcs: defaultShowArcs,
    tooltips: defaultTooltips,
    arcsDynamic: defaultArcsDynamic,
  }));

  // Options du moteur : `st` est lu tel quel car le hook FIGE cette config au
  // premier rendu — ce sont donc bien les graines `default*` (dégradation
  // « reduced motion » comprise) qui partent au moteur, et l'état React comme
  // la scène démarrent du même point.
  const engineRef = useGlobeEngine(stageRef, {
    points, arcs, iconFor, colorFor, sizeFor, tooltipFor, ...st,
  });

  /**
   * Applies a toolbar gesture: mirrors it in the React state (button look and
   * aria-pressed) then forwards it to the engine.
   *
   * The engine may still be null while its chunk loads: every call is optional,
   * and `mode` falls back to a local flip so the button never desynchronizes.
   *
   * @param {string} key - Tool key emitted by <GlobeToolbar> (one of TOOL_KEYS).
   * @returns {void}
   */
  const handleToolAction = (key) => {
    const engine = engineRef.current;

    switch (key) {
      // Action one-shot : recentrage caméra, aucun état miroir à tenir.
      case 'resetZoom':
        engine?.resetZoom();
        break;
      // Le moteur est la source de vérité du morphing : on recopie le mode
      // qu'il renvoie plutôt que de le recalculer.
      case 'mode': {
        const m = engine?.toggleMode() ?? (st.mode === 'globe' ? 'plane' : 'globe');
        setSt({ ...st, mode: m });
        break;
      }
      // Toutes les autres clés sont des bascules booléennes symétriques.
      default: {
        const { field, setter } = TOGGLES[key];
        const value = !st[field];
        setSt({ ...st, [field]: value });
        engine?.[setter](value);
      }
    }
  };

  // Clés inconnues ignorées : la toolbar ne rend que des outils qu'elle sait
  // construire, et un tableau vide supprime barre ET zone de survol.
  const visibleTools = toolbar.filter((key) => TOOL_KEYS.includes(key));

  return (
    <figure className={`globe-frame${className ? ` ${className}` : ''}`} style={{ height }}>
      {/* Unique <div> de la feature, et il est nominal : c'est le point de
          montage du moteur — un sous-arbre possédé par Three.js, que React ne
          réconcilie jamais. `role="img"` donne un équivalent textuel au canvas,
          invisible des technologies d'assistance. */}
      <div className="globe-stage" ref={stageRef} role="img" aria-label={ariaLabel} />
      {visibleTools.length > 0 && (
        <GlobeToolbar tools={visibleTools} state={st} onAction={handleToolAction} />
      )}
    </figure>
  );
};

export default Globe;
