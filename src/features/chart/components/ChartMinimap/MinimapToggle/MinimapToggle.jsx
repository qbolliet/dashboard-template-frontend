// =================================================================
// MinimapToggle — pastille chevron d'ouverture/fermeture des mini-vues
// =================================================================
// Bouton flottant en bas à droite du corps du graphique (apparaît au survol
// quand ouvert, reste visible quand fermé). Le chevron pivote de 180° en CSS pur
// (transform) selon l'état — transposé de .ca-minimap-toggle du prototype.

// Importation des modules
import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronIcon } from '@/components/icons';
import './MinimapToggle.scss';

/**
 * Open/close toggle for the brush minimaps.
 *
 * Pour `direction="y"` (bouton pivoté -90°), la position ne peut pas se réduire
 * à un simple `left`/`top` : une fois pivotée, la boîte NON pivotée du bouton
 * (large, sa largeur dépend du texte « Réduire »/« Afficher ») a son centre de
 * rotation inchangé par la rotation, mais ses bords affichés dépendent de ses
 * dimensions naturelles (largeur ET hauteur). On mesure donc le bouton après
 * montage (`offsetWidth`/`offsetHeight`, non affectés par `transform`) pour
 * placer son bord droit pivoté exactement à `edgeX` et son centre vertical
 * pivoté exactement à `centerY`, quelle que soit la longueur du texte.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the minimaps are currently shown.
 * @param {'x'|'y'|'both'} [props.direction='both'] - Which minimap(s) it controls (aria only).
 * @param {Function} props.onToggle - Toggle callback.
 * @param {object} [props.style] - Inline style override, utilisé pour `direction="x"`
 *   (pas de rotation, positionnement direct sans mesure nécessaire).
 * @param {number} [props.edgeX] - `direction="y"` uniquement : position cible (px,
 *   relative au conteneur positionné) du bord DROIT du bouton une fois pivoté.
 * @param {number} [props.centerY] - `direction="y"` uniquement : position cible (px)
 *   du centre vertical du bouton une fois pivoté.
 * @returns {JSX.Element}
 */
const MinimapToggle = ({ open, direction = 'both', onToggle, style, edgeX, centerY }) => {
  const label = open ? 'Réduire la mini-vue' : 'Afficher la mini-vue';
  const btnRef = useRef(null);
  const [naturalSize, setNaturalSize] = useState(null);

  // Mesure la boîte NON pivotée (offsetWidth/Height ignorent `transform`) — avant
  // peinture (useLayoutEffect), donc sans flash visible même au 1er montage.
  // Redéclenché quand `label` change (« Réduire »/« Afficher », largeurs différentes).
  useLayoutEffect(() => {
    if (direction !== 'y' || !btnRef.current) return;
    const { offsetWidth, offsetHeight } = btnRef.current;
    setNaturalSize((prev) => (
      prev && prev.w === offsetWidth && prev.h === offsetHeight ? prev : { w: offsetWidth, h: offsetHeight }
    ));
  }, [direction, label]);

  const yStyle = direction === 'y' && naturalSize
    ? { left: edgeX - naturalSize.h / 2 - naturalSize.w / 2, top: centerY - naturalSize.h / 2 }
    : style;

  return (
    <button
      ref={btnRef}
      type="button"
      className={`chart-minimap-toggle${open ? '' : ' chart-minimap-toggle--closed'}`}
      onClick={onToggle}
      style={yStyle}
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
