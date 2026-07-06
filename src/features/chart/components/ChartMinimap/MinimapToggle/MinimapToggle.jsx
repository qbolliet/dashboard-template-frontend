// =================================================================
// MinimapToggle — pastille chevron d'ouverture/fermeture des mini-vues
// =================================================================
// Bouton flottant en bas à droite du corps du graphique (apparaît au survol
// quand ouvert, reste visible quand fermé). Le chevron pivote de 180° en CSS pur
// (transform) selon l'état — transposé de .ca-minimap-toggle du prototype.

// Importation des modules
import { ChevronIcon } from '@/components/icons';
import './MinimapToggle.scss';

/**
 * Open/close toggle for the brush minimaps.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the minimaps are currently shown.
 * @param {'x'|'y'|'both'} [props.direction='both'] - Which minimap(s) it controls (aria only).
 * @param {Function} props.onToggle - Toggle callback.
 * @returns {JSX.Element}
 */
const MinimapToggle = ({ open, direction = 'both', onToggle }) => {
  const label = open ? 'Réduire la mini-vue' : 'Afficher la mini-vue';
  return (
    <button
      type="button"
      className={`chart-minimap-toggle${open ? '' : ' chart-minimap-toggle--closed'}`}
      onClick={onToggle}
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
