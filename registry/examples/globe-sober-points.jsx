'use client';

/**
 * Points sobres, taille par valeur
 *
 * `pointVariant="dot"` remplace les pastilles par de simples disques, sans anneau
 * ni icône, et `pointPulse={false}` retire le halo animé : les points voisins
 * d'Europe restent lisibles. `pointSize="value"` rend l'aire de chaque point
 * proportionnelle à sa valeur, comme les bulles du chart ; la légende de taille,
 * titrée par `labels.size`, rejoint celle des flux.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, GLOBE_LABELS, pointColor } from '@/features/globe/sources/demoData';

const GlobeSoberPoints = () => (
  <Globe
    points={GLOBE_POINTS}
    arcs={GLOBE_ARCS}
    colorFor={pointColor}
    pointVariant="dot"
    pointPulse={false}
    pointSize="value"
    arcHue="mode"
    labels={GLOBE_LABELS}
    defaults={{ mode: 'plane' }}
    height={420}
  />
);

export default GlobeSoberPoints;
