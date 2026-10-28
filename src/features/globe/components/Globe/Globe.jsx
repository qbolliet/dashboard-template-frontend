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
// bouton PUIS le pousse vers le moteur via `applyOption`. Rien ne remonte du
// moteur vers React.

// Importation des modules
import { useEffect, useRef, useState } from 'react';
import useGlobeEngine from '../../hooks/useGlobeEngine';
import { prefersReducedMotion } from '@/utils/accessibility/a11y';
import { useCssLength } from '@/hooks/cssLength/useCssLength';
import { intlLocaleFor } from '@/i18n/formats';
import GlobeToolbar, { TOOL_KEYS } from '../GlobeToolbar/GlobeToolbar';
import ChannelLegend from '@/components/legend/ChannelLegend/ChannelLegend';
import SizeLegend from '@/components/legend/SizeLegend/SizeLegend';
import { resolveArcEncoding } from '../../utils/arcEncoding';
import { resolvePointSize } from '../../utils/pointSize';
import './Globe.scss';
// Styles du DOM injecté par le moteur : les pastilles et la tooltip ne sont
// rendues par aucun composant React, leurs feuilles doivent donc être tirées
// par la frontière cliente qui monte le moteur — sans quoi elles ne seraient
// jamais incluses dans le bundle CSS de la page.
import '../GlobeMarkers/GlobeMarkers.scss';
import '../GlobeTooltip/GlobeTooltip.scss';
import { mergeLabels } from '@/utils/i18n/mergeLabels';

