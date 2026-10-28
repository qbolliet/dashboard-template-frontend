'use client';

// =================================================================
// GLOBE — racine de la feature (SEULE frontière cliente)
// =================================================================
// Partage des rôles, strict et sans zone grise :
//   • React possède le CADRE (bordure, fond spatial, hauteur — rendu côté
//     serveur, donc zéro CLS), l'état des interrupteurs, la toolbar, la légende
//     et le CONTENU de la tooltip ;
//   • le moteur Three.js possède TOUT le contenu du stage (canvas WebGL, overlay
//     des pastilles), qu'il positionne à chaque frame en impératif — jamais
//     d'état React par frame. Il déplace aussi l'hôte de la tooltip (son seul
//     `transform`), sans jamais toucher à son contenu.
// La communication est descendante (un geste de toolbar met à jour l'état du
// bouton PUIS le pousse vers le moteur via `applyOption`), à UNE exception près,
// de basse fréquence : le moteur signale la cible survolée (`onHover`) au
// CHANGEMENT de cible, et React rend la bulle partagée avec <Chart>.

// Importation des modules
import { useEffect, useRef, useState } from 'react';
import useGlobeEngine from '../../hooks/useGlobeEngine';
import { prefersReducedMotion } from '@/utils/accessibility/a11y';
import { useCssLength } from '@/hooks/cssLength/useCssLength';
import GlobeToolbar, { TOOL_KEYS } from '../GlobeToolbar/GlobeToolbar';
import ChannelLegend from '@/components/legend/ChannelLegend/ChannelLegend';
import SizeLegend from '@/components/legend/SizeLegend/SizeLegend';
import DataTooltip from '@/components/tooltip/DataTooltip/DataTooltip';
import { normalizeArcs, normalizePoints } from '../../utils/layers';
import { parseDash, resolveHueEncoding } from '../../utils/hueEncoding';
import { resolveZ } from '../../utils/zScale';
import { zFormatter } from '../../utils/zFormat';
import { arcTooltipModel, pointTooltipModel } from '../../utils/tooltipModel';
import './Globe.scss';
// Styles du DOM injecté par le moteur : les pastilles ne sont rendues par aucun
// composant React, leur feuille doit donc être tirée par la frontière cliente qui
// monte le moteur — sans quoi elle ne serait jamais incluse dans le bundle CSS de
// la page.
import '../GlobeMarkers/GlobeMarkers.scss';
import { mergeLabels } from '@/utils/i18n/mergeLabels';

// Libellés d'interface : défauts français, surchargeables par la prop `uiLabels` (cf.
// src/utils/i18n/mergeLabels.js), comme sur <Chart>. Ils couvrent le globe ET sa barre
// d'outils : c'est <Globe> qui les fusionne une fois et les redistribue, pour que la
// surcharge se fasse en un seul point. Les `labels` de chaque calque, eux, titrent les
// DONNÉES.
const DEFAULT_UI_LABELS = {
  label: 'Globe terrestre interactif',
  toolbar: 'Outils du globe',
  toFlatMap: 'Passer en planisphère',
  toGlobe: 'Passer en globe',
  pointsShown: 'Points affichés',
  pointsHidden: 'Points masqués',
  flowsShown: 'Flux affichés',
  flowsHidden: 'Flux masqués',
  flowsAnimated: 'Flux dynamiques',
  flowsFrozen: 'Flux figés',
  showFlowsToAnimate: 'Affichez les flux pour les animer',
  noFlowToAnimate: 'Aucun flux à animer',
  rotationOn: 'Rotation activée',
  rotationOff: 'Rotation figée',
  wheelZoomOn: 'Zoom molette activé',
  wheelZoomOff: 'Zoom molette désactivé',
  showLayersForTooltips: 'Affichez les points ou les flux pour activer les tooltips',
  noDataToHover: 'Aucune donnée à survoler',
  tooltipsOn: 'Tooltips activées',
  tooltipsOff: 'Tooltips désactivées',
  expand: 'Agrandir (pleine largeur)',
  collapse: 'Replier',
  noLegendToMove: 'Déjà en pleine largeur : aucune légende',
  legend: 'Légende du globe',
};

