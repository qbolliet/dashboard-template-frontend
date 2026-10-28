'use client';

/**
 * Flux non orientés
 *
 * `arcVariant="line"` garde le trait plein des flèches (épaisseur selon `value`,
 * couleur et style par `arcHue`) mais sans pointe : le flux relie deux points sans
 * sens de lecture, comme une liaison ou un échange. Le trait va jusqu'au centre de
 * chaque pastille. Le globe démarre agrandi (`defaults.expanded`) : la légende est
 * au-dessus, et le bouton « Replier » de la toolbar la renvoie à droite.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor } from '@/features/globe/sources/demoData';

const GlobeUndirectedFlows = () => (
  <Globe
    points={GLOBE_POINTS}
    arcs={GLOBE_ARCS}
    iconFor={demoPointIcon}
    colorFor={pointColor}
    arcVariant="line"
    arcHue="mode"
    labels={{ color: 'Acheminement' }}
    defaults={{ mode: 'plane', expanded: true }}
    height={420}
  />
);

export default GlobeUndirectedFlows;