// Libellés d'interface : défauts français, surchargeables par la prop `uiLabels` (cf.
// src/utils/i18n/mergeLabels.js), comme sur <Chart>. Ils couvrent le globe ET sa barre
// d'outils : c'est <Globe> qui les fusionne une fois et les redistribue, pour que la
// surcharge se fasse en un seul point. La prop `labels`, elle, titre les DONNÉES.
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
  flowIntensity: 'Intensité du flux',
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
 * WebGL earth globe (Three.js): realistic day/night textures blended with the
 * theme, mouse drag, slow auto-rotation, wheel zoom, conditional data points
 * with tooltips, great-circle flows (arrows, undirected lines or a decorative
 * glow, static or animated), and an animated globe ⇄ flat-map morph that
 * preserves center and zoom. A hover toolbar (top-right zone) toggles every
 * behaviour. The API follows `<Chart>`: `defaults` sets the initial state of each
 * tool, `labels` titles the data (legends, tooltip), `uiLabels` overrides the
 * interface wording, and the expand tool moves the legend from the right of the
 * globe to above it.
 *
 * ### Points
 * `pointVariant` picks the look of the points: `badge` (default) is a dot with a
 * halo ring and the `iconFor` icon, `dot` a plain disc with a thin border, no ring
 * and no icon. `pointPulse` adds or removes the animated halo on either variant.
 * `pointSize` sets the diameter: a number of px for every point, or the key of a
 * numeric value each point's AREA is proportional to, like the bubbles of `<Chart>`
 * (the largest reaches `--globe-marker-max-size`; a point without a positive value
 * is not drawn) — a size legend then joins the legend.
 *
 * ### Flow drawing
 * `arcVariant` picks how flows are drawn: `arrow` (default) is a solid stroke of
 * constant on-screen width with a head at the destination, `line` the same stroke
 * without a head (undirected flows), `glow` a thin additive stroke growing brighter
 * towards the destination (the decorative look). `value` ∈ [0,1] drives the arc
 * height, the comet speed and the stroke width (between the `--globe-arc-width-min`
 * and `--globe-arc-width-max` tokens; the mean of both when absent), or the stroke
 * brightness in the `glow` variant.
 *
 * ### Flow encoding
 * `arcHue` names keys of the `arcs` objects, encoded like the hue channels of
 * `<Chart>`: the first one picks the stroke color in the categorical palette minus
 * its blue hues (they blend into the ocean), the second one the dash style (an
 * arrow head always stays solid). The chart's channel legend is then shown on the
 * right of the globe, or above it in expanded mode (toolbar, `defaults.expanded`)
 * and whenever the frame would get narrower than `--globe-frame-min-width`;
 * hovering one of its items emphasizes the matching flows. Without `arcHue`, every
 * flow takes the `--globe-arc` token color, with a solid stroke.
 *
 * ### HTML trust boundary
 * The tooltip and the point badges are injected with `innerHTML` by the engine,
 * so the split is explicit and uniform:
 * - **Data** — everything read off the `points` / `arcs` objects (`label`, `sub`,
 *   `value`, the `arcHue` values) is HTML-escaped by the feature's default templates. Untrusted input
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
 *   `label`/`sub`/`value` are escaped by the default tooltip template. Any other key
 *   can be named by `pointSize`.
 * @param {Array<{from: string, to: string, value?: number}>} [props.arcs] - Flows;
 *   from/to = point ids, value ∈ [0,1] drives stroke width, arc height and comet
 *   speed. Any other key can be named by `arcHue` (fixed at mount).
 * @param {?(string|string[])} [props.arcHue] - Keys of the `arcs` objects encoded
 *   visually: `arcHue[0]` → stroke color (categorical palette, as `<Chart>`),
 *   `arcHue[1]` → dash style. A single string encodes the color only. Null = one
 *   `--globe-arc` color and solid strokes, no flow legend.
 * @param {'arrow'|'line'|'glow'} [props.arcVariant='arrow'] - Flow drawing (fixed at
 *   mount): directed arrows, undirected lines, or the decorative glow.
 * @param {'badge'|'dot'} [props.pointVariant='badge'] - Point look (fixed at mount):
 *   badge with ring and icon, or sober dot.
 * @param {boolean} [props.pointPulse=true] - Animated pulse halo behind each point
 *   (fixed at mount; never animated when the user prefers reduced motion).
 * @param {?(number|string)} [props.pointSize] - Point diameter in px, or the key of a
 *   numeric value the point AREA is proportional to (fixed at mount). Absent = the
 *   variant default (`--globe-marker-size`, `--globe-marker-dot-size`).
 * @param {?function(Object): string} [props.iconFor] - Returns an inline SVG string
 *   centered in the point badge — conditional on any point value. TRUSTED HTML:
 *   injected as-is (see the trust boundary above). Ignored by the `dot` variant.
 * @param {?function(Object): string} [props.colorFor] - Returns the point CSS color.
 *   Applied through `element.style.setProperty('--c', …)` on the marker element,
 *   never interpolated into markup. Default: the --globe-marker-accent token.
 * @param {?function(Object): string} [props.tooltipFor] - Tooltip HTML for a point.
 *   TRUSTED HTML: injected as-is, so escape any data interpolated into it.
 *   Default: tooltipTemplates.point (label + sub + value, all escaped).
 * @param {{color?: string, style?: string, size?: string}} [props.labels] - Titles of
 *   the encoded data, as `labels` on `<Chart>`: flow color and dash channels (legend
 *   and tooltip), point size (size legend). Each defaults to the key name.
 * @param {object} [props.defaults] - Initial state of each tool, keyed like `toolbar`:
 *   `mode` ('globe' | 'plane', default 'globe'), `rotate` (true), `wheelZoom` (true),
 *   `points` (true), `arcs` (true), `arcsDynamic` (false), `tooltips` (true) and
 *   `expanded` (false: legend on the right). `rotate` and `arcsDynamic` are forced off
 *   right after mount when the user prefers reduced motion; their toolbar buttons stay
 *   available. Read once, at mount.
 * @param {string[]} [props.toolbar=TOOL_KEYS] - Exposed tool keys (order-insensitive:
 *   grouping is fixed). Empty array = no toolbar, no hover zone.
 * @param {number} [props.height=460] - Height of the globe frame in px (inline
 *   style), legend excluded.
 * @param {string} [props.locale] - Site locale code. Formats the values of the size
 *   legend; without it they fall back to the template's default language.
 * @param {Object} [props.uiLabels] - Interface wording overrides (toolbar, tooltip,
 *   accessible names), merged over the French defaults. Distinct from `labels`, which
 *   titles the data.
 * @param {string} [props.ariaLabel] - Accessible name naming THIS globe; falls back to
 *   `uiLabels.label`, the generic wording of the WebGL stage.
 * @param {string} [props.className] - Additional class(es) on the root figure.
 * @returns {JSX.Element}
 */
