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
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon } from '@/features/globe/sources/demoData';

const GlobeNoToolbar = () => (
  <Globe
    points={{ data: GLOBE_POINTS, icon: demoPointIcon }}
    arcs={GLOBE_ARCS}
    toolbar={[]}
    height={320}
  />
);

export default GlobeNoToolbar;
