'use client';

/**
 * Toolbar restreinte
 *
 * `toolbar` accepte une liste de clés : on choisit à l'instanciation quelles options la
 * barre expose. Ici seulement globe/planisphère, rotation et réinitialisation du zoom —
 * combiné à `defaultMode="plane"`, le globe démarre en planisphère avec une barre
 * réduite à trois interrupteurs.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor } from '@/features/globe/sources/demoData';

const GlobeToolbarRestricted = () => (
  <Globe
    points={GLOBE_POINTS}
    arcs={GLOBE_ARCS}
    iconFor={demoPointIcon}
    colorFor={pointColor}
    defaultMode="plane"
    toolbar={['mode', 'rotate', 'resetZoom']}
    height={420}
  />
);

export default GlobeToolbarRestricted;
