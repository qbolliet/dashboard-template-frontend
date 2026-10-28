'use client';

/**
 * Flux décoratifs
 *
 * `arcVariant="glow"` dessine des flux fins et lumineux, en fusion additive : leur
 * luminosité croît de l'origine vers la destination, et `value` règle leur éclat
 * plutôt que leur épaisseur. Animés dès le montage (`defaults.arcsDynamic`), une
 * comète parcourt chaque flux. Pour une page d'accueil ou une illustration, quand
 * la lecture précise des flux importe moins que l'ambiance.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor } from '@/features/globe/sources/demoData';

const GlobeGlowFlows = () => (
  <Globe
    points={GLOBE_POINTS}
    arcs={GLOBE_ARCS}
    iconFor={demoPointIcon}
    colorFor={pointColor}
    arcVariant="glow"
    defaults={{ arcsDynamic: true }}
    height={420}
  />
);

export default GlobeGlowFlows;
