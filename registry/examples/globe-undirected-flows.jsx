'use client';

/**
 * Flux non orientés
 *
 * `arcs.mark="line"` garde le trait plein des flèches (épaisseur selon `arcs.z`,
 * couleur et style par `arcs.hue`) mais sans pointe : le flux relie deux points sans
 * sens de lecture, comme une liaison ou un échange. Le trait va jusqu'au centre de
 * chaque pastille, et la tooltip joint les deux extrémités d'un tiret plutôt que
 * d'une flèche. Le globe démarre agrandi (`defaults.expanded`) : la légende est
 * au-dessus, et le bouton « Replier » de la toolbar la renvoie à droite.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, GLOBE_ARC_LABELS, demoPointIcon } from '@/features/globe/sources/demoData';

const GlobeUndirectedFlows = () => (
  <Globe
    points={{ data: GLOBE_POINTS, icon: demoPointIcon }}
    arcs={{ data: GLOBE_ARCS, mark: 'line', hue: 'mode', z: 'volume', labels: GLOBE_ARC_LABELS }}
    defaults={{ mode: 'plane', expanded: true }}
    height={420}
  />
);

export default GlobeUndirectedFlows;