// État initial de chaque outil, surchargeable clé par clé par la prop `defaults`
// (mêmes clés que la prop `toolbar`, comme `defaults` sur <Chart>).
const DEFAULT_TOOL_STATE = {
  mode: 'globe',
  rotate: true,
  wheelZoom: true,
  points: true,
  arcs: true,
  arcsDynamic: false,
  tooltips: true,
  expanded: false,
};

// Table des bascules : clé d'outil → champ d'état miroir + setter du moteur.
// Les deux outils « one-shot » (mode, resetZoom) n'y figurent pas : ils ont
// chacun leur branche dédiée dans handleToolAction.
// Les clés de `defaults` sont celles de cette table, plus `mode` et `expanded`.
const TOGGLES = {
  wheelZoom: { field: 'wheelZoom', setter: 'setWheelZoom' },
  points: { field: 'showPoints', setter: 'setShowPoints' },
  rotate: { field: 'autoRotate', setter: 'setAutoRotate' },
  tooltips: { field: 'tooltips', setter: 'setTooltips' },
  arcs: { field: 'showArcs', setter: 'setShowArcs' },
  arcsDynamic: { field: 'arcsDynamic', setter: 'setArcsDynamic' },
};

/**
 * WebGL earth globe (Three.js) showing two data layers, points and great-circle
 * flows, with the vocabulary of `<Chart>`. It serves both as a decorative visual (a
 * home-page hero: icon badges, glowing animated flows, no toolbar) and as a data
 * visualization (bubbles and flows encoded by hue and size, legends, tooltips).
 *
 * Realistic day/night textures blended with the theme, mouse drag, slow
 * auto-rotation, wheel zoom and an animated globe ⇄ flat-map morph that preserves
 * center and zoom. A hover toolbar (top-right zone) toggles every behaviour.
 *
 * ### Layers
 * `points` and `arcs` each take a layer spec, a "mini-Chart": `data`, `mark`,
 * `hue`, `z`, `labels`, `format`. An array alone is a shorthand for `{ data }`.
 * - **`hue`** is encoded like the hue channels of `<Chart>`: `hue[0]` → color (the
 *   categorical palette minus its blue hues, which blend into the ocean), `hue[1]` →
 *   style, `hue[2]` → shape. A flow encodes color and dash style; a `bubble` point
 *   color, style (a hatch when filled, a dashed outline with `fill: 'line'`) and
 *   marker shape, like the bubbles of `<Chart>`; a `badge` point its color only.
 * - **`z`** names a numeric key. A point's AREA is proportional to it (the largest
 *   reaches `--globe-marker-max-size`; a point without a positive value is not
 *   drawn) and a size legend joins the legend. A flow's stroke width, arc height and
 *   comet speed (its brightness in the `glow` mark) grow linearly with it. Values
 *   are used as is: any scale works, the globe divides by the largest one.
 * - **`labels`** titles the encoded data (`color`, `style`, `marker`, `z`), each
 *   defaulting to the key; **`format.z`** formats `z` (d3 specifier or function),
 *   else the `displayFormat`/`unit` of the column in `fields`, as on `<Chart>`.
 *
 * ### Marks
 * - Points: `badge` (default) is a dot with a halo ring and the `icon` icon — the
 *   decorative look; `bubble` the data mark described above.
 * - Flows: `arrow` (default) is a solid stroke of constant on-screen width with a
 *   head at the destination, `line` the same stroke without a head (undirected
 *   flows), `glow` a thin additive stroke growing brighter towards the destination
 *   (the decorative look).
 *
 * ### Legend and tooltip
 * The channel legends of `<Chart>` are shown on the right of the globe, or above it
 * in expanded mode (toolbar, `defaults.expanded`) and whenever the frame would get
 * narrower than `--globe-frame-min-width`; hovering one of their items emphasizes
 * the matching points or flows. Hovering a point or a flow shows the tooltip of
 * `<Chart>` (glyph, hue values, formatted `z`), toggled by the `tooltips` tool.
 *
 * ### HTML trust boundary
 * Tooltips and legends render data through JSX: values read off the layers are
 * never injected as HTML. The only HTML injected by the engine is the badge icon:
 * `points.icon` returns TRUSTED inline SVG, host code rather than data. An icon that
 * interpolates data must escape it itself with `escapeHtml`, re-exported by this
 * feature (`import { escapeHtml } from '@/features/globe'`).
 *
 * @param {object} props
 * @param {string} [props.title] - Globe title, shown as the figure caption and used
 *   as the accessible name of the stage, as `title` on `<Chart>`.
 * @param {Array<object>|{data: Array<{id: string, lat: number, lon: number,
 *   label?: string, sub?: string}>, mark?: 'badge'|'bubble', hue?: (string|string[]),
 *   z?: string, fill?: 'fill'|'line', pulse?: boolean, icon?: function(Object): string,
 *   labels?: {color?: string, style?: string, marker?: string, z?: string},
 *   format?: {z?: (string|function(*): string)}}} [props.points] - Points layer
 *   (fixed at mount). `label` titles the tooltip, `sub` is its subtitle. `fill`
 *   applies to bubbles ('fill' default). `pulse` adds the animated halo (default:
 *   on for a badge, off for a bubble; never animated when the user prefers reduced
 *   motion). `icon` returns the inline SVG of a badge (TRUSTED HTML).
 * @param {Array<object>|{data: Array<{from: string, to: string}>,
 *   mark?: 'arrow'|'line'|'glow', hue?: (string|string[]), z?: string,
 *   labels?: {color?: string, style?: string, z?: string},
 *   format?: {z?: (string|function(*): string)}}} [props.arcs] - Flows layer (fixed
 *   at mount); `from`/`to` are point ids.
 * @param {Array<Object>} [props.fields] - Column metadata (`fields` of
 *   DatasetWithMetadata, as on `<Chart>`): the `displayFormat` and `unit` of a `z`
 *   column format it in the tooltip and the size legend, unless `format.z` is set.
 * @param {string} [props.locale] - Site locale code. Formats the `z` values; without
 *   it they fall back to the template's default language.
 * @param {object} [props.defaults] - Initial state of each tool, keyed like `toolbar`:
 *   `mode` ('globe' | 'plane', default 'globe'), `rotate` (true), `wheelZoom` (true),
 *   `points` (true), `arcs` (true), `arcsDynamic` (false), `tooltips` (true) and
 *   `expanded` (false: legend on the right). `rotate` and `arcsDynamic` are forced off
 *   right after mount when the user prefers reduced motion; their toolbar buttons stay
 *   available. Read once, at mount.
 * @param {string[]} [props.toolbar=TOOL_KEYS] - Exposed tool keys (order-insensitive:
 *   grouping is fixed). Empty array = no toolbar, no hover zone.
 * @param {number} [props.height=460] - Height of the globe frame in px (inline
 *   style), legend and caption excluded.
 * @param {Object} [props.uiLabels] - Interface wording overrides (toolbar, accessible
 *   names), merged over the French defaults. Distinct from the layers' `labels`,
 *   which title the data.
 * @param {string} [props.ariaLabel] - Accessible name of the stage WITHOUT a visible
 *   caption (decorative hero); falls back to `title`, then to `uiLabels.label`.
 * @param {string} [props.className] - Additional class(es) on the root figure.
 * @returns {JSX.Element}
 */