const Globe = ({
  points = [],
  arcs = [],
  arcHue = null,
  arcVariant = 'arrow',
  pointVariant = 'badge',
  pointPulse = true,
  pointSize = null,
  iconFor = null,
  colorFor = null,
  tooltipFor = null,
  labels = null,
  defaults = null,
  toolbar = TOOL_KEYS,
  height = 460,
  locale,
  uiLabels: uiLabelOverrides,
  ariaLabel,
  className,
}) => {
  const ui = mergeLabels(DEFAULT_UI_LABELS, uiLabelOverrides);
  const dataLabels = labels ?? {};
  const stageRef = useRef(null);

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

  // Options du moteur : `st` est lu tel quel car le hook capture cette config au
  // premier rendu. Les noms des champs d'état SONT ceux des options du moteur,
  // ce qui rend `applyOption` uniforme — c'est ce spread qui l'autorise.
  // Encodage hue des flux, résolu au rendu : la légende le consomme ici, le
  // moteur n'en reçoit que les accesseurs (couleur CSS -> THREE.Color une fois à
  // la construction, jamais par frame). Capturé au premier rendu par le hook,
  // comme `arcs` — même contrat de données figées au montage.
  const arcEncoding = resolveArcEncoding(arcs, arcHue, dataLabels);
  const { engineRef, applyOption } = useGlobeEngine(stageRef, {
    points, arcs, arcVariant, pointVariant, pointPulse, pointSize,
    iconFor, colorFor, tooltipFor, labels: ui, ...st,
    arcColorFor: arcEncoding.active ? arcEncoding.colorFor : null,
    arcDashFor: arcEncoding.active ? arcEncoding.dashFor : null,
    arcHueFields: arcEncoding.fields,
  });
  // Groupes vides écartés : un canal dont aucun flux ne porte la clé n'a rien à
  // légender (et sans flux du tout, aucun groupe ne survit).
  const legendGroups = arcEncoding.legend.filter((g) => g.items.length > 0);

  // Taille des points par valeur : légende de taille, comme pour les bulles du
  // chart. Le diamètre maximal est un token, lu en px une fois le cadre monté
  // (null avant) : le moteur lit le même, à sa construction.
  const sizing = resolvePointSize(points, pointSize);
  const sizeByValue = sizing.mode === 'value' && sizing.max > 0;
  const maxDiameter = useCssLength(stageRef, '--globe-marker-max-size', sizeByValue);
  const formatSize = (v) => new Intl.NumberFormat(intlLocaleFor(locale)).format(v);
  const sizeLegend = sizeByValue && maxDiameter > 0 ? (
    <SizeLegend
      zMax={sizing.max} rMax={maxDiameter / 2} formatValue={formatSize}
      label={dataLabels.size ?? sizing.key} />
  ) : null;
  // La place de la légende est réservée dès le rendu serveur (cf. Globe.scss) :
  // la légende de taille n'arrive qu'au montage, sans décaler le globe.
  const hasLegend = legendGroups.length > 0 || sizeByValue;
  // Modalité survolée dans la légende : estompe les autres items (comme sur le
  // chart) et met en avant les flux correspondants dans la scène. Le moteur peut
  // être encore en cours de chargement : le survol est alors simplement perdu,
  // sans conséquence (il ne dure que le temps du geste).
  const [legendHover, setLegendHover] = useState(null);
  const handleLegendHover = (key, group) => {
    setLegendHover(key);
    engineRef.current?.setArcHighlight(key == null ? null : arcEncoding.matcher(group.channel, key));
  };

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
      {/* Cadre spatial (bordure, fond, hauteur) : hôte positionné du stage et de
          la toolbar, distinct de la figure pour que la légende reste dehors. */}
      <div className="globe-frame" style={{ height }}>
        {/* Point de montage du moteur : un sous-arbre possédé par Three.js, que
            React ne réconcilie jamais. `role="img"` donne un équivalent textuel
            au canvas, invisible des technologies d'assistance. */}
        <div className="globe-stage" ref={stageRef} role="img" aria-label={ariaLabel ?? ui.label} />
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
              hasPoints: points.length > 0, hasArcs: arcs.length > 0, hasLegend,
            }}
            onAction={handleToolAction} />
        )}
      </div>
      {/* Légendes des flux (couleur, style de trait) et de la taille des points :
          les composants de légende du chart. Elles ne suivent pas les
          interrupteurs « points / flux affichés » : comme la toolbar, elles
          décrivent la donnée reçue, pas l'état de la scène. */}
      {hasLegend && (
        <aside className="globe-legend" aria-label={ui.legend}>
          {legendGroups.length > 0 && (
            <ChannelLegend
              groups={legendGroups}
              layout={expanded ? 'horizontal' : 'vertical'}
              hovered={legendHover}
              onHover={handleLegendHover} />
          )}
          {sizeLegend}
        </aside>
      )}
    </figure>
  );
};

export default Globe;
