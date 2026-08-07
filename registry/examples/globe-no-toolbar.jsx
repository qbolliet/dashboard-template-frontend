'use client';

/**
 * Toolbar absente
 *
 * `toolbar={[]}` supprime à la fois la barre et sa zone de survol haut-droite : le
 * globe reste manipulable à la souris (glisser pour tourner, molette pour zoomer),
 * mais aucun interrupteur ne le pilote.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor } from '@/features/globe/sources/demoData';

const GlobeNoToolbar = () => (
  <Globe
    points={GLOBE_POINTS}
    arcs={GLOBE_ARCS}
    iconFor={demoPointIcon}
    colorFor={pointColor}
    toolbar={[]}
    height={320}
  />
);

export default GlobeNoToolbar;