const Globe = ({
  title,
  points,
  arcs,
  fields,
  locale,
  defaults = null,
  toolbar = TOOL_KEYS,
  height = 460,
  uiLabels: uiLabelOverrides,
  ariaLabel,
  className,
}) => {
  const ui = mergeLabels(DEFAULT_UI_LABELS, uiLabelOverrides);
  const stageRef = useRef(null);
  const tooltipHostRef = useRef(null);

  // ── Calques : spécification normalisée, encodages hue et taille ──
  // Résolus au rendu : la légende et la tooltip les consomment ici, le moteur n'en
  // reçoit que les accesseurs (couleur CSS -> THREE.Color une fois à la
  // construction, jamais par frame). Capturés au premier rendu par le hook, comme
  // les données — même contrat de données figées au montage.
  const pointLayer = normalizePoints(points);
  const arcLayer = normalizeArcs(arcs);
  const pointEncoding = resolveHueEncoding(pointLayer.data, pointLayer.hue, pointLayer.channels, {
    layer: 'points', labels: pointLayer.labels,
  });
  // Les flux poursuivent la palette des points (cf. `colorDomain`) : deux colonnes
  // différentes ne partagent pas leurs teintes, une modalité commune garde la sienne.
  const arcEncoding = resolveHueEncoding(arcLayer.data, arcLayer.hue, arcLayer.channels, {
    layer: 'arcs', labels: arcLayer.labels, colorDomain: pointEncoding.colorDomain,
  });
  const pointZ = resolveZ(pointLayer.data, pointLayer.z);
  const arcZ = resolveZ(arcLayer.data, arcLayer.z);
  // Valeur `z` telle que la lisent la tooltip et la légende de taille : clé, titre,
  // formateur (format.z > fields > nombre localisé, comme sur <Chart>).
  const zInfo = (layer, z) => ({
    key: z.key,
    label: layer.labels.z ?? null,
    format: zFormatter({ format: layer.format.z, fields, key: z.key, locale }),
  });
  const pointZInfo = zInfo(pointLayer, pointZ);
  const arcZInfo = zInfo(arcLayer, arcZ);

  // État unique des interrupteurs, initialisé depuis la seule prop `defaults`.
  // Basse fréquence (un clic de toolbar) : un objet suffit, aucun besoin d'un
  // state par bascule. Aucune lecture de `window` ici : le serveur rendrait
  // autre chose que le client et React 19 reprendrait tout le sous-arbre à
  // l'hydratation (cf. l'effet « mouvements réduits » plus bas). Les champs
  // portent les noms des OPTIONS DU MOTEUR (autoRotate, showPoints…), les clés de
  // `defaults` ceux des OUTILS (rotate, points…) : la table TOGGLES fait le pont.
  const [st, setSt] = useState(() => {
    const init = { ...DEFAULT_TOOL_STATE, ...defaults };
    return {
      mode: init.mode === 'plane' ? 'plane' : 'globe',
      autoRotate: !!init.rotate,
      wheelZoom: !!init.wheelZoom,
      showPoints: !!init.points,
      showArcs: !!init.arcs,
      tooltips: !!init.tooltips,
      arcsDynamic: !!init.arcsDynamic,
    };
  });
  // Mode agrandi : pure mise en page React (légende au-dessus du cadre), que le
  // moteur ignore. Hors de `st`, qui est spread tel quel dans sa config.
  const [expanded, setExpanded] = useState(() => !!(defaults?.expanded ?? DEFAULT_TOOL_STATE.expanded));
  // Cible survolée signalée par le moteur (au changement seulement) : point ou flux,
  // null sinon. Le setter, d'identité stable, peut être capturé par la config.
  const [hoverTarget, setHoverTarget] = useState(null);

  // Options du moteur : `st` est lu tel quel car le hook capture cette config au
  // premier rendu. Les noms des champs d'état SONT ceux des options du moteur,
  // ce qui rend `applyOption` uniforme — c'est ce spread qui l'autorise.
  const { engineRef, applyOption } = useGlobeEngine(stageRef, {
    points: pointLayer.data,
    arcs: arcLayer.data,
    pointMark: pointLayer.mark,
    pointFill: pointLayer.fill,
    pointPulse: pointLayer.pulse,
    // Un badge porte une icône ; une bulle, jamais.
    pointIcon: pointLayer.mark === 'badge' ? pointLayer.icon : null,
    pointRatioFor: pointZ.key ? pointZ.ratioFor : null,
    pointColorFor: pointEncoding.colorFor,
    pointHatchFor: pointEncoding.hatchFor,
    pointDashFor: pointEncoding.dashFor,
    pointMarkerFor: pointEncoding.markerFor,
    arcMark: arcLayer.mark,
    arcRatioFor: arcZ.key ? arcZ.ratioFor : null,
    arcColorFor: arcEncoding.colorFor,
    // Le shader des flux lit des longueurs en px, pas un dash-array SVG.
    arcDashFor: (arc) => parseDash(arcEncoding.dashFor(arc)),
    onHover: setHoverTarget,
    ...st,
  }, tooltipHostRef);

  // ── Légendes ──
  // Groupes vides écartés : un canal dont aucune ligne ne porte la clé n'a rien à
  // légender (et sans données, aucun groupe ne survit).
  const pointGroups = pointEncoding.legend.filter((g) => g.items.length > 0);
  const arcGroups = arcEncoding.legend.filter((g) => g.items.length > 0);

  // Taille des points par valeur : légende de taille, comme pour les bulles du
  // chart. Le diamètre maximal est un token, lu en px une fois le cadre monté
  // (null avant) : le moteur lit le même, à sa construction.
  const sizeByValue = pointZ.key != null && pointZ.max > 0;
  const maxDiameter = useCssLength(stageRef, '--globe-marker-max-size', sizeByValue);
  const sizeLegend = sizeByValue && maxDiameter > 0 ? (
    <SizeLegend
      zMax={pointZ.max} rMax={maxDiameter / 2} formatValue={pointZInfo.format}
      label={pointZInfo.label ?? pointZ.key} />
  ) : null;
  // La place de la légende est réservée dès le rendu serveur (cf. Globe.scss) :
  // la légende de taille n'arrive qu'au montage, sans décaler le globe.
  const hasLegend = pointGroups.length > 0 || arcGroups.length > 0 || sizeByValue;

  // Modalité survolée dans une légende, avec son calque : estompe les autres items
  // de CETTE légende (comme sur le chart) et met en avant les points ou les flux
  // correspondants dans la scène. Le moteur peut être encore en cours de
  // chargement : le survol est alors simplement perdu, sans conséquence (il ne dure
  // que le temps du geste).
  const [legendHover, setLegendHover] = useState(null);
  const handleLegendHover = (key, group) => {
    setLegendHover(key == null ? null : { layer: group.layer, key });
    const engine = engineRef.current;
    if (!engine) return;
    if (group.layer === 'points') {
      engine.setPointHighlight(key == null ? null : pointEncoding.matcher(group.channel, key));
    } else {
      engine.setArcHighlight(key == null ? null : arcEncoding.matcher(group.channel, key));
    }
  };
  const hoveredIn = (layer) => (legendHover?.layer === layer ? legendHover.key : null);

  // ── Tooltip : modèle de <DataTooltip>, construit au changement de cible ──
  // `st.tooltips` est aussi vérifié ici : le moteur cesse d'en signaler dès que
  // l'outil est coupé, mais une cible déjà reçue ne doit pas survivre au clic.
  let tooltipModel = null;
  if (st.tooltips && hoverTarget) {
    tooltipModel = hoverTarget.layer === 'point'
      ? pointTooltipModel(hoverTarget.point, { encoding: pointEncoding, mark: pointLayer.mark, z: pointZInfo })
      : arcTooltipModel(hoverTarget.arc, hoverTarget.from, hoverTarget.to, {
        encoding: arcEncoding, mark: arcLayer.mark, z: arcZInfo,
      });
  }

  /**
   * Applies a toolbar gesture: mirrors it in the React state (button look and
   * aria-pressed) then pushes it towards the engine through `applyOption`.
   *
   * The engine may still be null while its chunk loads — several hundred ms on a
   * cold cache. `applyOption` therefore also rewrites the config the engine will
   * be built from, so a gesture made during that window is not lost: it is the
   * scene that catches up with the button, never the opposite.
   *
   * Every state update goes through the FUNCTIONAL form: two gestures landing in
   * the same tick are merged instead of overwriting each other (see below).
   *
   * @param {string} key - Tool key emitted by <GlobeToolbar> (one of TOOL_KEYS).
   * @returns {void}
   */
  const handleToolAction = (key) => {
    // Forme FONCTIONNELLE de setSt (`prev => …`) et non `{ ...st, … }` : `st` est le
    // snapshot du rendu courant, donc deux gestes commités dans le MÊME tick — deux
    // champs différents — partiraient tous deux du même objet et le second écraserait
    // le premier. Le moteur, lui, reçoit les deux (applyOption écrit sans passer par
    // le rendu) : c'est exactement la divergence état/scène que ce fichier corrige.
    // Reste hors de portée, faute d'être atteignable autrement qu'en pilotant le DOM :
    // deux clics sur le MÊME bouton dans un seul tick, où `!st[field]` calculerait
    // deux fois la même cible — un clic réel étant un événement discret, React rend
    // entre deux et `st` est toujours frais.
    switch (key) {
      // Action one-shot : recentrage caméra, aucun état miroir à tenir — et rien
      // à mémoriser si le moteur n'existe pas encore, la scène naissant de toute
      // façon à la distance caméra par défaut.
      case 'resetZoom':
        engineRef.current?.resetZoom();
        break;
      // Le moteur reste la source de vérité du morphing QUAND il existe : on
      // recopie le mode qu'il renvoie. Sinon on calcule la bascule localement et
      // on la réinjecte dans la graine, pour que la scène naisse dans CE mode-là
      // (le morph démarre alors directement sur sa cible, sans transition).
      case 'mode': {
        const engine = engineRef.current;
        const m = engine ? engine.toggleMode() : (st.mode === 'globe' ? 'plane' : 'globe');
        applyOption('mode', m);
        setSt((prev) => ({ ...prev, mode: m }));
        break;
      }
      // Mise en page seulement : le moteur n'en sait rien.
      case 'expand':
        setExpanded((e) => !e);
        break;
      // Toutes les autres clés sont des bascules booléennes symétriques.
      default: {
        const { field, setter } = TOGGLES[key];
        const value = !st[field];
        setSt((prev) => ({ ...prev, [field]: value }));
        applyOption(field, value, setter);
      }
    }
  };

  // ── Accessibilité : dégradation « mouvements réduits », une fois au montage ──
  // Pourquoi pas au rendu : le serveur ne connaît pas la préférence, et tout état
  // client qui diverge du HTML serveur est une erreur d'hydratation — React ne
  // limite pas la reprise à l'attribut divergent, il re-rend le sous-arbre. L'état
  // initial part donc de la prop `defaults`, strictement identique des deux
  // côtés : plus aucune divergence, donc aucun `suppressHydrationWarning` à poser
  // (un script inline façon thème n'y changerait rien : il pose un attribut DOM,
  // l'état React, lui, divergerait toujours).
  //
  // Pourquoi la FONCTION `prefersReducedMotion` et non le hook `useReducedMotion`
  // (@/hooks/accessibility) : le hook lit la media query dans l'initialiseur de
  // son `useState`, donc PENDANT LE RENDU — exactement la divergence décrite
  // ci-dessus. Ici la lecture est confinée à l'effet de montage.
  //
  // Pourquoi un setState dans un effet : la règle de CLAUDE.md vise la SYNCHRO DE
  // PROPS. Ici, lecture UNIQUE d'une préférence système au montage, sans aucune
  // dépendance réactive — d'où la suppression assumée de la règle ESLint.
  //
  // Timing : cet effet s'exécute forcément AVANT la construction du moteur, dont
  // le constructeur vit dans le `.then()` d'un `import()` — donc dans une
  // microtâche postérieure à la purge des effets passifs. La graine est déjà
  // dégradée quand la scène naît : zéro frame de rotation ou de comète. Les
  // appels setter couvrent le cas inverse (théorique) d'un moteur déjà prêt.
  //
  // Portée : le morph globe ⇄ planisphère n'est PAS dégradé — il ne se déclenche
  // que sur un clic explicite, c'est un retour d'interaction borné et non du
  // mouvement ambiant. Un changement de préférence système en cours de session
  // n'est pas suivi : passé le montage, les boutons appartiennent à l'utilisateur.
  useEffect(() => {
    if (!prefersReducedMotion()) return;
    applyOption('autoRotate', false, 'setAutoRotate');
    applyOption('arcsDynamic', false, 'setArcsDynamic');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ajustement unique au montage sur une préférence système, cf. ci-dessus
    setSt((prev) => ({ ...prev, autoRotate: false, arcsDynamic: false }));
  }, [applyOption]);

  // Clés inconnues ignorées : la toolbar ne rend que des outils qu'elle sait
  // construire, et un tableau vide supprime barre ET zone de survol.
  const visibleTools = toolbar.filter((key) => TOOL_KEYS.includes(key));

  return (
    // Racine sans chrome : elle place côte à côte (ou l'un sous l'autre) le cadre
    // spatial et la légende, qui se lit HORS de la scène, comme celle du chart.
    <figure
      className={`globe${hasLegend ? ' globe--legend' : ''}${expanded ? ' globe--expanded' : ''}${className ? ` ${className}` : ''}`}>
      {/* Cadre spatial (bordure, fond, hauteur) : hôte positionné du stage, de la
          tooltip et de la toolbar, distinct de la figure pour que la légende reste
          dehors. */}
      <div className="globe-frame" style={{ height }}>
        {/* Point de montage du moteur : un sous-arbre possédé par Three.js, que
            React ne réconcilie jamais. `role="img"` donne un équivalent textuel
            au canvas, invisible des technologies d'assistance. */}
        <div className="globe-stage" ref={stageRef} role="img" aria-label={ariaLabel ?? title ?? ui.label} />
        {/* Hôte de la tooltip : React en rend le contenu (la bulle du chart), le
            moteur n'en écrit que le `transform`. Frère du stage et non enfant :
            React ne doit jamais réconcilier le sous-arbre de Three.js. La classe de
            calque fixe la couleur `currentColor` des glyphes sans canal couleur. */}
        <div
          ref={tooltipHostRef}
          className={`globe-tooltip-host${hoverTarget ? ` globe-tooltip-host--${hoverTarget.layer}` : ''}`}>
          {tooltipModel && <DataTooltip model={tooltipModel} />}
        </div>
        {visibleTools.length > 0 && (
          // `hasPoints`/`hasArcs`/`hasLegend` sont dérivés au rendu et NON rangés
          // dans `st` : `st` est le miroir des options du moteur (il est spread tel
          // quel dans sa config plus haut), alors que ces drapeaux décrivent la
          // donnée reçue en props, qui ne bouge pas. Ils n'existent que pour la
          // barre, qui doit griser un outil quand il n'y a rien à manipuler — un
          // interrupteur resté ON sur une collection vide ne rend rien actionnable.
          <GlobeToolbar
            labels={ui}
            tools={visibleTools}
            state={{
              ...st, expanded,
              hasPoints: pointLayer.data.length > 0, hasArcs: arcLayer.data.length > 0, hasLegend,
            }}
            onAction={handleToolAction} />
        )}
      </div>
      {/* Légendes des points (couleur, style, forme), des flux (couleur, style de
          trait) et de la taille des points : les composants de légende du chart,
          une légende par calque pour que chacune garde son glyphe de style
          (hachure d'une bulle pleine, pointillé d'un flux). Elles ne suivent pas
          les interrupteurs « points / flux affichés » : comme la toolbar, elles
          décrivent la donnée reçue, pas l'état de la scène. */}
      {hasLegend && (
        <aside className="globe-legend" aria-label={ui.legend}>
          {pointGroups.length > 0 && (
            <ChannelLegend
              className="globe-legend-points"
              groups={pointGroups}
              layout={expanded ? 'horizontal' : 'vertical'}
              styleGlyph={pointLayer.fill === 'line' ? 'dash' : 'hatch'}
              hovered={hoveredIn('points')}
              onHover={handleLegendHover} />
          )}
          {arcGroups.length > 0 && (
            <ChannelLegend
              className="globe-legend-arcs"
              groups={arcGroups}
              layout={expanded ? 'horizontal' : 'vertical'}
              hovered={hoveredIn('arcs')}
              onHover={handleLegendHover} />
          )}
          {sizeLegend}
        </aside>
      )}
      {/* Légende de la figure, comme le titre de <Chart>. DERNIÈRE dans le DOM : la
          figure s'enroule en `wrap-reverse` (cf. Globe.scss), sa dernière ligne
          s'affiche donc en haut. */}
      {title && (
        <figcaption className="globe-caption">
          <h3 className="globe-title">{title}</h3>
        </figcaption>
      )}
    </figure>
  );
};

export default Globe;
