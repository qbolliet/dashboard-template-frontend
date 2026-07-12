// =================================================================
// MinimapToggle — pastille chevron de pli/dépli d'une mini-vue
// =================================================================
// Bouton flottant ancré sur le titre d'axe correspondant (apparaît au survol
// quand la mini-vue est dépliée, reste visible quand elle est repliée). Il ne fait
// QUE plier/déplier la bande de son axe : masquer les mini-vues (pastilles
// comprises) est le rôle du bouton « mini-vues » de la barre d'outils. Le chevron
// pivote de 180° en CSS pur (transform) selon l'état.

// Importation des modules
import { ChevronIcon } from '@/components/icons';
import './MinimapToggle.scss';

/**
 * Collapse/expand toggle for one axis' brush minimap.
 *
 * Positionnement 100 % CSS : le parent fournit via `style` le point d'ancrage
 * (`left`/`top`, calculés depuis la géométrie du tracé), et la feuille de style
 * y ancre la boîte par `transform` — haut-centre pour `direction="x"`, centre
 * exact puis rotation -90° pour `direction="y"`. Le centre étant invariant par
 * rotation, la position affichée ne dépend pas de la largeur du texte
 * (« Replier »/« Déplier ») : aucune mesure JS n'est nécessaire.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the axis' minimap band is expanded.
 * @param {'x'|'y'|'both'} [props.direction='both'] - Which minimap(s) it controls.
 * @param {Function} props.onToggle - Toggle callback.
 * @param {object} [props.style] - Inline anchor point, relative to the positioned
 *   chart body: `left` = axis-title center (+ `top` = button top edge for "x",
 *   button center for "y"). See MinimapToggle.scss.
 * @returns {JSX.Element}
 */
const MinimapToggle = ({ open, direction = 'both', onToggle, style }) => {
  const label = open ? 'Replier la mini-vue' : 'Déplier la mini-vue';

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
