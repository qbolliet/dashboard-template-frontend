// =================================================================
// GLOBE TOOLBAR — barre d'outils du globe (haut-droit, révélée au survol)
// =================================================================
// Assemblage fin au-dessus de <HoverToolbar> (toolbar mutualisée chart/table/
// globe) : traduit l'état du globe en GROUPES d'opérations, le rendu des boutons
// et des séparateurs étant entièrement pris en charge par la primitive. Aucun
// état ici — le composant racine <Globe> possède l'état et le moteur, et reçoit
// la clé de l'outil actionné via `onAction`.
//
// La révélation de la barre est spécifique au globe : elle ne se déclenche
// PAS au survol du cadre entier (contrat `hover-toolbar-host`) mais au survol
// d'une zone invisible haut-droite, rendue ici juste avant la barre. Sur un
// composant qui se manipule à la souris en continu (drag, molette), le contrat
// standard laisserait la barre affichée en permanence.

// Importation des modules
import HoverToolbar from '@/components/toolbar/HoverToolbar/HoverToolbar';
import { resetZoomTool } from '@/components/toolbar/tools';
import GlobeToolIcon from './GlobeToolIcon/GlobeToolIcon';
import './GlobeToolbar.scss';

// Clés d'outils reconnues (ordre d'affichage porté par `GROUPS`, pas par cette liste).
const TOOL_KEYS = ['mode', 'points', 'arcs', 'arcsDynamic', 'rotate', 'wheelZoom', 'resetZoom', 'tooltips'];

// Regroupement FIXE en trois familles : vue | contenu | interaction. Un
// séparateur vertical est intercalé automatiquement entre deux groupes peuplés.
const GROUPS = [
  ['mode'],
  ['points', 'arcs', 'arcsDynamic'],
  ['rotate', 'wheelZoom', 'resetZoom', 'tooltips'],
];

/**
 * Builds the ToolSpec of a single tool key from the current globe state.
 *
 * Toggle tools expose their ON/OFF state through `active` (aria-pressed) and
 * carry the matching wording as label; one-shot tools (mode, resetZoom) leave
 * `active` undefined so they are not announced as a toggle stuck off. Two tools
 * depend on another one being ON and are greyed out with an explanatory label.
 *
 * @param {string} key - Tool key (one of TOOL_KEYS).
 * @param {object} state - Current globe state (see GlobeToolbar props).
 * @param {function(string): void} onAction - Receives the tool key on click.
 * @returns {import('@/components/toolbar/HoverToolbar/HoverToolbar').ToolSpec}
 */
const buildTool = (key, state, onAction) => {
  const onClick = () => onAction(key);

  switch (key) {
    // Bascule globe ⇄ planisphère : l'icône et le libellé montrent la CIBLE.
    case 'mode':
      return {
        id: 'mode',
        icon: state.mode === 'globe' ? GlobeToolIcon.toPlane : GlobeToolIcon.toGlobe,
        label: state.mode === 'globe' ? 'Passer en planisphère' : 'Passer en globe',
        onClick,
      };
    case 'resetZoom':
      // Toujours actionnable côté globe (le moteur recentre sans condition).
      return resetZoomTool({ onClick });
    case 'points':
      return {
        id: 'points',
        icon: GlobeToolIcon.points,
        label: state.showPoints ? 'Points affichés' : 'Points masqués',
        active: state.showPoints,
        onClick,
      };
    case 'arcs':
      return {
        id: 'arcs',
        icon: GlobeToolIcon.arcs,
        label: state.showArcs ? 'Flux affichés' : 'Flux masqués',
        active: state.showArcs,
        onClick,
      };
    // Animer des flux masqués n'a pas de sens : outil grisé tant que `showArcs`
    // est faux, et l'état actif reste subordonné à l'affichage des flux.
    case 'arcsDynamic':
      return {
        id: 'arcsDynamic',
        icon: GlobeToolIcon.flow,
        label: state.showArcs
          ? (state.arcsDynamic ? 'Flux dynamiques' : 'Flux figés')
          : 'Affichez les flux pour les animer',
        active: state.arcsDynamic && state.showArcs,
        disabled: !state.showArcs,
        onClick,
      };
    case 'rotate':
      return {
        id: 'rotate',
        icon: GlobeToolIcon.rotate,
        label: state.autoRotate ? 'Rotation activée' : 'Rotation figée',
        active: state.autoRotate,
        onClick,
      };
    case 'wheelZoom':
      return {
        id: 'wheelZoom',
        icon: GlobeToolIcon.wheel,
        label: state.wheelZoom ? 'Zoom molette activé' : 'Zoom molette désactivé',
        active: state.wheelZoom,
        onClick,
      };
    // Dépendance réelle : le moteur affiche une tooltip de POINT si showPoints
    // (cf. _showTip) et une tooltip d'ARC si showArcs (cf. _onHoverMove), les deux
    // gardes étant indépendantes l'une de l'autre. Le bouton ne doit donc se griser
    // que quand il n'y a plus RIEN à survoler — points ET flux masqués — pas dès
    // que les points seuls disparaissent : les arcs restent survolables sans eux.
    case 'tooltips': {
      const nothingToHover = !state.showPoints && !state.showArcs;
      return {
        id: 'tooltips',
        icon: GlobeToolIcon.tip,
        label: nothingToHover
          ? 'Affichez les points ou les flux pour activer les tooltips'
          : (state.tooltips ? 'Tooltips activées' : 'Tooltips désactivées'),
        active: state.tooltips && !nothingToHover,
        disabled: nothingToHover,
        onClick,
      };
    }
    // Filet de sécurité : TOOL_KEYS et GROUPS sont maintenus à la main à côté de
    // ce switch. Une clé ajoutée aux deux sans son `case` dédié tomberait ici — on
    // renvoie `null` plutôt que d'aliaser un outil existant (le duplicata produit
    // par un ancien `default` partagé avec 'tooltips' cassait React : deux enfants
    // de même clé). GlobeToolbar filtre les `null` avant de les passer à HoverToolbar.
    default:
      return null;
  }
};

/**
 * Thin assembly over the shared HoverToolbar: maps globe tool keys to ToolSpecs
 * (icons, French labels, dependency-based disabling) and renders the invisible
 * top-right hover zone that reveals the bar (D5).
 *
 * @param {object} props
 * @param {string[]} props.tools - Visible tool keys (already filtered/validated).
 * @param {{mode: string, autoRotate: boolean, wheelZoom: boolean, showPoints: boolean,
 *   showArcs: boolean, tooltips: boolean, arcsDynamic: boolean}} props.state
 * @param {function(string): void} props.onAction - Receives the tool key; the root
 *   component owns all state transitions and engine calls.
 * @returns {JSX.Element}
 */
const GlobeToolbar = ({ tools, state, onAction }) => {
  // Chaque famille est réduite aux outils demandés, puis aux ToolSpecs non nulles
  // (cf. la branche `default` de buildTool) ; les familles vidées par l'une ou
  // l'autre étape sont retirées pour ne pas laisser de séparateur orphelin —
  // HoverToolbar ne tolère pas les entrées nulles dans un groupe.
  const groups = GROUPS
    .map((group) => group
      .filter((key) => tools.includes(key))
      .map((key) => buildTool(key, state, onAction))
      .filter(Boolean))
    .filter((group) => group.length > 0);

  return (
    <>
      <span className="globe-tool-zone" aria-hidden="true" />
      <HoverToolbar groups={groups} label="Outils du globe" />
    </>
  );
};

export default GlobeToolbar;
export { TOOL_KEYS };
