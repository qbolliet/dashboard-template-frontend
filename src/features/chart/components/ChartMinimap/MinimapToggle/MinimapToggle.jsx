// =================================================================
// MinimapToggle — pastille chevron d'ouverture/fermeture des mini-vues
// =================================================================
// Bouton flottant ancré sur le titre d'axe correspondant (apparaît au survol
// quand ouvert, reste visible quand fermé). Le chevron pivote de 180° en CSS pur
// (transform) selon l'état — transposé de .ca-minimap-toggle du prototype.

// Importation des modules
import { ChevronIcon } from '@/components/icons';
import './MinimapToggle.scss';

/**
 * Open/close toggle for the brush minimaps.
 *
 * Positionnement 100 % CSS : le parent fournit via `style` le point d'ancrage
 * (`left`/`top`, calculés depuis la géométrie du tracé), et la feuille de style
 * y ancre la boîte par `transform` — haut-centre pour `direction="x"`, centre
 * exact puis rotation -90° pour `direction="y"`. Le centre étant invariant par
 * rotation, la position affichée ne dépend pas de la largeur du texte
 * (« Réduire »/« Afficher ») : aucune mesure JS n'est nécessaire.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the minimaps are currently shown.
 * @param {'x'|'y'|'both'} [props.direction='both'] - Which minimap(s) it controls.
 * @param {Function} props.onToggle - Toggle callback.
 * @param {object} [props.style] - Inline anchor point, relative to the positioned
 *   chart body: `left` = axis-title center (+ `top` = button top edge for "x",
 *   button center for "y"). See MinimapToggle.scss.
 * @returns {JSX.Element}
 */
const MinimapToggle = ({ open, direction = 'both', onToggle, style }) => {
  const label = open ? 'Réduire la mini-vue' : 'Afficher la mini-vue';

  return (
    <button
      type="button"
      className={`chart-minimap-toggle${open ? '' : ' chart-minimap-toggle--closed'}`}
      onClick={onToggle}
      style={style}
      aria-label={label}
      aria-expanded={open}
      data-direction={direction}
      title={label}
    >
      {/* Chevron mutualisé, pivoté en CSS (chevron bas → haut quand fermé). */}
      <ChevronIcon direction="down" className="chart-minimap-toggle__chevron" />
      <span className="chart-minimap-toggle__text">{label}</span>
    </button>
  );
};

export default MinimapToggle;
